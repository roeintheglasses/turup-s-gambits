# Migration Guide: Supabase → Neon + Clerk

Complete guide to migrating from Supabase to Neon PostgreSQL + Clerk authentication.

## 🎯 Overview

**What's changing:**
- ❌ Remove: Supabase (auth + database)
- ✅ Add: Clerk (authentication only)
- ✅ Add: Neon PostgreSQL (database only)
- ✅ Keep: Colyseus (game server)

**Time estimate:** 2-3 hours

---

## Phase 1: Setup Neon (30 minutes)

### Step 1: Create Neon Project

1. Go to https://neon.tech
2. Sign up / Log in
3. Click **"Create Project"**
4. Choose:
   - **Region**: Closest to your users
   - **PostgreSQL version**: 16 (latest)
   - **Compute size**: Start with 0.25 CU (scale later)

### Step 2: Get Connection String

1. In Neon dashboard, go to **Connection Details**
2. Copy the connection string (it looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### Step 3: Run Schema

1. In Neon dashboard, click **SQL Editor**
2. Copy contents of `database/schema.sql`
3. Paste and click **Run**
4. Verify tables created successfully

**Or use psql:**
```bash
psql "postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" -f database/schema.sql
```

### Step 4: Update Environment Variables

Add to `.env.local`:
```env
# Neon Database
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

---

## Phase 2: Setup Clerk (30 minutes)

### Step 1: Create Clerk Application

1. Go to https://clerk.com
2. Sign up / Log in
3. Click **"Create Application"**
4. Choose:
   - **Name**: "Turup's Gambit"
   - **Sign-in methods**:
     - ✅ Email
     - ✅ Username
     - ✅ Discord (OAuth)
   - **Style**: Choose theme

### Step 2: Get API Keys

1. In Clerk dashboard, go to **API Keys**
2. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Step 3: Update Environment Variables

Add to `.env.local`:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Optional: Customize sign-in/sign-up URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/game
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/game
```

### Step 4: Install Clerk

```bash
pnpm add @clerk/nextjs
```

### Step 5: Add Clerk Provider

Update `app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Step 6: Add Middleware (Optional but Recommended)

Create `middleware.ts` in root:

```typescript
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/about", "/privacy-policy"],
  ignoredRoutes: ["/api/health"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

---

## Phase 3: Database Client Setup (15 minutes)

### Step 1: Install Neon Client

```bash
pnpm add @neondatabase/serverless
```

### Step 2: Verify Database Client

The file `lib/db.ts` is already created with all necessary functions.

Test the connection:

```typescript
// app/api/test-db/route.ts
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    return Response.json({ success: true, time: result[0].current_time });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

Visit: `http://localhost:3000/api/test-db`

---

## Phase 4: Update Authentication Components (1 hour)

### Step 1: Remove Old Auth Store

Delete or comment out:
- `stores/authStore.ts` (old Supabase auth)
- `lib/supabase.ts` (Supabase client)

### Step 2: Update Auth Button Component

Replace `components/auth-button.tsx`:

```typescript
'use client';

import { UserButton, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';

export function AuthButton() {
  const { isSignedIn, user } = useUser();

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-amber-200 font-medieval">
          {user.username || user.firstName}
        </span>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-10 h-10 border-2 border-amber-500"
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <SignInButton mode="modal">
        <button className="btn-medieval px-4 py-2 bg-amber-700 hover:bg-amber-600 rounded">
          Login
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="btn-medieval px-4 py-2 bg-green-700 hover:bg-green-600 rounded">
          Sign Up
        </button>
      </SignUpButton>
    </div>
  );
}
```

### Step 3: Update Game Components

Replace Supabase auth checks with Clerk:

```typescript
// ❌ OLD (Supabase)
import { useAuthStore } from '@/stores/authStore';
const user = useAuthStore(state => state.user);

// ✅ NEW (Clerk)
import { useUser } from '@clerk/nextjs';
const { user, isSignedIn } = useUser();
```

### Step 4: Sync Clerk Users to Database

Create webhook handler to sync Clerk users to your database.

Create `app/api/webhooks/clerk/route.ts`:

```typescript
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { upsertPlayer } from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set');
  }

  // Get headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  // Handle events
  const { type, data } = evt;

  if (type === 'user.created' || type === 'user.updated') {
    await upsertPlayer({
      id: data.id,
      username: data.username || data.email_addresses[0].email_address.split('@')[0],
      displayName: data.first_name || data.username,
      avatarUrl: data.image_url,
      isGuest: false,
    });
  }

  return new Response('', { status: 200 });
}
```

**Configure webhook in Clerk:**
1. Clerk Dashboard → **Webhooks** → **Add Endpoint**
2. URL: `https://yourdomain.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`
4. Copy **Signing Secret** and add to `.env.local`:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Step 5: Install Svix for Webhooks

```bash
pnpm add svix
```

---

## Phase 5: Update Colyseus Integration (30 minutes)

### Step 1: Update useColyseus Hook

Update `hooks/useColyseus.ts` to use Clerk:

```typescript
import { useUser } from '@clerk/nextjs';
import { upsertPlayer } from '@/lib/db';

export function useColyseus(options: {
  roomId?: string;
  autoConnect?: boolean;
}) {
  const { user } = useUser();

  // ... existing code ...

  useEffect(() => {
    if (user) {
      // Sync user to database when they connect
      upsertPlayer({
        id: user.id,
        username: user.username || user.emailAddresses[0].emailAddress.split('@')[0],
        displayName: user.firstName || user.username,
        avatarUrl: user.imageUrl,
      });
    }
  }, [user]);

  // Use Clerk user ID for Colyseus
  const userId = user?.id || `guest_${Date.now()}`;
  const userName = user?.username || 'Guest Player';

  // ... rest of hook ...
}
```

### Step 2: Update Game Room Component

When creating a game, save it to database:

```typescript
import { createGame } from '@/lib/db';

// After Colyseus room is created
const room = await colyseusClient.joinOrCreateRoom(userId, userName);

// Save to database
await createGame({
  colyseusRoomId: room.id,
  gameMode: 'classic',
  playerNorthId: players[0].id,
  playerSouthId: players[1].id,
  playerEastId: players[2].id,
  playerWestId: players[3].id,
});
```

### Step 3: Update Game Completion

In Colyseus server, when game ends:

```typescript
// server/rooms/GameRoom.ts
import { completeGame, checkAchievements } from '../../lib/db';

async onGameEnd() {
  // ... existing game end logic ...

  // Save to database
  await completeGame({
    colyseusRoomId: this.roomId,
    winningTeam: this.state.winningTeam,
    royalsTricks: this.state.royalsTricks,
    rebelsTricks: this.state.rebelsTricks,
    trumpSuit: this.state.trumpSuit,
    highestBid: this.state.highestBid,
    biddingTeam: this.state.biddingTeam,
    durationSeconds: Math.floor((Date.now() - this.gameStartTime) / 1000),
  });

  // Check achievements for all players
  for (const player of this.state.players.values()) {
    await checkAchievements(player.id);
  }
}
```

---

## Phase 6: Remove Supabase (15 minutes)

### Step 1: Remove Supabase Packages

```bash
pnpm remove @supabase/supabase-js @supabase/ssr
```

### Step 2: Delete Supabase Files

```bash
rm -rf lib/supabase/
rm stores/authStore.ts
```

### Step 3: Remove Supabase Env Variables

Delete from `.env.local`:
```env
# Remove these
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Step 4: Search and Replace

Find any remaining Supabase references:
```bash
grep -r "supabase" app/ components/ lib/ --include="*.ts" --include="*.tsx"
```

Replace with appropriate Clerk or Neon code.

---

## Phase 7: Test Everything (30 minutes)

### Test Checklist

- [ ] **Auth Flow**
  - [ ] Sign up with email works
  - [ ] Sign in with email works
  - [ ] Discord OAuth works (if enabled)
  - [ ] Guest mode works
  - [ ] User syncs to database
  - [ ] User profile loads

- [ ] **Database**
  - [ ] Player created in database on first login
  - [ ] Game created when Colyseus room starts
  - [ ] Game completed correctly
  - [ ] Stats update after game
  - [ ] Leaderboard shows data

- [ ] **Colyseus Integration**
  - [ ] Can create game room
  - [ ] Players join successfully
  - [ ] Game plays normally
  - [ ] Game saves to database on completion

- [ ] **Achievements**
  - [ ] First win achievement unlocks
  - [ ] Achievements visible in profile

---

## Final Environment Variables

Your complete `.env.local` should look like:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Neon Database
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Colyseus Game Server
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
COLYSEUS_PORT=2567
```

---

## Rollback Plan (Just in Case)

If something goes wrong, you can temporarily rollback:

1. **Re-install Supabase:**
   ```bash
   pnpm add @supabase/supabase-js @supabase/ssr
   ```

2. **Restore env variables** from backup

3. **Revert git commits:**
   ```bash
   git log --oneline  # Find commit before migration
   git revert <commit-hash>
   ```

---

## Cost Comparison

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Supabase** | 500MB DB, 2GB bandwidth, 50k MAU | $25/mo |
| **Neon** | 0.5GB storage, 3GB compute/month | $19/mo (Pro) |
| **Clerk** | 10,000 MAU | $25/mo (Pro) |
| **Total** | Better free tier | $44/mo vs $25/mo |

**Why it's worth it:**
- Better developer experience
- Each tool best-in-class
- More flexibility
- Better scaling options
- Clerk's auth UX is superior
- Neon's performance is better

---

## Troubleshooting

### Issue: Clerk webhook not working

**Solution:**
- Check CLERK_WEBHOOK_SECRET is correct
- Verify webhook endpoint is public (not behind auth middleware)
- Check webhook logs in Clerk dashboard

### Issue: Database connection fails

**Solution:**
- Verify DATABASE_URL has `?sslmode=require`
- Check IP allowlist in Neon dashboard (should allow all IPs)
- Test connection with psql

### Issue: Users not syncing to database

**Solution:**
- Check webhook is configured
- Manually sync existing users with:
  ```typescript
  // One-time migration script
  import { clerkClient } from '@clerk/nextjs';
  import { upsertPlayer } from '@/lib/db';

  const users = await clerkClient.users.getUserList();
  for (const user of users) {
    await upsertPlayer({
      id: user.id,
      username: user.username || user.emailAddresses[0].emailAddress,
      displayName: user.firstName,
      avatarUrl: user.imageUrl,
    });
  }
  ```

---

## Next Steps After Migration

1. **Customize Clerk theme** to match medieval UI
2. **Set up development webhook** using ngrok or similar
3. **Add profile page** showing user stats
4. **Implement leaderboard UI**
5. **Add achievements display**
6. **Set up automated backups** in Neon
7. **Configure production webhooks**

---

## Need Help?

- **Clerk Docs**: https://clerk.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Clerk Discord**: https://clerk.com/discord
- **Neon Discord**: https://discord.gg/neon

---

**Migration Status**: Ready to execute ✅

Estimated total time: **2-3 hours**
