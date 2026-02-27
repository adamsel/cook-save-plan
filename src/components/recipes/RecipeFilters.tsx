import { useState } from 'react';
import { Search, Filter, X, Heart, Clock, ChevronDown, SortAsc, AlertCircle, SlidersHorizontal, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileFilterSheet } from './MobileFilterSheet';

export type SortOption = 'recent' | 'oldest' | 'favorites' | 'prep-time' | 'title';

interface RecipeFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  showFavoritesOnly: boolean;
  onFavoritesChange: (show: boolean) => void;
  showArchived: boolean;
  onArchivedChange: (show: boolean) => void;
  timeFilter: 'all' | 'quick' | 'medium' | 'long';
  onTimeFilterChange: (filter: 'all' | 'quick' | 'medium' | 'long') => void;
  categories: string[];
  tags: string[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showMissingCategory: boolean;
  onMissingCategoryChange: (show: boolean) => void;
  missingCategoryCount?: number;
  hidePersonalFilters?: boolean;
}

export function RecipeFilters({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedTags,
  onTagsChange,
  showFavoritesOnly,
  onFavoritesChange,
  showArchived,
  onArchivedChange,
  timeFilter,
  onTimeFilterChange,
  categories,
  tags,
  sortBy,
  onSortChange,
  showMissingCategory,
  onMissingCategoryChange,
  missingCategoryCount = 0,
  hidePersonalFilters = false,
}: RecipeFiltersProps) {
  const isMobile = useIsMobile();
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const toggleCategory = (category: string) => {
    onCategoriesChange(
      selectedCategories.includes(category)
        ? selectedCategories.filter(c => c !== category)
        : [...selectedCategories, category]
    );
  };

  const toggleTag = (tag: string) => {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    );
  };

  const clearFilters = () => {
    onSearchChange('');
    onCategoriesChange([]);
    onTagsChange([]);
    onFavoritesChange(false);
    onTimeFilterChange('all');
    onMissingCategoryChange(false);
  };

  const hasActiveFilters = 
    searchQuery || 
    selectedCategories.length > 0 || 
    selectedTags.length > 0 || 
    showFavoritesOnly || 
    timeFilter !== 'all' ||
    showMissingCategory;

  const sortLabels: Record<SortOption, string> = {
    'recent': 'Recently Added',
    'oldest': 'Oldest First',
    'favorites': 'Favorites First',
    'prep-time': 'Prep Time',
    'title': 'Title A-Z',
  };

  // Count active filters for badge
  const activeFilterCount =
    (sortBy !== 'recent' ? 1 : 0) +
    selectedCategories.length +
    selectedTags.length +
    (timeFilter !== 'all' ? 1 : 0) +
    (showFavoritesOnly ? 1 : 0) +
    (showMissingCategory ? 1 : 0);

  // Mobile view: search + filter button
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Search + Filter button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
            onClick={() => setShowFilterSheet(true)}
            className="gap-2 shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Active filter badges (removable) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(cat => (
              <Badge
                key={cat}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer"
                onClick={() => toggleCategory(cat)}
              >
                {cat}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {timeFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer"
                onClick={() => onTimeFilterChange('all')}
              >
                {timeFilter === 'quick' ? '< 30min' : timeFilter === 'medium' ? '30-60min' : '> 60min'}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {showFavoritesOnly && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer"
                onClick={() => onFavoritesChange(false)}
              >
                Favorites
                <X className="h-3 w-3" />
              </Badge>
            )}
            {(selectedCategories.length > 0 || selectedTags.length > 0 || timeFilter !== 'all' || showFavoritesOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-xs text-muted-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        )}

        {/* Mobile Filter Sheet */}
        <MobileFilterSheet
          open={showFilterSheet}
          onOpenChange={setShowFilterSheet}
          sortBy={sortBy}
          onSortChange={onSortChange}
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          categories={categories}
          timeFilter={timeFilter}
          onTimeFilterChange={onTimeFilterChange}
          selectedTags={selectedTags}
          onTagsChange={onTagsChange}
          tags={tags}
          showFavoritesOnly={showFavoritesOnly}
          onFavoritesChange={onFavoritesChange}
          showMissingCategory={showMissingCategory}
          onMissingCategoryChange={onMissingCategoryChange}
          missingCategoryCount={missingCategoryCount}
          hidePersonalFilters={hidePersonalFilters}
        />
      </div>
    );
  }

  // Desktop view: full filter UI
  return (
    <div className="space-y-4">
      {/* Search and main filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes, ingredients, tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SortAsc className="h-4 w-4" />
                <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
                {Object.entries(sortLabels).map(([value, label]) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Categories dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Dish Type
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {selectedCategories.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Dish Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[...categories].sort((a, b) => a.localeCompare(b)).map(category => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Time filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={timeFilter !== 'all' ? 'secondary' : 'outline'}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Time</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={timeFilter === 'all'}
                onCheckedChange={() => onTimeFilterChange('all')}
              >
                All times
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={timeFilter === 'quick'}
                onCheckedChange={() => onTimeFilterChange('quick')}
              >
                Quick (under 30 min)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={timeFilter === 'medium'}
                onCheckedChange={() => onTimeFilterChange('medium')}
              >
                Medium (30-60 min)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={timeFilter === 'long'}
                onCheckedChange={() => onTimeFilterChange('long')}
              >
                Long (over 60 min)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tags dropdown */}
          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Tags</span>
                  {selectedTags.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {selectedTags.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                <DropdownMenuLabel>Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[...tags].sort((a, b) => a.localeCompare(b)).map(tag => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Favorites toggle - only show for personal recipes */}
          {!hidePersonalFilters && (
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="icon"
              onClick={() => onFavoritesChange(!showFavoritesOnly)}
            >
              <Heart className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
            </Button>
          )}

          {/* Missing category filter - only show for personal recipes */}
          {!hidePersonalFilters && missingCategoryCount > 0 && (
            <Button
              variant={showMissingCategory ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => onMissingCategoryChange(!showMissingCategory)}
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Uncategorized</span>
              <Badge variant={showMissingCategory ? 'secondary' : 'outline'} className="h-5 px-1.5">
                {missingCategoryCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
