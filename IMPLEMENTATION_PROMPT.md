# Recipe Stash Improvement Implementation Prompt

## Project Context

Recipe Stash is a React/TypeScript meal planning app with Supabase backend. The app already has strong fundamentals (ingredient merging, meal planning, recipe import) but needs improvements in collaboration, data persistence, and user experience based on competitive research.

**Tech Stack:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- State: React Query, Context API, localStorage (for some features)
- Backend: Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- Forms: react-hook-form + zod

---

## Phase 1: Fix What's Broken

### 1.1 Deploy AI Cleanup Edge Function + Add "Apply" Button

**Problem:** The AI shopping list cleanup feature exists but is hidden. The button is commented out in the UI, and even when results are shown, there's no way to apply them.

**Current State:**
- Edge Function exists: `supabase/functions/shopping-list-cleanup/index.ts`
- UI component exists but button hidden: `src/pages/ShoppingListPage.tsx` lines 482-496
- Results dialog shows but says "In a future update..." with no apply action

**Tasks:**
1. Verify the Edge Function is deployed and working (test with curl or Supabase dashboard)
2. Uncomment the AI cleanup button in ShoppingListPage.tsx (around line 485)
3. Add an "Apply Changes" button to the cleanup results dialog (around line 749)
4. Implement the apply logic:
   - Map AI-suggested items back to original item IDs
   - Update quantities/units in the shopping list state
   - Mark merged items as checked (since they're consolidated)
   - Show success toast

**Files to modify:**
- `src/pages/ShoppingListPage.tsx`

**Acceptance criteria:**
- Button visible and calls Edge Function successfully
- Results display with before/after comparison
- "Apply" updates the shopping list in real-time
- Handles errors gracefully (API failures, rate limits)

---

### 1.2 Persist Shopping List State to Database

**Problem:** Checked items and custom items are stored in localStorage only. Users lose their progress when switching devices or clearing browser data.

**Current State:**
- `src/pages/ShoppingListPage.tsx` line 63: `useLocalStorage<Record<string, boolean>>('shoppingListChecked', {})`
- Custom items also in localStorage (line 64)
- No database table for shopping list state

**Tasks:**
1. Create Supabase migration for `shopping_list_state` table:
   ```sql
   CREATE TABLE shopping_list_state (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     week_start_date DATE NOT NULL,
     checked_items JSONB DEFAULT '{}',
     custom_items JSONB DEFAULT '[]',
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(user_id, week_start_date)
   );

   -- RLS policies
   ALTER TABLE shopping_list_state ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can manage own shopping list state" ON shopping_list_state
     FOR ALL USING (auth.uid() = user_id);
   ```

2. Create hook `useShoppingListState.ts`:
   - Fetch state for current week on mount
   - Debounced save on changes (avoid excessive writes)
   - Fallback to localStorage for unauthenticated users
   - Sync localStorage → database on first authenticated load

3. Update ShoppingListPage.tsx to use new hook instead of direct localStorage

**Files to create:**
- `supabase/migrations/[timestamp]_shopping_list_state.sql`
- `src/hooks/useShoppingListState.ts`

**Files to modify:**
- `src/pages/ShoppingListPage.tsx`
- `src/integrations/supabase/types.ts` (regenerate or manually add types)

**Acceptance criteria:**
- Checked items persist across devices when logged in
- Custom items persist across devices when logged in
- Changes sync within 1-2 seconds (debounced)
- Works offline with localStorage, syncs when online
- No data loss during migration from localStorage

---

### 1.3 Fix Recipe Sharing (Email-Based Invites)

**Problem:** The share dialog has an email field but `shareRecipe()` just shows "Coming soon" toast.

**Current State:**
- `src/components/recipes/ShareRecipeDialog.tsx` has email input UI
- `src/hooks/useRecipesData.ts` line 355-372: `shareRecipe()` is a stub
- `recipe_shares` table exists with proper schema
- `can_edit` field exists but is never used

**Tasks:**
1. Implement user lookup by email in `shareRecipe()`:
   ```typescript
   // Look up user by email (need to query profiles or auth.users)
   const { data: targetUser } = await supabase
     .from('profiles')
     .select('id')
     .eq('email', email)
     .single();
   ```

   Note: May need to add `email` column to `profiles` table or use Supabase Auth admin API

2. If user not found, create a `pending_shares` table for invite-by-email:
   ```sql
   CREATE TABLE pending_shares (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
     shared_by_user_id UUID REFERENCES auth.users(id),
     invited_email TEXT NOT NULL,
     can_edit BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

3. When invited user signs up/logs in, check `pending_shares` and convert to `recipe_shares`

4. Update ShareRecipeDialog to show:
   - Success state when shared with existing user
   - "Invitation sent" state for pending shares
   - List of current shares with ability to revoke

5. Enforce `can_edit` permission in RLS policies:
   ```sql
   CREATE POLICY "Shared users can edit if permitted" ON recipes
     FOR UPDATE USING (
       EXISTS (
         SELECT 1 FROM recipe_shares
         WHERE recipe_shares.recipe_id = recipes.id
         AND recipe_shares.shared_with_user_id = auth.uid()
         AND recipe_shares.can_edit = true
       )
     );
   ```

**Files to create:**
- `supabase/migrations/[timestamp]_fix_recipe_sharing.sql`

**Files to modify:**
- `src/hooks/useRecipesData.ts` (implement shareRecipe)
- `src/components/recipes/ShareRecipeDialog.tsx` (show share status, revoke option)
- `src/integrations/supabase/types.ts`

**Acceptance criteria:**
- Can share recipe with existing user by email
- Can invite non-users by email (pending share)
- Pending shares convert on signup
- Can revoke shares
- `can_edit` permission is enforced
- Shared recipes appear in recipient's recipe list

---

## Phase 2: Household Foundation

### 2.1 Create Households Table Structure

**Problem:** All settings (household size, pantry staples) are per-browser in localStorage. Family members can't share meal plans or shopping lists.

**Tasks:**
1. Create database schema:
   ```sql
   -- Households
   CREATE TABLE households (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     created_by UUID REFERENCES auth.users(id),
     created_at TIMESTAMPTZ DEFAULT now()
   );

   -- Household members
   CREATE TABLE household_members (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     household_id UUID REFERENCES households(id) ON DELETE CASCADE,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
     joined_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(household_id, user_id)
   );

   -- Household settings (replaces localStorage)
   CREATE TABLE household_settings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     household_id UUID REFERENCES households(id) ON DELETE CASCADE UNIQUE,
     household_size INTEGER DEFAULT 2,
     default_dinner_servings INTEGER DEFAULT 4,
     suggest_leftovers_for_lunch BOOLEAN DEFAULT true,
     pantry_staples JSONB DEFAULT '["salt", "pepper", "olive oil", "butter", "garlic", "onion", "sugar", "flour"]',
     aisle_categories JSONB DEFAULT NULL,
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- RLS
   ALTER TABLE households ENABLE ROW LEVEL SECURITY;
   ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
   ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Members can view household" ON households
     FOR SELECT USING (
       EXISTS (SELECT 1 FROM household_members WHERE household_id = id AND user_id = auth.uid())
     );
   -- Add more policies for insert/update/delete
   ```

2. Create `useHousehold.ts` hook:
   - Fetch user's household(s)
   - CRUD for household settings
   - Invite/remove members
   - Fall back to localStorage for users without household

3. Update `useHouseholdSettings.ts` to use database when household exists

4. Add UI for household management (settings page or modal)

**Files to create:**
- `supabase/migrations/[timestamp]_households.sql`
- `src/hooks/useHousehold.ts`
- `src/components/settings/HouseholdSettings.tsx`

**Files to modify:**
- `src/hooks/useHouseholdSettings.ts`
- Settings page (add household management section)

---

### 2.2 Enable Meal Plan Sharing Within Household

**Problem:** Each user has their own meal plans. Family members can't see or contribute to the same plan.

**Tasks:**
1. Add `household_id` to `meal_plans` table:
   ```sql
   ALTER TABLE meal_plans ADD COLUMN household_id UUID REFERENCES households(id);

   -- Update RLS to allow household members to view/edit
   CREATE POLICY "Household members can view meal plans" ON meal_plans
     FOR SELECT USING (
       user_id = auth.uid() OR
       EXISTS (
         SELECT 1 FROM household_members hm
         WHERE hm.household_id = meal_plans.household_id
         AND hm.user_id = auth.uid()
       )
     );
   ```

2. Update `useMealPlansData.ts`:
   - When creating meal plan, set household_id if user has one
   - Fetch meal plans for user's household, not just user_id
   - Handle conflicts (two users editing same plan)

3. Add visual indicator for who added each meal (optional)

**Files to modify:**
- `supabase/migrations/[timestamp]_meal_plan_sharing.sql`
- `src/hooks/useMealPlansData.ts`
- `src/pages/MealPlanPage.tsx` (optional: show contributor)

---

## Phase 3: Pantry Intelligence

### 3.1 Build Pantry Inventory System

**Problem:** Users can only hide "staples" but can't track what they actually have at home with quantities.

**Tasks:**
1. Create pantry table:
   ```sql
   CREATE TABLE pantry_items (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     household_id UUID REFERENCES households(id) ON DELETE CASCADE,
     user_id UUID REFERENCES auth.users(id), -- fallback if no household
     ingredient_key TEXT NOT NULL, -- normalized ingredient name
     display_name TEXT NOT NULL,
     quantity NUMERIC,
     unit TEXT,
     category TEXT,
     expiry_date DATE,
     low_stock_threshold NUMERIC,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Create `usePantry.ts` hook for CRUD operations

3. Create Pantry page or section:
   - Add items manually or from shopping list ("Mark as bought")
   - Edit quantities
   - Set expiry dates (optional)
   - Low stock warnings

4. Integrate with shopping list:
   - Show "You have X at home" indicator
   - Option to subtract pantry quantity from needed amount
   - "Add to pantry" action when checking off items

**Files to create:**
- `supabase/migrations/[timestamp]_pantry.sql`
- `src/hooks/usePantry.ts`
- `src/pages/PantryPage.tsx`
- `src/components/pantry/PantryItemCard.tsx`
- `src/components/pantry/AddPantryItemDialog.tsx`

**Files to modify:**
- `src/pages/ShoppingListPage.tsx` (pantry integration)
- `src/App.tsx` (add route)
- Navigation (add link)

---

## Phase 4: Polish & Differentiation

### 4.1 Recipe Source Attribution in Shopping List

**Problem:** Users can't see which recipe requires each ingredient.

**Tasks:**
1. Modify ingredient merging to track source recipes:
   ```typescript
   interface MergedIngredient {
     // existing fields...
     sources: Array<{ recipeId: string; recipeTitle: string; amount: string }>;
   }
   ```

2. Update ShoppingListPage to show expandable source info:
   - Click ingredient to see "Used in: Recipe A (2 cups), Recipe B (1 cup)"
   - Link to recipe detail

**Files to modify:**
- `src/lib/ingredientNormalizer/index.ts`
- `src/pages/ShoppingListPage.tsx`

---

### 4.2 Manual Category Override

**Problem:** Regex categorization sometimes puts items in wrong aisles.

**Tasks:**
1. Add `category_overrides` to user settings or shopping list state
2. Add edit button next to category in shopping list
3. Save override and apply on future lists

**Files to modify:**
- `src/pages/ShoppingListPage.tsx`
- `src/hooks/useShoppingListState.ts` (add overrides to state)

---

### 4.3 Dietary/Allergen Highlighting

**Problem:** Shopping list doesn't flag ingredients that conflict with dietary preferences.

**Tasks:**
1. Add dietary preferences to user/household settings:
   ```typescript
   dietaryRestrictions: ['gluten-free', 'dairy-free', 'nut-free', 'vegetarian', 'vegan']
   allergens: ['peanuts', 'tree nuts', 'shellfish', 'eggs']
   ```

2. Create allergen/dietary mapping for common ingredients

3. Highlight flagged items in shopping list with warning icon

**Files to create:**
- `src/lib/dietaryFlags.ts`

**Files to modify:**
- `src/hooks/useHouseholdSettings.ts`
- `src/pages/ShoppingListPage.tsx`

---

## Implementation Order

Recommended sequence for a single developer:

1. **1.2 Shopping List Persistence** (Low complexity, high impact)
2. **1.1 AI Cleanup Button** (Low complexity, already built)
3. **4.1 Recipe Source Attribution** (Low complexity, useful)
4. **4.2 Manual Category Override** (Low complexity, useful)
5. **1.3 Recipe Sharing** (Medium complexity, needed for households)
6. **2.1 Households Schema** (Medium complexity, foundation)
7. **2.2 Meal Plan Sharing** (Medium complexity, depends on 2.1)
8. **3.1 Pantry System** (Higher complexity, major feature)
9. **4.3 Dietary Highlighting** (Medium complexity, nice-to-have)

---

## Testing Checklist

For each feature:
- [ ] Works for authenticated users
- [ ] Graceful fallback for unauthenticated users
- [ ] Mobile responsive
- [ ] Error handling for network failures
- [ ] Loading states shown
- [ ] Toast notifications for success/error
- [ ] No console errors
- [ ] RLS policies tested (can't access other users' data)

---

## Notes

- Always use existing UI patterns from shadcn/ui components
- Follow existing hook patterns (useRecipesData, useMealPlansData)
- Use React Query for server state, localStorage for offline/fallback
- Toast notifications via `useToast()` hook
- Forms with react-hook-form + zod validation
- Keep the UI simple - avoid over-engineering
