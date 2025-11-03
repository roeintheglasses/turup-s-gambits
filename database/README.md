# Database Setup: Neon + Clerk

## Quick Start

### 1. Install Dependencies
```bash
pnpm add @clerk/nextjs @neondatabase/serverless svix
```

### 2. Setup Services

**Neon** (https://neon.tech):
1. Create project → Copy connection string
2. Run `schema.sql` in SQL Editor

**Clerk** (https://clerk.com):
1. Create application → Copy API keys
2. Configure webhooks → Copy webhook secret

### 3. Environment Variables
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Neon
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Colyseus (keep existing)
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
```

### 4. Add Clerk Provider
```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## Architecture

```
Clerk (Auth) → Neon DB (Data) ← Colyseus (Game Server)
```

- **Clerk**: Handles authentication, user management
- **Neon**: Stores players, games, stats, leaderboards
- **Colyseus**: Real-time game logic (already working)

## Files

```
database/
├── schema.sql           # PostgreSQL schema (run in Neon)
├── types.ts             # TypeScript definitions
├── MIGRATION_GUIDE.md   # Detailed migration steps
└── README.md            # This file

lib/
└── db.ts               # Database functions (30+ utilities)
```

## Key Features

- ✅ ELO rating system
- ✅ Achievement system (11 pre-seeded)
- ✅ Global & weekly leaderboards
- ✅ Game history & replays
- ✅ Guest player support

## Usage Examples

```typescript
import { upsertPlayer, completeGame, getLeaderboard } from '@/lib/db';

// Create/update player (from Clerk webhook)
await upsertPlayer({
  id: user.id,
  username: user.username,
  displayName: user.firstName,
  avatarUrl: user.imageUrl,
});

// Complete game (from Colyseus server)
await completeGame({
  colyseusRoomId: room.id,
  winningTeam: 'royals',
  royalsTricks: 8,
  rebelsTricks: 5,
  trumpSuit: 'hearts',
  durationSeconds: 1200,
});

// Get leaderboard
const top100 = await getLeaderboard(100);
```

## Migration from Supabase

See `MIGRATION_GUIDE.md` for step-by-step instructions (2-3 hours).

## Cost

- **Free tier**: Neon (0.5GB) + Clerk (10k MAU) = $0/month
- **Paid**: Neon Pro ($19) + Clerk Pro ($25) = $44/month

## Documentation

- **Schema**: `schema.sql` (full schema with comments)
- **Types**: `types.ts` (TypeScript definitions)
- **Functions**: `../lib/db.ts` (30+ database utilities)
- **Migration**: `MIGRATION_GUIDE.md` (detailed steps)
