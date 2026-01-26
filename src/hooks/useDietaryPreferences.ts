import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { DietaryRestriction, Allergen } from '@/lib/dietaryFlags';

interface DietaryPreferences {
  dietaryRestrictions: DietaryRestriction[];
  allergens: Allergen[];
}

const DEFAULT_PREFERENCES: DietaryPreferences = {
  dietaryRestrictions: [],
  allergens: [],
};

export function useDietaryPreferences() {
  const { user } = useAuth();
  const { hasHousehold, settings: householdSettings, updateSettings: updateHouseholdSettings, isAdmin } = useHousehold();

  const [localPrefs, setLocalPrefs] = useLocalStorage<DietaryPreferences>(
    'dietaryPreferences',
    DEFAULT_PREFERENCES
  );

  const [userPrefs, setUserPrefs] = useState<DietaryPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user-level preferences from database
  const fetchUserPreferences = useCallback(async () => {
    if (!user || hasHousehold) {
      setUserPrefs(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_dietary_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching dietary preferences:', error);
      setIsLoading(false);
      return;
    }

    if (data) {
      setUserPrefs({
        dietaryRestrictions: (data.dietary_restrictions || []) as DietaryRestriction[],
        allergens: (data.allergens || []) as Allergen[],
      });
    }

    setIsLoading(false);
  }, [user, hasHousehold]);

  useEffect(() => {
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  // Get current preferences (from household, user db, or local)
  const preferences: DietaryPreferences = (() => {
    if (hasHousehold && householdSettings) {
      return {
        dietaryRestrictions: (householdSettings.dietary_restrictions || []) as DietaryRestriction[],
        allergens: (householdSettings.allergens || []) as Allergen[],
      };
    }

    if (user && userPrefs) {
      return userPrefs;
    }

    return localPrefs;
  })();

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<DietaryPreferences>) => {
    const newPrefs = { ...preferences, ...updates };

    if (hasHousehold && householdSettings) {
      // Update household settings
      await updateHouseholdSettings({
        dietary_restrictions: newPrefs.dietaryRestrictions,
        allergens: newPrefs.allergens,
      });
    } else if (user) {
      // Upsert user-level preferences
      const { error } = await supabase
        .from('user_dietary_preferences')
        .upsert({
          user_id: user.id,
          dietary_restrictions: newPrefs.dietaryRestrictions,
          allergens: newPrefs.allergens,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error updating dietary preferences:', error);
        return;
      }

      setUserPrefs(newPrefs);
    } else {
      // Update localStorage for unauthenticated users
      setLocalPrefs(newPrefs);
    }
  }, [preferences, hasHousehold, householdSettings, updateHouseholdSettings, user, setLocalPrefs]);

  // Toggle a dietary restriction
  const toggleRestriction = useCallback(async (restriction: DietaryRestriction) => {
    const current = preferences.dietaryRestrictions;
    const updated = current.includes(restriction)
      ? current.filter(r => r !== restriction)
      : [...current, restriction];

    await updatePreferences({ dietaryRestrictions: updated });
  }, [preferences.dietaryRestrictions, updatePreferences]);

  // Toggle an allergen
  const toggleAllergen = useCallback(async (allergen: Allergen) => {
    const current = preferences.allergens;
    const updated = current.includes(allergen)
      ? current.filter(a => a !== allergen)
      : [...current, allergen];

    await updatePreferences({ allergens: updated });
  }, [preferences.allergens, updatePreferences]);

  return {
    ...preferences,
    isLoading,
    updatePreferences,
    toggleRestriction,
    toggleAllergen,
    hasHousehold,
    canEdit: !hasHousehold || isAdmin,
  };
}
