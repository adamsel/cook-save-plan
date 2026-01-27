# Recipe Stash

A meal planning app for couples and families who batch cook and have lives.

## Features

- **Recipe Management** - Save, organize, and import recipes from any website
- **Meal Planning** - Plan your week with drag-and-drop simplicity
- **Household Collaboration** - Plan meals together with your partner
- **Smart Shopping Lists** - Auto-generated, organized by aisle, with ingredient merging
- **Leftover Tracking** - Batch cook once, eat multiple meals
- **Event Planning** - Track potlucks, guest dinners, and takeaway nights
- **AI Recipe Assistant** - Parse recipes from text or URLs automatically
- **Pantry Management** - Track what you have, avoid buying duplicates

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Google Gemini for recipe parsing and smart cleanup

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env.local` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SENTRY_DSN=your_sentry_dsn (optional)
```

## Supabase Setup

1. Create a Supabase project
2. Run migrations from `supabase/migrations/`
3. Set edge function secrets:
   ```bash
   supabase secrets set GOOGLE_AI_API_KEY=your_key
   supabase secrets set SPOONACULAR_API_KEY=your_key
   ```
4. Deploy edge functions:
   ```bash
   supabase functions deploy
   ```

## License

MIT
