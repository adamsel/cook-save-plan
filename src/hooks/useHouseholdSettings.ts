import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useHousehold, type HouseholdSettings as DbHouseholdSettings } from '@/hooks/useHousehold';

export interface HouseholdSettings {
  householdSize: number;
  defaultDinnerServings: number;
  suggestLeftoversForLunch: boolean;
}

const DEFAULT_SETTINGS: HouseholdSettings = {
  householdSize: 2,
  defaultDinnerServings: 2,
  suggestLeftoversForLunch: true,
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
  const settings = useMemo((): HouseholdSettings => {
    if (hasHousehold && dbSettings) {
      return {
        householdSize: dbSettings.household_size,
        defaultDinnerServings: dbSettings.default_dinner_servings,
        suggestLeftoversForLunch: dbSettings.suggest_leftovers_for_lunch,
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

    if (hasHousehold && dbSettings) {
      // Update database settings
      const dbUpdates: Partial<DbHouseholdSettings> = {};
      if (updates.householdSize !== undefined || newSettings.defaultDinnerServings !== settings.defaultDinnerServings) {
        dbUpdates.household_size = newSettings.householdSize;
        dbUpdates.default_dinner_servings = newSettings.defaultDinnerServings;
      }
      if (updates.suggestLeftoversForLunch !== undefined) {
        dbUpdates.suggest_leftovers_for_lunch = updates.suggestLeftoversForLunch;
      }
      await updateDbSettings(dbUpdates);
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
