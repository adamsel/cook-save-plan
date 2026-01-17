import { useState } from 'react';
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
import Dashboard from "@/pages/Dashboard";
import RecipesPage from "@/pages/RecipesPage";
import MealPlanPage from "@/pages/MealPlanPage";
import ShoppingListPage from "@/pages/ShoppingListPage";
import SettingsPage from "@/pages/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RecipeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen bg-background">
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="*" element={
                    <ProtectedRoute>
                      <Navigation onAddRecipe={() => setShowAddRecipe(true)} />
                      <Routes>
                        <Route path="/" element={<Dashboard onAddRecipe={() => setShowAddRecipe(true)} />} />
                        <Route path="/recipes" element={<RecipesPage />} />
                        <Route path="/meal-plan" element={<MealPlanPage />} />
                        <Route path="/shopping-list" element={<ShoppingListPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </ProtectedRoute>
                  } />
                </Routes>
              </div>
              <AddRecipeDialog 
                open={showAddRecipe} 
                onOpenChange={setShowAddRecipe} 
              />
            </BrowserRouter>
          </TooltipProvider>
        </RecipeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
