import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Users,
  CalendarDays,
  PartyPopper,
  ShoppingCart,
  ArrowRight,
  UtensilsCrossed,
  Check,
  ChefHat,
  Quote,
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

        {/* Fix 5a: Animated meal plan mockup */}
        <div className="mt-16 relative">
          <div className="bg-gradient-to-t from-muted/50 to-transparent absolute inset-0 rounded-xl" />
          <div className="bg-card border rounded-xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              {/* Day headers */}
              <div className="grid grid-cols-3 gap-3">
                {['Monday', 'Tuesday', 'Wednesday'].map(day => (
                  <div key={day} className="text-center">
                    <span className="text-sm font-semibold text-muted-foreground">{day}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">Dinner</div>
              {/* Animated recipe cards */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="rounded-lg overflow-hidden h-[120px] sm:h-[140px] relative opacity-0"
                  style={{
                    background: 'linear-gradient(135deg, #E76F51 0%, #F4A261 100%)',
                    animation: 'fadeUp 0.5s ease-out 0.3s both',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs sm:text-sm font-medium">Chicken Stir-Fry</p>
                    <p className="text-white/70 text-xs mt-0.5">30 min • 4 servings</p>
                  </div>
                </div>
                <div
                  className="rounded-lg overflow-hidden h-[120px] sm:h-[140px] relative opacity-0"
                  style={{
                    background: 'linear-gradient(135deg, #264653 0%, #2A9D8F 100%)',
                    animation: 'fadeUp 0.5s ease-out 0.6s both',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs sm:text-sm font-medium">Pasta Bolognese</p>
                    <p className="text-white/70 text-xs mt-0.5">45 min • 6 servings</p>
                  </div>
                </div>
                <div
                  className="rounded-lg overflow-hidden h-[120px] sm:h-[140px] relative opacity-0"
                  style={{
                    background: 'linear-gradient(135deg, #6D597A 0%, #B56576 100%)',
                    animation: 'fadeUp 0.5s ease-out 0.9s both',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs sm:text-sm font-medium">Salmon Bowl</p>
                    <p className="text-white/70 text-xs mt-0.5">25 min • 2 servings</p>
                  </div>
                </div>
              </div>
              {/* Mini shopping list */}
              <div
                className="bg-muted/40 rounded-lg p-3 sm:p-4 max-w-xs mx-auto opacity-0"
                style={{ animation: 'fadeUp 0.5s ease-out 1.2s both' }}
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Shopping List</p>
                <div className="space-y-1.5">
                  {['Chicken breast (600g)', 'Spaghetti (500g)', 'Salmon fillets (2)'].map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 rounded border border-muted-foreground/30" />
                      <span className="text-xs sm:text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground/50 mt-1">+ 8 more items...</p>
                </div>
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
          <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Share the load</h3>
            <p className="text-muted-foreground">
              Invite your partner when you're ready. Or don't. Solo planning works great too.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Cook once, eat twice</h3>
            <p className="text-muted-foreground">
              Make extra on Monday, lunch is handled on Tuesday. No thinking required.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <PartyPopper className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Guests? Handled.</h3>
            <p className="text-muted-foreground">
              Hosting dinner? Just tap the day and tell us how many. We'll adjust everything.
            </p>
          </div>

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

      {/* Fix 5b: Social proof */}
      <section className="bg-muted/30 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            What home cooks are saying
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-card border rounded-xl p-6">
              <Quote className="h-8 w-8 text-primary/20 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                "I used to spend Sunday nights agonizing over what to cook. Now I drag a few recipes in and the whole week is sorted. The shopping list alone saves me 20 minutes."
              </p>
              <div>
                <p className="text-sm font-medium">Sarah M.</p>
                <p className="text-xs text-muted-foreground">Home cook, family of 4</p>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <Quote className="h-8 w-8 text-primary/20 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                "My partner and I finally stopped the 'what do you want for dinner' loop. We plan together on Sunday morning and never think about it again all week."
              </p>
              <div>
                <p className="text-sm font-medium">Jake & Mia</p>
                <p className="text-xs text-muted-foreground">Couple, meal prep fans</p>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <Quote className="h-8 w-8 text-primary/20 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                "The leftover feature is genius. I cook a big batch of chili on Monday and it automatically schedules lunch portions for the next two days. Less waste, less effort."
              </p>
              <div>
                <p className="text-sm font-medium">Tom R.</p>
                <p className="text-xs text-muted-foreground">Solo cook, busy schedule</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fix 5c: Creator CTA */}
      <section className="bg-green-50 dark:bg-green-950/20 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="h-14 w-14 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center mx-auto mb-5">
            <ChefHat className="h-7 w-7 text-[#2D6A4F]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Are you a food creator?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Share your meal plans with your audience. Your followers can clone your weekly plans in one tap — recipes, shopping list, and all.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#2D6A4F]" />
              Build your public profile and recipe collection
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#2D6A4F]" />
              Grow a following of home cooks who love your food
            </div>
          </div>
          <Link to="/auth?creator=true">
            <Button size="lg" className="gap-2 bg-[#2D6A4F] hover:bg-[#245A42] text-white">
              Join as a Creator
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
