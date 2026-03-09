import { Compass } from 'lucide-react';

export default function DiscoverPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Compass className="h-8 w-8 text-primary" />
      </div>
      <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-3">Discover Creators</h1>
      <p className="text-muted-foreground max-w-md">
        Coming soon — find creators to follow and get inspired by their meal plans.
      </p>
    </div>
  );
}
