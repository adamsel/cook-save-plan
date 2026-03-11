import { useState, useRef } from 'react';
import { useBulkImport } from '@/hooks/useBulkImport';
import { BulkImportPreviewTable } from './BulkImportPreviewTable';
import { generateTemplateCsv } from '@/lib/csvRecipeParser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Link,
  FileSpreadsheet,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const {
    step,
    items,
    currentIndex,
    savedCount,
    errorCount,
    selectedCount,
    parsedCount,
    failedCount,
    duplicateCount,
    totalCount,
    startUrlImport,
    startCsvImport,
    toggleItem,
    selectAll,
    deselectAll,
    saveSelected,
    retryFailed,
    cancel,
    reset,
  } = useBulkImport();

  const [urlText, setUrlText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      if (step === 'saving') {
        cancel();
      }
      reset();
      setUrlText('');
    }
    onOpenChange(isOpen);
  };

  const handleCsvFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      return;
    }
    startCsvImport(file);
  };

  const handleDownloadTemplate = () => {
    const csv = generateTemplateCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {step === 'complete' ? 'Import Complete' : 'Bulk Import Recipes'}
          </DialogTitle>
        </DialogHeader>

        {/* Input step */}
        {step === 'input' && (
          <Tabs defaultValue="url" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-1.5">
                <Link className="h-4 w-4" />
                From URLs
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                CSV Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Paste recipe URLs from your blog, one per line (up to 50).
                </p>
                <Textarea
                  value={urlText}
                  onChange={e => setUrlText(e.target.value)}
                  placeholder={"https://myblog.com/chicken-tikka\nhttps://myblog.com/pasta-primavera\nhttps://myblog.com/banana-bread"}
                  rows={8}
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {urlText.split('\n').filter(l => l.trim()).length} URL{urlText.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    onClick={() => startUrlImport(urlText)}
                    disabled={!urlText.trim()}
                  >
                    Start Import
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-4 mt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with your recipes. Minimum columns: title, ingredients.
                </p>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  )}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleCsvFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Drop a CSV file here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvFile(file);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download template CSV
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Processing step */}
        {step === 'processing' && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="font-medium">Parsing recipes...</p>
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} of {totalCount}
                {items[currentIndex] && (
                  <span className="block truncate max-w-md mx-auto mt-1 text-xs">
                    {items[currentIndex].source}
                  </span>
                )}
              </p>
            </div>
            <Progress value={((currentIndex + 1) / totalCount) * 100} />
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => { cancel(); reset(); }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && (
          <div className="flex flex-col min-h-0 gap-4">
            <div className="min-h-0 overflow-y-auto">
              <BulkImportPreviewTable
                items={items}
                onToggle={toggleItem}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                onRetryFailed={failedCount > 0 ? retryFailed : undefined}
                selectedCount={selectedCount}
                parsedCount={parsedCount}
                failedCount={failedCount}
                duplicateCount={duplicateCount}
              />
            </div>
            <div className="flex items-center justify-between pt-2 shrink-0">
              <Button variant="outline" onClick={() => { reset(); }}>
                Back
              </Button>
              <Button onClick={saveSelected} disabled={selectedCount === 0}>
                Import {selectedCount} Recipe{selectedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Saving step */}
        {step === 'saving' && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="font-medium">Saving recipes...</p>
              <p className="text-sm text-muted-foreground">
                {savedCount + errorCount} of {selectedCount}
              </p>
            </div>
            <Progress value={((savedCount + errorCount) / selectedCount) * 100} />
          </div>
        )}

        {/* Complete step */}
        {step === 'complete' && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-lg font-semibold">
                {savedCount} recipe{savedCount !== 1 ? 's' : ''} imported
              </p>
              {errorCount > 0 && (
                <p className="text-sm text-red-500 flex items-center justify-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errorCount} failed to save
                </p>
              )}
            </div>
            <Button onClick={() => handleClose(false)}>
              View Recipes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
