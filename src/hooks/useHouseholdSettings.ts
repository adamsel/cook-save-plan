import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useHousehold, type HouseholdSettings as DbHouseholdSettings } from '@/hooks/useHousehold';

export type NutritionGoal = 'weight_loss' | 'muscle_gain' | 'balanced' | 'none';

export interface NutritionGoals {
  primaryGoal: NutritionGoal;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

export interface HouseholdSettings {
  householdSize: number;
  defaultDinnerServings: number;
  suggestLeftoversForLunch: boolean;
  nutritionGoals?: NutritionGoals;
}

const DEFAULT_SETTINGS: HouseholdSettings = {
  householdSize: 2,
  defaultDinnerServings: 2,
  suggestLeftoversForLunch: true,
  nutritionGoals: {
    primaryGoal: 'none',
  },
};

export function useHouseholdSettings() {
  const {
    hasHousehold,
    settings: dbSettings,
    updateSettings: updateDbSettings,
    isAdmin,
    isLoading: householdLoading,
  } = useHousehold();

  const [localSettings, setLocalSettings] = useLocalStorage<HouseholdSettings>(
    'householdSettings',
    DEFAULT_SETTINGS
  );

  // Merge database settings with local settings structure
  // Note: nutritionGoals are always stored locally (not in database yet)
  const settings = useMemo((): HouseholdSettings => {
    if (hasHousehold && dbSettings) {
      return {
        householdSize: dbSettings.household_size,
        defaultDinnerServings: dbSettings.default_dinner_servings,
        suggestLeftoversForLunch: dbSettings.suggest_leftovers_for_lunch,
        nutritionGoals: localSettings.nutritionGoals, // Always from local storage
      };
    }
    return localSettings;
  }, [hasHousehold, dbSettings, localSettings]);

  const updateSettings = useCallback(async (updates: Partial<HouseholdSettings>) => {
    // Calculate new values with the auto-sync logic
    const newSettings = { ...settings, ...updates };

    // Keep default dinner servings in sync with household size by default
    if (updates.householdSize !== undefined && !updates.defaultDinnerServings) {
      newSettings.defaultDinnerServings = updates.householdSize;
    }

    // Always update local settings for nutritionGoals (not in DB yet)
    if (updates.nutritionGoals !== undefined) {
      setLocalSettings(prev => ({ ...prev, nutritionGoals: updates.nutritionGoals }));
    }

    if (hasHousehold && dbSettings) {
      // Update database settings (except nutritionGoals which stays local)
      const dbUpdates: Partial<DbHouseholdSettings> = {};
      if (updates.householdSize !== undefined || newSettings.defaultDinnerServings !== settings.defaultDinnerServings) {
        dbUpdates.household_size = newSettings.householdSize;
        dbUpdates.default_dinner_servings = newSettings.defaultDinnerServings;
      }
      if (updates.suggestLeftoversForLunch !== undefined) {
        dbUpdates.suggest_leftovers_for_lunch = updates.suggestLeftoversForLunch;
      }
      if (Object.keys(dbUpdates).length > 0) {
        await updateDbSettings(dbUpdates);
      }
    } else {
      // Update local storage
      setLocalSettings(newSettings);
    }
  }, [hasHousehold, dbSettings, settings, updateDbSettings, setLocalSettings]);

  return {
    ...settings,
    updateSettings,
    // Additional flags for UI
    hasHousehold,
    isAdmin,
    isLoading: householdLoading,
    canEditSettings: !hasHousehold || isAdmin,
  };
}
