import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Users,
  CalendarDays,
  PartyPopper,
  ShoppingCart,
  ArrowRight,
  UtensilsCrossed,
  Check
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Recipe Stash</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          Simple meal planning
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
          Stop thinking about food{' '}
          <span className="text-primary">every day.</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          A full week planned in minutes. Shopping list done. One less thing on your mind.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/meal-plan">
            <Button size="lg" className="gap-2 text-base h-12 px-8">
              Plan My Week
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Quick signup • Start planning in minutes
          </p>
        </div>

        {/* App Preview Placeholder */}
        <div className="mt-16 relative">
          <div className="bg-gradient-to-t from-muted/50 to-transparent absolute inset-0 rounded-xl" />
          <div className="bg-card border rounded-xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto">
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <CalendarDays className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Demo video coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Less deciding. More living.
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          Built for real life, not just calorie tracking.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Feature 1: Share the load */}
          <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Share the load</h3>
            <p className="text-muted-foreground">
              Invite your partner when you're ready. Or don't. Solo planning works great too.
            </p>
          </div>

          {/* Feature 2: Cook once, eat twice */}
          <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Cook once, eat twice</h3>
            <p className="text-muted-foreground">
              Make extra on Monday, lunch is handled on Tuesday. No thinking required.
            </p>
          </div>

          {/* Feature 3: Guests? Handled. */}
          <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <PartyPopper className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Guests? Handled.</h3>
            <p className="text-muted-foreground">
              Hosting dinner? Just tap the day and tell us how many. We'll adjust everything.
            </p>
          </div>

          {/* Feature 4: One list. Zero math. */}
          <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <ShoppingCart className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">One list. Zero math.</h3>
            <p className="text-muted-foreground">
              Ingredients merge automatically. Organized by aisle. Just shop.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Three steps to freedom
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Pick a few favorites</h3>
              <p className="text-muted-foreground text-sm">
                Import from any URL or browse ideas. Start with 5-10.
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Fill your week in minutes</h3>
              <p className="text-muted-foreground text-sm">
                Drag, drop, done. Leftovers fill themselves in.
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Shop once, stress-free</h3>
              <p className="text-muted-foreground text-sm">
                Your list is ready. Organized. Nothing forgotten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recipe Ownership */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Your recipes. Always.
          </h2>
          <p className="text-muted-foreground mb-8">
            Import recipes from anywhere—your favorite blogs, family cookbooks, or your own creations. They stay yours, no strings attached.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm">Import from any URL with one tap</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm">Add your own recipes anytime</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm">Original sources always credited</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm">Export your recipes anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          What if dinner was just... decided?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Most people spend 30+ minutes a day thinking about food. Reclaim that time.
        </p>

        <Link to="/meal-plan">
          <Button size="lg" className="gap-2 text-base h-12 px-8">
            Plan My Week
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-green-500" />
            Set up in under a minute
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-green-500" />
            Your recipes stay yours
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-medium">Recipe Stash</span>
              <p className="text-xs text-muted-foreground">Your recipes, your data.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
