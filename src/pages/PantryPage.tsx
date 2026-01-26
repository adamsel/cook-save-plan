import { useState } from 'react';
import { usePantry, type PantryItem, type AddPantryItemInput } from '@/hooks/usePantry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Edit2,
  AlertTriangle,
  Clock,
  Loader2,
  Search,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Condiments',
  'Spices',
  'Other',
];

interface AddEditDialogProps {
  item?: PantryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: AddPantryItemInput) => Promise<void>;
}

function AddEditDialog({ item, open, onOpenChange, onSave }: AddEditDialogProps) {
  const [displayName, setDisplayName] = useState(item?.displayName || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '');
  const [unit, setUnit] = useState(item?.unit || '');
  const [category, setCategory] = useState(item?.category || '');
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate || '');
  const [lowStockThreshold, setLowStockThreshold] = useState(item?.lowStockThreshold?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) return;

    setIsSaving(true);
    await onSave({
      displayName: displayName.trim(),
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit || null,
      category: category || null,
      expiryDate: expiryDate || null,
      lowStockThreshold: lowStockThreshold ? parseFloat(lowStockThreshold) : null,
    });
    setIsSaving(false);
    onOpenChange(false);

    // Reset form
    if (!item) {
      setDisplayName('');
      setQuantity('');
      setUnit('');
      setCategory('');
      setExpiryDate('');
      setLowStockThreshold('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add to Pantry'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the details for this pantry item.' : 'Add a new item to your pantry inventory.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Olive Oil"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="e.g., 500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g., ml, g, pieces"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="threshold">Low Stock Alert (quantity)</Label>
            <Input
              id="threshold"
              type="number"
              step="any"
              placeholder="Alert when quantity drops below..."
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!displayName.trim() || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {item ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PantryItemCard({
  item,
  onEdit,
  onDelete,
  onAdjustQuantity,
}: {
  item: PantryItem;
  onEdit: () => void;
  onDelete: () => void;
  onAdjustQuantity: (delta: number) => void;
}) {
  const isLowStock = item.lowStockThreshold !== null &&
    item.quantity !== null &&
    item.quantity <= item.lowStockThreshold;

  const daysUntilExpiry = item.expiryDate
    ? differenceInDays(parseISO(item.expiryDate), new Date())
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  return (
    <div className={`p-4 rounded-xl border bg-card ${isExpired ? 'border-destructive/50 bg-destructive/5' : isLowStock || isExpiringSoon ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{item.displayName}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            {item.quantity !== null && (
              <span>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
            )}
            {item.category && (
              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
            )}
          </div>

          {/* Warnings */}
          <div className="flex flex-wrap gap-2 mt-2">
            {isExpired && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Expired
              </Badge>
            )}
            {isExpiringSoon && !isExpired && (
              <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                <Clock className="h-3 w-3" />
                Expires {daysUntilExpiry === 0 ? 'today' : daysUntilExpiry === 1 ? 'tomorrow' : `in ${daysUntilExpiry} days`}
              </Badge>
            )}
            {isLowStock && (
              <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Low stock
              </Badge>
            )}
          </div>

          {item.expiryDate && !isExpiringSoon && !isExpired && (
            <p className="text-xs text-muted-foreground mt-1">
              Expires {format(parseISO(item.expiryDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {item.quantity !== null && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAdjustQuantity(-1)}
                disabled={item.quantity <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAdjustQuantity(1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from pantry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove {item.displayName} from your pantry. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export default function PantryPage() {
  const {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    adjustQuantity,
    getLowStockItems,
    getExpiringSoonItems,
  } = usePantry();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  const lowStockItems = getLowStockItems();
  const expiringSoonItems = getExpiringSoonItems();

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery ||
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
      item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  const categories = Object.keys(groupedItems).sort();

  const handleAddItem = async (input: AddPantryItemInput) => {
    await addItem(input);
  };

  const handleEditItem = async (input: AddPantryItemInput) => {
    if (!editingItem) return;
    await updateItem(editingItem.id, input);
    setEditingItem(null);
  };

  if (isLoading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-1">Pantry</h1>
          <p className="text-muted-foreground">
            Track what you have at home
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || expiringSoonItems.length > 0) && (
        <div className="flex flex-wrap gap-4 mb-6">
          {lowStockItems.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm">
                <strong>{lowStockItems.length}</strong> item{lowStockItems.length > 1 ? 's' : ''} running low
              </span>
            </div>
          )}
          {expiringSoonItems.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm">
                <strong>{expiringSoonItems.length}</strong> item{expiringSoonItems.length > 1 ? 's' : ''} expiring soon
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pantry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">Your pantry is empty</h2>
          <p className="text-muted-foreground mb-6">
            Start adding items to track what you have at home
          </p>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Item
          </Button>
        </div>
      )}

      {/* Items List */}
      {items.length > 0 && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No items match your search</p>
        </div>
      )}

      {categories.map(category => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {category}
            <Badge variant="secondary" className="text-xs">{groupedItems[category].length}</Badge>
          </h2>
          <div className="grid gap-3">
            {groupedItems[category].map(item => (
              <PantryItemCard
                key={item.id}
                item={item}
                onEdit={() => setEditingItem(item)}
                onDelete={() => deleteItem(item.id)}
                onAdjustQuantity={(delta) => adjustQuantity(item.id, delta)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Add Dialog */}
      <AddEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddItem}
      />

      {/* Edit Dialog */}
      {editingItem && (
        <AddEditDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSave={handleEditItem}
        />
      )}
    </div>
  );
}
