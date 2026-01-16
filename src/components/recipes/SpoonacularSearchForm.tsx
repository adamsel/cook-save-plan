import { useState } from 'react';
import { Search, Filter, Loader2, X, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SpoonacularSearchFormProps {
  onSearch: (params: {
    query?: string;
    diet?: string;
    intolerances?: string;
    maxReadyTime?: number;
  }) => void;
  isSearching: boolean;
}

const DIETS = [
  { value: '', label: 'Any diet' },
  { value: 'gluten free', label: 'Gluten Free' },
  { value: 'ketogenic', label: 'Ketogenic' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'lacto-vegetarian', label: 'Lacto-Vegetarian' },
  { value: 'ovo-vegetarian', label: 'Ovo-Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescetarian', label: 'Pescetarian' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'primal', label: 'Primal' },
  { value: 'whole30', label: 'Whole30' },
];

const INTOLERANCES = [
  'dairy',
  'egg',
  'gluten',
  'grain',
  'peanut',
  'seafood',
  'sesame',
  'shellfish',
  'soy',
  'sulfite',
  'tree nut',
  'wheat',
];

const TIME_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '15', label: 'Under 15 min' },
  { value: '30', label: 'Under 30 min' },
  { value: '45', label: 'Under 45 min' },
  { value: '60', label: 'Under 1 hour' },
];

export function SpoonacularSearchForm({ onSearch, isSearching }: SpoonacularSearchFormProps) {
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState('');
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [maxReadyTime, setMaxReadyTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query: query || undefined,
      diet: diet || undefined,
      intolerances: selectedIntolerances.length > 0 ? selectedIntolerances.join(',') : undefined,
      maxReadyTime: maxReadyTime ? parseInt(maxReadyTime, 10) : undefined,
    });
  };

  const toggleIntolerance = (intolerance: string) => {
    setSelectedIntolerances(prev =>
      prev.includes(intolerance)
        ? prev.filter(i => i !== intolerance)
        : [...prev, intolerance]
    );
  };

  const clearFilters = () => {
    setDiet('');
    setSelectedIntolerances([]);
    setMaxReadyTime('');
  };

  const hasFilters = diet || selectedIntolerances.length > 0 || maxReadyTime;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search recipes (e.g., pasta, chicken curry, vegan tacos...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              type="button" 
              variant={hasFilters ? "secondary" : "outline"} 
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {(diet ? 1 : 0) + (selectedIntolerances.length > 0 ? 1 : 0) + (maxReadyTime ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Search Filters</h4>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Diet */}
              <div className="space-y-2">
                <Label>Diet</Label>
                <Select value={diet} onValueChange={setDiet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any diet" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIETS.map(d => (
                      <SelectItem key={d.value} value={d.value || 'any'}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Ready Time */}
              <div className="space-y-2">
                <Label>Max prep time</Label>
                <Select value={maxReadyTime} onValueChange={setMaxReadyTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => (
                      <SelectItem key={t.value} value={t.value || 'any'}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Intolerances */}
              <div className="space-y-2">
                <Label>Intolerances</Label>
                <div className="flex flex-wrap gap-1.5">
                  {INTOLERANCES.map(intolerance => (
                    <Badge
                      key={intolerance}
                      variant={selectedIntolerances.includes(intolerance) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleIntolerance(intolerance)}
                    >
                      {intolerance}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Search button */}
        <Button type="submit" disabled={isSearching}>
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Active filters display */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {diet && (
            <Badge variant="secondary" className="capitalize">
              {diet}
              <button 
                type="button"
                onClick={() => setDiet('')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {maxReadyTime && (
            <Badge variant="secondary">
              Under {maxReadyTime} min
              <button 
                type="button"
                onClick={() => setMaxReadyTime('')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedIntolerances.map(intolerance => (
            <Badge key={intolerance} variant="secondary" className="capitalize">
              No {intolerance}
              <button 
                type="button"
                onClick={() => toggleIntolerance(intolerance)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </form>
  );
}
