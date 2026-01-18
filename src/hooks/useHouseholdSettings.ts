import { useLocalStorage } from '@/hooks/useLocalStorage';

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
  const [settings, setSettings] = useLocalStorage<HouseholdSettings>(
    'householdSettings',
    DEFAULT_SETTINGS
  );

  const updateSettings = (updates: Partial<HouseholdSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      // Keep default dinner servings in sync with household size by default
      if (updates.householdSize !== undefined && !updates.defaultDinnerServings) {
        updated.defaultDinnerServings = updates.householdSize;
      }
      return updated;
    });
  };

  return {
    ...settings,
    updateSettings,
  };
}
