# Like Them

A social dating game. Make a character, walk into a live multiplayer bar, buy someone a drink, and if the night goes well, invite them somewhere new when the bar closes.

## How it plays

1. **Sign up.** Each person gets their own account (email and password, 18+ only).
2. **Create a character.** Choose woman or man, who you're interested in, your name, age and bio, then your look: skin, hair, eyes, outfit, colours and accessories.
3. **Go to the bar.** It's a shared, real-time room with a neon sign, backlit bottles, booths, a dance floor and a jukebox. Tap the floor to walk. Chat appears as speech bubbles, and you can send emotes. A 💗 on someone's name tag means you match each other's preferences.
4. **Buy someone a drink.** Tap a person to see their profile and send a drink. They can accept 🥂 or politely pass. When they accept, you both hold the drink and both earn XP.
5. **Last call.** Every client shares the same night clock (8 PM to 2 AM). At closing time, or when you "call it a night", you see everyone you shared a drink with. You can invite each of them to a **rooftop terrace, late-night diner, beach walk or jazz club**.
6. **Dates.** If they say yes, you both get a private scene at that venue with a persistent chat.
7. **Evolve.** XP leads to levels and titles ("Newcomer" up to "Legend of the Night"). Levels unlock new drinks, outfits, hairstyles, accessories and date venues. At level 5 your character gets a glowing aura, and at level 8 it turns gold. You also earn badges for milestones.

Safety basics are built in: an 18+ gate, block and report on every profile, and you can only invite people you actually shared a drink with.

## Running it

```bash
npm install
npm run dev
```

With no configuration the app runs in **demo mode**. Accounts are kept in your browser, and multiplayer works between browser tabs: open two tabs and sign up as two different people. A few demo regulars, clearly labelled "demo", keep the bar lively. Demo regulars exist **only** in demo mode and never appear in production.

## Production: real accounts and multiplayer (Supabase)

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor, or with `supabase db push`.
3. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. `npm run build` produces a static site in `dist/`. You can host it on any static host (Vercel, Netlify, Azure Static Web Apps, Cloudflare Pages…).

What Supabase provides:

- **Auth:** multi-user email and password accounts.
- **Postgres with row-level security:** characters, drink offers, date invites, messages, blocks and reports. Players can only edit their own profile fields. **XP and stats are awarded only by database triggers**, so they can't be faked from the browser. Offers are rate-limited.
- **Realtime:** private presence and broadcast channels for the bar (only signed-in players can join), plus live updates for date chats.

`VITE_NIGHT_MINUTES` sets how long one night at the bar lasts in real time (default 20).

## Code map

| Path | What |
| --- | --- |
| `src/screens/BarScene.tsx` | The live bar: movement, chat, emotes, drinks, night clock, level-ups |
| `src/components/Avatar.tsx` | Layered SVG character renderer |
| `src/components/BarBackdrop.tsx` | The bar environment |
| `src/screens/EndOfNight.tsx`, `DateScene.tsx` | Last call and date venues |
| `src/screens/Hub.tsx` | Home: character, XP, badges, invites, dates |
| `src/game/*` | Catalog (items, drinks, venues), progression, night clock |
| `src/backend/supabase.ts` / `local.ts` | Production backend / demo backend behind one interface |
| `supabase/migrations/0001_init.sql` | Schema, RLS policies, XP triggers |
