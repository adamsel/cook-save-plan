import { useState, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { RecipeProvider } from "@/context/RecipeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navigation } from "@/components/layout/Navigation";
import { AddRecipeDialog } from "@/components/recipes/AddRecipeDialog";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SentryErrorBoundary } from "@/lib/sentry";
import { Loader2, AlertTriangle } from 'lucide-react';

// Static imports for lightweight public pages
import AuthPage from "@/pages/AuthPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import LandingPage from "@/pages/LandingPage";
import NotFound from "./pages/NotFound";

// Lazy load heavy protected pages for code splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const RecipesPage = lazy(() => import("@/pages/RecipesPage"));
const MealPlanPage = lazy(() => import("@/pages/MealPlanPage"));
const ShoppingListPage = lazy(() => import("@/pages/ShoppingListPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

// Lazy load public sharing pages
const SharedMealPlanPage = lazy(() => import("@/pages/SharedMealPlanPage"));
const CreatorProfilePage = lazy(() => import("@/pages/CreatorProfilePage"));
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage"));
const PublicRecipePage = lazy(() => import("@/pages/PublicRecipePage"));
const CreatorDashboardPage = lazy(() => import("@/pages/CreatorDashboardPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const ErrorFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
    <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
    <p className="text-muted-foreground mb-6 max-w-md">
      An unexpected error occurred. Please reload the page to try again.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    >
      Reload page
    </button>
  </div>
);

const App = () => {
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  return (
    <SentryErrorBoundary fallback={<ErrorFallback />}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RecipeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen bg-background">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/plan/:shareSlug" element={<Suspense fallback={<PageLoader />}><SharedMealPlanPage /></Suspense>} />
                  <Route path="/recipe/:id" element={<Suspense fallback={<PageLoader />}><PublicRecipePage /></Suspense>} />
                  <Route path="/creator/dashboard" element={
                    <ProtectedRoute>
                      <Navigation onAddRecipe={() => setShowAddRecipe(true)} />
                      <Suspense fallback={<PageLoader />}><CreatorDashboardPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/creator/:username" element={<Suspense fallback={<PageLoader />}><CreatorProfilePage /></Suspense>} />

                  {/* Protected routes - lazy loaded */}
                  <Route path="/*" element={
                    <ProtectedRoute>
                      <Navigation onAddRecipe={() => setShowAddRecipe(true)} />
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard onAddRecipe={() => setShowAddRecipe(true)} />} />
                          <Route path="/recipes" element={<RecipesPage />} />
                          <Route path="/meal-plan" element={<MealPlanPage />} />
                          <Route path="/shopping-list" element={<ShoppingListPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/discover" element={<DiscoverPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </ProtectedRoute>
                  } />
                </Routes>
              </div>
              <AddRecipeDialog
                open={showAddRecipe}
                onOpenChange={setShowAddRecipe}
              />
              <OfflineIndicator />
            </BrowserRouter>
          </TooltipProvider>
        </RecipeProvider>
      </AuthProvider>
    </QueryClientProvider>
    </SentryErrorBoundary>
  );
};

export default App;
