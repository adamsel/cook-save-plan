import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SortOption } from './RecipeFilters';
import { Check, Heart, Clock, SortAsc, FolderOpen, Tag, AlertCircle } from 'lucide-react';

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Sort
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  // Categories
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  categories: string[];
  // Time
  timeFilter: 'all' | 'quick' | 'medium' | 'long';
  onTimeFilterChange: (filter: 'all' | 'quick' | 'medium' | 'long') => void;
  // Tags
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: string[];
  // Favorites
  showFavoritesOnly: boolean;
  onFavoritesChange: (show: boolean) => void;
  // Missing category
  showMissingCategory: boolean;
  onMissingCategoryChange: (show: boolean) => void;
  missingCategoryCount: number;
  // Hide personal filters (for library/discover views)
  hidePersonalFilters?: boolean;
}

const sortLabels: Record<SortOption, string> = {
  'recent': 'Recently Added',
  'oldest': 'Oldest First',
  'favorites': 'Favorites First',
  'prep-time': 'Prep Time',
  'title': 'Title A-Z',
};

const timeLabels: Record<string, string> = {
  'all': 'Any time',
  'quick': 'Under 30 min',
  'medium': '30-60 min',
  'long': 'Over 60 min',
};

export function MobileFilterSheet({
  open,
  onOpenChange,
  sortBy,
  onSortChange,
  selectedCategories,
  onCategoriesChange,
  categories,
  timeFilter,
  onTimeFilterChange,
  selectedTags,
  onTagsChange,
  tags,
  showFavoritesOnly,
  onFavoritesChange,
  showMissingCategory,
  onMissingCategoryChange,
  missingCategoryCount,
  hidePersonalFilters = false,
}: MobileFilterSheetProps) {
  // Local state for draft changes (applied on "Apply")
  const [draftSort, setDraftSort] = useState(sortBy);
  const [draftCategories, setDraftCategories] = useState(selectedCategories);
  const [draftTime, setDraftTime] = useState(timeFilter);
  const [draftTags, setDraftTags] = useState(selectedTags);
  const [draftFavorites, setDraftFavorites] = useState(showFavoritesOnly);
  const [draftMissingCategory, setDraftMissingCategory] = useState(showMissingCategory);

  // Sync draft state when sheet opens
  useEffect(() => {
    if (open) {
      setDraftSort(sortBy);
      setDraftCategories(selectedCategories);
      setDraftTime(timeFilter);
      setDraftTags(selectedTags);
      setDraftFavorites(showFavoritesOnly);
      setDraftMissingCategory(showMissingCategory);
    }
  }, [open, sortBy, selectedCategories, timeFilter, selectedTags, showFavoritesOnly, showMissingCategory]);

  const toggleCategory = (category: string) => {
    setDraftCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTag = (tag: string) => {
    setDraftTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleApply = () => {
    onSortChange(draftSort);
    onCategoriesChange(draftCategories);
    onTimeFilterChange(draftTime);
    onTagsChange(draftTags);
    onFavoritesChange(draftFavorites);
    onMissingCategoryChange(draftMissingCategory);
    onOpenChange(false);
  };

  const handleReset = () => {
    setDraftSort('recent');
    setDraftCategories([]);
    setDraftTime('all');
    setDraftTags([]);
    setDraftFavorites(false);
    setDraftMissingCategory(false);
  };

  const hasChanges =
    draftSort !== 'recent' ||
    draftCategories.length > 0 ||
    draftTime !== 'all' ||
    draftTags.length > 0 ||
    draftFavorites ||
    draftMissingCategory;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Filters</SheetTitle>
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Sort */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Sort by</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(sortLabels).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setDraftSort(value as SortOption)}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                      "border",
                      draftSort === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Time filter */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Cooking time</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(timeLabels).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setDraftTime(value as 'all' | 'quick' | 'medium' | 'long')}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                      "border",
                      draftTime === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Categories */}
            {categories.length > 0 && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Categories</Label>
                    {draftCategories.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {draftCategories.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-colors",
                          "border",
                          draftCategories.includes(category)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        )}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Tags</Label>
                    {draftTags.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {draftTags.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-colors",
                          "border",
                          draftTags.includes(tag)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Personal filters */}
            {!hidePersonalFilters && (
              <div className="space-y-4">
                {/* Favorites toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="favorites-toggle" className="text-sm font-medium">
                      Favorites only
                    </Label>
                  </div>
                  <Switch
                    id="favorites-toggle"
                    checked={draftFavorites}
                    onCheckedChange={setDraftFavorites}
                  />
                </div>

                {/* Uncategorized toggle */}
                {missingCategoryCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="uncategorized-toggle" className="text-sm font-medium">
                        Uncategorized
                      </Label>
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        {missingCategoryCount}
                      </Badge>
                    </div>
                    <Switch
                      id="uncategorized-toggle"
                      checked={draftMissingCategory}
                      onCheckedChange={setDraftMissingCategory}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="pt-4 border-t mt-auto">
          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
