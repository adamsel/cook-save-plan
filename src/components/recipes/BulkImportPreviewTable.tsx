import { useState } from 'react';
import { BulkImportItem } from '@/hooks/useBulkImport';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Loader2, ExternalLink, Copy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkImportPreviewTableProps {
  items: BulkImportItem[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRetryFailed?: () => void;
  selectedCount: number;
  parsedCount: number;
  failedCount: number;
  duplicateCount: number;
}

export function BulkImportPreviewTable({
  items,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onRetryFailed,
  selectedCount,
  parsedCount,
  failedCount,
  duplicateCount,
}: BulkImportPreviewTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allSelected = items.filter(i => i.recipe && i.status !== 'duplicate').every(i => i.selected);

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{parsedCount} ready</span>
          {failedCount > 0 && (
            <span className="text-red-500">{failedCount} failed</span>
          )}
          {duplicateCount > 0 && (
            <span className="text-amber-600">{duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}</span>
          )}
          <span className="text-muted-foreground">
            &middot; {selectedCount} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {failedCount > 0 && onRetryFailed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetryFailed}
              className="text-xs gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Retry failed
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-xs"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
        </div>
      </div>

      {/* Recipe list */}
      <div className="rounded-lg border overflow-y-auto max-h-[50vh]">
        <div className="divide-y">
          {items.map(item => (
            <div key={item.id}>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 transition-colors",
                  item.status === 'error' && "bg-red-50/50",
                  item.status === 'duplicate' && "bg-amber-50/50",
                  item.status === 'saved' && "bg-green-50/50",
                  item.status === 'saving' && "bg-blue-50/50",
                )}
              >
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => onToggle(item.id)}
                  disabled={!item.recipe || item.status === 'saving' || item.status === 'saved' || item.status === 'duplicate'}
                />

                {/* Thumbnail */}
                {item.recipe?.imageUrl ? (
                  <img
                    src={item.recipe.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {item.recipe?.title?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.recipe?.title || item.source}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.status === 'duplicate'
                      ? 'Already in your recipes'
                      : item.recipe
                        ? `${item.recipe.ingredients.length} ingredients · ${item.recipe.instructions.length} steps`
                        : item.error || item.source}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'parsed' && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {item.confidence === 'low' ? 'Low confidence' : 'Ready'}
                    </Badge>
                  )}
                  {item.status === 'duplicate' && (
                    <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700">
                      <Copy className="h-3 w-3" />
                      Duplicate
                    </Badge>
                  )}
                  {item.status === 'error' && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  {item.status === 'saving' && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {item.status === 'saved' && (
                    <Badge className="text-xs gap-1 bg-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Saved
                    </Badge>
                  )}

                  {/* Expand button */}
                  {item.recipe && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      {expandedId === item.id
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === item.id && item.recipe && (
                <div className="px-3 pb-3 pl-14 space-y-2 text-xs">
                  {item.recipe.sourceUrl && (
                    <a
                      href={item.recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.recipe.sourceUrl}
                    </a>
                  )}
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Ingredients:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {item.recipe.ingredients.slice(0, 8).map((ing, i) => (
                        <li key={i}>
                          {ing.quantity ? `${ing.quantity} ` : ''}{ing.unit ? `${ing.unit} ` : ''}{ing.item}
                        </li>
                      ))}
                      {item.recipe.ingredients.length > 8 && (
                        <li className="text-muted-foreground">
                          +{item.recipe.ingredients.length - 8} more
                        </li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Instructions:</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      {item.recipe.instructions.slice(0, 4).map((step, i) => (
                        <li key={i} className="line-clamp-1">{step}</li>
                      ))}
                      {item.recipe.instructions.length > 4 && (
                        <li className="text-muted-foreground">
                          +{item.recipe.instructions.length - 4} more steps
                        </li>
                      )}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
