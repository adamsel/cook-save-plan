import { useState } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { useHouseholdSettings } from '@/hooks/useHouseholdSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Tags, 
  Package, 
  Plus, 
  X,
  Save,
  Users,
  Minus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { categories, tags, pantryStaples, addCategory, addTag, updatePantryStaples } = useRecipes();
  const { householdSize, suggestLeftoversForLunch, updateSettings } = useHouseholdSettings();
  const { toast } = useToast();

  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newStaple, setNewStaple] = useState('');
  const [localStaples, setLocalStaples] = useState<string[]>(pantryStaples);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      addCategory(newCategory.trim());
      setNewCategory('');
      toast({ title: "Category added" });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      addTag(newTag.trim());
      setNewTag('');
      toast({ title: "Tag added" });
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
    toast({ title: "Pantry staples updated" });
  };

  return (
    <div className="container py-6 animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Customize your Recipe Stash experience
        </p>
      </div>

      <div className="space-y-8">
        {/* Household Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">Household</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Set your household size to get smart serving suggestions when meal planning.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div>
                <Label className="font-medium">Household size</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Dinner servings will default to this number
                </p>
              </div>
              <div className="flex items-center gap-2 bg-background rounded-lg p-1 border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSettings({ householdSize: Math.max(1, householdSize - 1) })}
                  disabled={householdSize <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold text-lg">{householdSize}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSettings({ householdSize: Math.min(10, householdSize + 1) })}
                  disabled={householdSize >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div>
                <Label className="font-medium">Suggest leftovers for lunch</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When adding dinner, suggest making extra for tomorrow's lunch
                </p>
              </div>
              <Switch
                checked={suggestLeftoversForLunch}
                onCheckedChange={(checked) => updateSettings({ suggestLeftoversForLunch: checked })}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Categories */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">Categories</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Categories help organize your recipes into meal types.
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge key={category} variant="secondary">
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
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">Tags</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Tags provide additional ways to filter and find recipes.
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Badge key={tag} variant="outline">
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
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">Pantry Staples</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            These items can be excluded from your shopping list. Common items you always have on hand.
          </p>
          <div className="flex flex-wrap gap-2">
            {localStaples.map(staple => (
              <Badge key={staple} variant="secondary" className="gap-1 pr-1">
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
          <Button onClick={handleSaveStaples} className="gap-2">
            <Save className="h-4 w-4" />
            Save Pantry Staples
          </Button>
        </section>

        <Separator />

        {/* About */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">About Recipe Stash</h2>
          </div>
          <div className="rounded-xl bg-muted/50 p-4 space-y-2">
            <p className="text-sm">
              <strong>Recipe Stash</strong> helps you save recipes, plan meals, and generate shopping lists effortlessly.
            </p>
            <p className="text-sm text-muted-foreground">
              Version 1.0.0 • Built with love for home cooks
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
