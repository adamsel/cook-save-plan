import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRecipes } from '@/context/RecipeContext';
import { useHouseholdSettings, type NutritionGoal } from '@/hooks/useHouseholdSettings';
import { useDietaryPreferences } from '@/hooks/useDietaryPreferences';
import { HouseholdManagement } from '@/components/settings/HouseholdManagement';
import { CreatorSettings } from '@/components/settings/CreatorSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Settings,
  Tags,
  Package,
  Plus,
  X,
  Save,
  Users,
  Heart,
  Minus,
  AlertTriangle,
  Target,
  ChevronDown,
  ChefHat,
  Crown,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  getAllDietaryRestrictions,
  getAllAllergens,
  type DietaryRestriction,
  type Allergen,
} from '@/lib/dietaryFlags';

export default function SettingsPage() {
  const { categories, tags, pantryStaples, addCategory, addTag, updatePantryStaples } = useRecipes();
  const { householdSize, suggestLeftoversForLunch, nutritionGoals, updateSettings, hasHousehold, canEditSettings } = useHouseholdSettings();
  const {
    dietaryRestrictions,
    allergens,
    toggleRestriction,
    toggleAllergen,
    canEdit: canEditDietary,
    hasHousehold: hasDietaryHousehold,
  } = useDietaryPreferences();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isPremium, checkout, manageSubscription } = useSubscription();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const creatorSectionRef = useRef<HTMLElement>(null);
  const isCreatorSetup = searchParams.get('setup') === 'creator';

  const allRestrictions = getAllDietaryRestrictions();
  const allAllergens = getAllAllergens();

  // Auto-scroll to creator section when arriving from creator signup
  useEffect(() => {
    if (isCreatorSetup && creatorSectionRef.current) {
      creatorSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isCreatorSetup]);

  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newStaple, setNewStaple] = useState('');
  const [localStaples, setLocalStaples] = useState<string[]>(pantryStaples);
  const [nutritionOpen, setNutritionOpen] = useState(false);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      addCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      addTag(newTag.trim());
      setNewTag('');
    }
  };

  const handleAddStaple = () => {
    if (newStaple.trim() && !localStaples.includes(newStaple.trim().toLowerCase())) {
      setLocalStaples([...localStaples, newStaple.trim().toLowerCase()]);
      setNewStaple('');
    }
  };

  const handleRemoveStaple = (staple: string) => {
    setLocalStaples(localStaples.filter(s => s !== staple));
  };

  const handleSaveStaples = () => {
    updatePantryStaples(localStaples);
  };

  return (
    <div className="container py-6 animate-fade-in max-w-2xl">
      {/* Header - compact on mobile */}
      <div className="mb-6 md:mb-8">
        <h1 className="font-serif text-xl md:text-3xl font-bold mb-1 md:mb-2">Settings</h1>
        {!isMobile && (
          <p className="text-muted-foreground">
            Customize your Recipe Stash experience
          </p>
        )}
      </div>

      <div className="space-y-6 md:space-y-8">
        {/* Creator Profile */}
        <section ref={creatorSectionRef} className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Creator profile</h2>
          </div>
          {isCreatorSetup && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
              Set up your creator profile below to start sharing meal plans with your audience.
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Share your meal plans publicly so others can clone them and generate shopping lists.
          </p>
          <CreatorSettings />
        </section>

        <Separator />

        {/* Subscription */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Subscription</h2>
          </div>
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {isPremium ? 'Premium' : 'Free'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPremium
                    ? 'Unlimited recipes, AI features, and meal plan analysis.'
                    : 'Up to 25 recipes. Upgrade for AI features and unlimited storage.'}
                </p>
                {isPremium && profile?.subscription_expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Renews {new Date(profile.subscription_expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge variant={isPremium ? 'default' : 'secondary'} className="shrink-0">
                {isPremium ? 'Premium' : 'Free'}
              </Badge>
            </div>
            {isPremium ? (
              <Button variant="outline" size="sm" onClick={manageSubscription}>
                Manage subscription
              </Button>
            ) : (
              <Button size="sm" onClick={checkout} className="gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Premium — $4.99/mo
              </Button>
            )}
          </div>
        </section>

        <Separator />

        {/* Household Management */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Share the load</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Invite your partner or a family member to plan meals together. You'll share one meal plan and one shopping list.
          </p>
          <HouseholdManagement />
        </section>

        <Separator />

        {/* Household Settings */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Meal Planning</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasHousehold
              ? 'These settings apply to all household members.'
              : 'Set your household size to get smart serving suggestions when meal planning.'}
          </p>
          {hasHousehold && !canEditSettings && (
            <p className="text-xs text-amber-600">
              Only household admins and owners can change these settings.
            </p>
          )}

          <div className="space-y-3 md:space-y-4">
            <div className={cn(
              "rounded-xl bg-muted/30 border border-border/50",
              isMobile ? "p-3 space-y-3" : "p-4 flex items-center justify-between"
            )}>
              <div>
                <Label className="font-medium">Default servings</Label>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  How many people usually eat dinner?
                </p>
              </div>
              <div className="flex items-center gap-2 bg-background rounded-lg p-1 border w-fit">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSettings({ householdSize: Math.max(1, householdSize - 1) })}
                  disabled={householdSize <= 1 || !canEditSettings}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold text-lg">{householdSize}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSettings({ householdSize: Math.min(10, householdSize + 1) })}
                  disabled={householdSize >= 10 || !canEditSettings}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className={cn(
              "rounded-xl bg-muted/30 border border-border/50",
              isMobile ? "p-3 space-y-3" : "p-4 flex items-center justify-between"
            )}>
              <div className={cn(isMobile && "flex-1")}>
                <Label className="font-medium">Suggest leftovers for lunch</Label>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  When adding dinner, suggest making extra for tomorrow's lunch
                </p>
              </div>
              <Switch
                checked={suggestLeftoversForLunch}
                onCheckedChange={(checked) => updateSettings({ suggestLeftoversForLunch: checked })}
                disabled={!canEditSettings}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Dietary Preferences */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Dietary Preferences</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Set dietary restrictions and allergens to see warnings in your shopping list.
            {hasDietaryHousehold && ' These settings apply to all household members.'}
          </p>
          {hasDietaryHousehold && !canEditDietary && (
            <p className="text-xs text-amber-600">
              Only household admins and owners can change these settings.
            </p>
          )}

          <div className="space-y-3 md:space-y-4">
            {/* Dietary Restrictions */}
            <div className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50">
              <Label className="font-medium mb-2 md:mb-3 block">Dietary Restrictions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                {allRestrictions.map(({ value, label }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`restriction-${value}`}
                      checked={dietaryRestrictions.includes(value)}
                      onCheckedChange={() => toggleRestriction(value)}
                      disabled={!canEditDietary}
                    />
                    <label
                      htmlFor={`restriction-${value}`}
                      className="text-xs md:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergens */}
            <div className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50">
              <Label className="font-medium mb-2 md:mb-3 block">Allergens to Avoid</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                {allAllergens.map(({ value, label }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${value}`}
                      checked={allergens.includes(value)}
                      onCheckedChange={() => toggleAllergen(value)}
                      disabled={!canEditDietary}
                    />
                    <label
                      htmlFor={`allergen-${value}`}
                      className="text-xs md:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Categories */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Categories</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Categories help organize your recipes into meal types.
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {categories.map(category => (
              <Badge key={category} variant="secondary" className={cn(isMobile && "text-xs")}>
                {category}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <Separator />

        {/* Tags */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Tags</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Tags provide additional ways to filter and find recipes.
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {tags.map(tag => (
              <Badge key={tag} variant="outline" className={cn(isMobile && "text-xs")}>
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <Button onClick={handleAddTag} disabled={!newTag.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <Separator />

        {/* Pantry Staples */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">Pantry Staples</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Items you always have at home — these will be hidden from your shopping list automatically.
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {localStaples.map(staple => (
              <Badge key={staple} variant="secondary" className={cn("gap-1 pr-1", isMobile && "text-xs")}>
                {staple}
                <button
                  onClick={() => handleRemoveStaple(staple)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New staple item..."
              value={newStaple}
              onChange={(e) => setNewStaple(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStaple()}
            />
            <Button variant="outline" onClick={handleAddStaple} disabled={!newStaple.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleSaveStaples} className="gap-2" size={isMobile ? "sm" : "default"}>
            <Save className="h-4 w-4" />
            Save Pantry Staples
          </Button>
        </section>

        <Separator />

        {/* About */}
        <section className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h2 className="font-serif text-lg md:text-xl font-semibold">About Recipe Stash</h2>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 md:p-4 space-y-2">
            <p className="text-sm">
              <strong>Recipe Stash</strong> helps you save recipes, plan meals, and generate shopping lists effortlessly.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Version 1.0.0 • Built with love for home cooks
            </p>
          </div>
        </section>

        <Separator />

        {/* Nutrition Goals - Collapsed by default */}
        <Collapsible open={nutritionOpen} onOpenChange={setNutritionOpen}>
          <section className="space-y-3 md:space-y-4">
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              <Target className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <h2 className="font-serif text-lg md:text-xl font-semibold text-muted-foreground">Advanced: Nutrition tracking</h2>
              <ChevronDown className={cn(
                "h-4 w-4 ml-auto text-muted-foreground transition-transform",
                nutritionOpen && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <p className="text-sm text-muted-foreground">
              Set daily calorie and macro goals to see how your meal plan stacks up each week. Most people skip this at first.
            </p>

            <CollapsibleContent className="space-y-3 md:space-y-4">
              {/* Primary Goal */}
              <div className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50">
                <Label className="font-medium mb-2 md:mb-3 block">What's your primary goal?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'none', label: 'No specific goal', desc: 'General balanced eating' },
                    { value: 'weight_loss', label: 'Weight loss', desc: 'Calorie-conscious meals' },
                    { value: 'muscle_gain', label: 'Muscle gain', desc: 'High protein focus' },
                    { value: 'balanced', label: 'Balanced macros', desc: 'Even macro distribution' },
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => updateSettings({
                        nutritionGoals: { ...nutritionGoals, primaryGoal: value as NutritionGoal }
                      })}
                      className={cn(
                        "rounded-lg border text-left transition-colors",
                        isMobile ? "p-2" : "p-3",
                        nutritionGoals?.primaryGoal === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted/50 border-border/50'
                      )}
                    >
                      <span className={cn("font-medium block", isMobile ? "text-xs" : "text-sm")}>{label}</span>
                      <span className={cn(
                        isMobile ? "text-[10px]" : "text-xs",
                        nutritionGoals?.primaryGoal === value ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Values - only show when a goal is selected */}
              {nutritionGoals?.primaryGoal && nutritionGoals.primaryGoal !== 'none' && (
                <div className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50">
                  <Label className="font-medium mb-2 md:mb-3 block">Daily targets (optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2 md:mb-3">
                    Leave blank to let AI suggest targets based on your goal.
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Calories</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 2000"
                        value={nutritionGoals?.targetCalories || ''}
                        onChange={(e) => updateSettings({
                          nutritionGoals: {
                            ...nutritionGoals,
                            targetCalories: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 100"
                        value={nutritionGoals?.targetProtein || ''}
                        onChange={(e) => updateSettings({
                          nutritionGoals: {
                            ...nutritionGoals,
                            targetProtein: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 250"
                        value={nutritionGoals?.targetCarbs || ''}
                        onChange={(e) => updateSettings({
                          nutritionGoals: {
                            ...nutritionGoals,
                            targetCarbs: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Fat (g)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 65"
                        value={nutritionGoals?.targetFat || ''}
                        onChange={(e) => updateSettings({
                          nutritionGoals: {
                            ...nutritionGoals,
                            targetFat: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </section>
        </Collapsible>

      </div>
    </div>
  );
}
