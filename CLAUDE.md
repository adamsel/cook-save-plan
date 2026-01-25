# Recipe Stash - CLAUDE.md

## Project Overview

Recipe Stash is a full-featured recipe management web app with meal planning and shopping list generation. Originally built on Lovable, now maintained locally.

### Core Features
- Recipe storage, search, and favorites
- Import recipes from URLs
- Weekly meal planning with calendar view
- Auto-generated shopping lists with smart ingredient merging
- Spoonacular API integration for recipe discovery
- AI recipe chat assistant

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| State | React Query (TanStack), Context API |
| Forms | react-hook-form + zod validation |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| APIs | Spoonacular (recipe search) |

---

## Project Structure

```
src/
├── pages/              # Route components (Index, Dashboard, RecipesPage, etc.)
├── components/
│   ├── ui/             # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── recipes/        # Recipe-specific components
│   ├── layout/         # Navigation, Layout components
│   └── auth/           # ProtectedRoute
├── hooks/              # Custom React hooks
│   ├── useRecipesData.ts      # Recipe CRUD operations
│   ├── useMealPlansData.ts    # Meal plan operations
│   ├── useSpoonacularRecipes.ts # External recipe search
│   └── useHouseholdSettings.ts
├── context/
│   ├── AuthContext.tsx        # User auth state + profile
│   └── RecipeContext.tsx      # Recipes, meal plans, settings
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client setup
│       └── types.ts           # Auto-generated DB types
├── lib/
│   ├── utils.ts               # cn() class utility
│   ├── recipeParser.ts        # URL import parsing
│   └── ingredientNormalizer/  # Smart ingredient merging
└── types/
    └── recipe.ts              # Core data models

supabase/
├── functions/          # Edge functions (serverless)
│   ├── spoonacular-search/    # Recipe search API proxy
│   ├── spoonacular-recipe/    # Recipe details API proxy
│   └── recipe-chat/           # AI chat integration
└── migrations/         # Database schema migrations
```

---

## Development Commands

```bash
npm run dev      # Start dev server at http://localhost:8080
npm run build    # Create production build
npm run lint     # Check code quality with ESLint
npm run preview  # Preview production build locally
```

---

## Database Schema (Supabase)

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (display_name, avatar_url) |
| `recipes` | Recipe data with ingredients, instructions, nutrition |
| `meal_plans` | Weekly meal plan records (week_start_date) |
| `meal_plan_items` | Individual meal entries linking recipes to meal slots |
| `recipe_shares` | Recipe sharing permissions between users |

### Key Recipe Fields
- `ingredients`: JSONB array of `{ name, quantity, unit, notes }` objects
- `instructions`: String array of steps
- `nutrition`: JSONB with calories, protein, carbs, fat, fiber, sodium
- `is_favorite`, `is_archived`, `is_public`, `is_library`: Boolean flags
- `import_method`: 'manual' | 'url' | 'photo' | 'spoonacular'

### Row Level Security
All tables use RLS policies. Users can only access:
- Their own recipes, meal plans, and profile
- Public recipes (is_public = true)
- Recipes explicitly shared with them

---

## Key Patterns

### Authentication
```typescript
// Get current user and auth state
import { useAuth } from '@/context/AuthContext';

const { user, profile, isLoading, signIn, signOut } = useAuth();
```

### Recipe Data Operations
```typescript
// Use the recipes hook for all recipe operations
import { useRecipesData } from '@/hooks/useRecipesData';

const {
  recipes,           // User's personal recipes
  libraryRecipes,    // Public recipes
  allRecipes,        // Combined accessible recipes
  isLoading,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  toggleFavorite,
  toggleArchive,
} = useRecipesData();
```

### Meal Plans
```typescript
import { useMealPlansData } from '@/hooks/useMealPlansData';

const {
  mealPlans,
  addMealPlanItem,
  removeMealPlanItem,
  updateMealPlanItem,
} = useMealPlansData();
```

### UI Components (shadcn/ui)
```typescript
// Import from @/components/ui
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

### Forms with Validation
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  servings: z.number().min(1),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { title: '', servings: 4 },
});
```

### Toast Notifications
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();
toast({
  title: 'Success',
  description: 'Recipe saved!',
});
// For errors:
toast({ title: 'Error', description: message, variant: 'destructive' });
```

---

## Supabase Operations

### Direct Database Queries
```typescript
import { supabase } from '@/integrations/supabase/client';

// Select
const { data, error } = await supabase
  .from('recipes')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('recipes')
  .insert([recipeData])
  .select()
  .single();

// Update
const { error } = await supabase
  .from('recipes')
  .update({ is_favorite: true })
  .eq('id', recipeId);

// Delete
const { error } = await supabase
  .from('recipes')
  .delete()
  .eq('id', recipeId);
```

### Calling Edge Functions
```typescript
const { data, error } = await supabase.functions.invoke('spoonacular-search', {
  body: { query: 'pasta', number: 10 },
});
```

---

## Type Definitions

### Recipe Type
```typescript
interface Recipe {
  id: string;
  title: string;
  sourceUrl?: string;
  imageUrl?: string;
  description?: string;
  category: string;
  tags: string[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  isFavorite: boolean;
  isArchived: boolean;
  cuisine?: string;
  dietary: string[];
  mealTypes: MealType[];
  author?: string;
  nutrition?: RecipeNutrition;
  importMethod?: ImportMethod;
  createdAt: string;
  updatedAt: string;
}

interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string;
  notes?: string;
}
```

---

## Environment Variables

Located in `.env` (already configured):
```
VITE_SUPABASE_PROJECT_ID=uuzmuktniwfrddonykul
VITE_SUPABASE_PUBLISHABLE_KEY=[anon key]
VITE_SUPABASE_URL=https://uuzmuktniwfrddonykul.supabase.co
```

The `SPOONACULAR_API_KEY` is stored as a Supabase secret (not in .env).

---

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/layout/Navigation.tsx`

### Adding a New UI Component from shadcn
```bash
npx shadcn@latest add [component-name]
# Example: npx shadcn@latest add accordion
```

### Adding a Database Table
1. Create migration in Supabase dashboard or `supabase/migrations/`
2. Regenerate types (if using Supabase CLI)
3. Add TypeScript interfaces in `src/types/`
4. Create data hook in `src/hooks/`

---

## Edge Function Development

Edge functions are in `supabase/functions/`. Each function:
- Is a Deno TypeScript file
- Has access to Supabase secrets via `Deno.env.get()`
- Returns JSON responses

Example structure:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { query } = await req.json();
  // ... logic
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Troubleshooting

### "Not authenticated" errors
- Check `useAuth()` returns a valid user
- Ensure component is wrapped in `AuthProvider`
- Verify Supabase session hasn't expired

### Database query returns empty
- Check RLS policies in Supabase dashboard
- Verify `user_id` matches the authenticated user
- Check if records are marked `is_archived: true`

### Edge function errors
- Check Supabase dashboard logs
- Verify secrets are configured (`SPOONACULAR_API_KEY`)
- Test with `supabase functions serve` locally (requires Supabase CLI)
