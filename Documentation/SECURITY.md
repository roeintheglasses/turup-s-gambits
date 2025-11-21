# Security Guide - Clerk Authentication with Colyseus

This document outlines the security implementation for Turup's Gambit, ensuring authenticated and authorized gameplay.

## Current Security Status

### ✅ Already Secured

1. **Clerk Middleware**: All routes except public paths require authentication
2. **Webhook Verification**: Clerk webhooks use Svix signature verification
3. **Database Sync**: User data is securely synced via authenticated webhooks
4. **Frontend Protection**: Routes are protected with `clerkMiddleware()`

### ⚠️ Security Gap (To Be Addressed)

**Colyseus Game Server**: Currently accepts userId from client without verification

## Security Architecture

```
┌─────────────┐          ┌──────────────┐          ┌──────────────────┐
│   Browser   │          │    Vercel    │          │     Railway      │
│   (Client)  │          │  (Next.js)   │          │   (Colyseus)     │
└──────┬──────┘          └───────┬──────┘          └────────┬─────────┘
       │                         │                           │
       │ 1. Sign in with Clerk   │                           │
       ├────────────────────────>│                           │
       │                         │                           │
       │ 2. Get session token    │                           │
       │<────────────────────────┤                           │
       │                         │                           │
       │ 3. Connect to Colyseus  │                           │
       │    with token           │                           │
       ├─────────────────────────┼──────────────────────────>│
       │                         │                           │
       │                         │  4. Verify token          │
       │                         │<──────────────────────────┤
       │                         │                           │
       │                         │  5. Return user data      │
       │                         │───────────────────────────>│
       │                         │                           │
       │ 6. Join room (authenticated)                        │
       │<────────────────────────┼───────────────────────────┤
```

## Implementation Options

### Option 1: Verify Clerk Token on Colyseus Server (Recommended)

**Pros:**
- Most secure - server verifies authentication
- Prevents userId spoofing
- Full Clerk integration

**Cons:**
- Requires Colyseus server to call Clerk API
- Adds latency to connection (one-time only)

**Implementation:**

#### Client Side (`lib/colyseus/ColyseusClient.ts`):

```typescript
import { useAuth } from '@clerk/nextjs';

// Get Clerk token before connecting
const { getToken } = useAuth();
const token = await getToken();

// Pass token to Colyseus
const room = await client.joinOrCreate("game_room", {
  clerkToken: token,
  userId: user.id,
  userName: user.username
});
```

#### Server Side (`server/rooms/GameRoom.ts`):

```typescript
import { verifyToken } from '@clerk/backend';

async onAuth(client: Client, options: any) {
  const { clerkToken, userId } = options;

  try {
    // Verify Clerk token
    const session = await verifyToken(clerkToken, {
      secretKey: process.env.CLERK_SECRET_KEY!
    });

    // Verify userId matches token
    if (session.sub !== userId) {
      throw new Error("User ID mismatch");
    }

    return {
      userId: session.sub,
      sessionId: session.sid
    };
  } catch (error) {
    throw new Error("Authentication failed");
  }
}
```

### Option 2: Trust Clerk Middleware (Current Implementation)

**Pros:**
- Simple implementation
- Fast connection (no additional verification)
- Middleware already protects frontend

**Cons:**
- Relies on client honesty
- No server-side verification of userId
- Vulnerable if someone bypasses middleware

**Current Implementation:**
- Middleware protects `/game/*` routes
- Only authenticated users can access game pages
- userId is passed from authenticated client

**Risk Assessment:**
- **Low-Medium Risk** for casual gaming
- Users can only impersonate if they:
  1. Are already authenticated with Clerk
  2. Know another user's exact Clerk ID
  3. Modify client-side JavaScript

### Option 3: Hybrid Approach (Best Balance)

Combine both approaches:
1. Trust middleware for game connections (fast)
2. Verify sensitive operations server-side (secure)

**Implementation:**

```typescript
// On connection: Trust middleware
onJoin(client: Client, options: any) {
  // Quick join, assume authenticated
  this.addPlayer(options.userId, options.userName);
}

// On sensitive operations: Verify via API
private async validateSensitiveAction(userId: string) {
  // Call your Next.js API to verify user
  const response = await fetch(`${process.env.FRONTEND_URL}/api/verify-user`, {
    headers: { 'x-user-id': userId }
  });

  if (!response.ok) {
    throw new Error("User verification failed");
  }
}
```

## Recommendations

### For Production:

1. **Implement Option 1** (Full Token Verification)
   - Most secure
   - Industry standard
   - Prevents all impersonation attacks

2. **Add Rate Limiting**
   - Limit connection attempts
   - Prevent DoS attacks

3. **Add Session Management**
   - Track active sessions
   - Detect suspicious behavior
   - Auto-disconnect invalid sessions

4. **Monitor and Log**
   - Log all authentication attempts
   - Alert on suspicious patterns
   - Track failed verifications

### For Development/Staging:

**Option 2** (Current Implementation) is acceptable because:
- Frontend middleware already validates authentication
- WebSocket connections are from trusted clients
- Game has no financial transactions
- User data is not highly sensitive

## Current Security Measures

### 1. Clerk Middleware (`middleware.ts`)

```typescript
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // ✅ Blocks unauthenticated requests
  }
});
```

**What it protects:**
- All `/game/*` routes
- All API routes (except webhooks)
- Frontend pages

**What it doesn't protect:**
- Direct WebSocket connections to Railway
- Colyseus server endpoints

### 2. Webhook Verification (`app/api/webhooks/clerk/route.ts`)

```typescript
const wh = new Webhook(WEBHOOK_SECRET);
evt = wh.verify(body, headers); // ✅ Verifies signature
```

**What it protects:**
- User creation/update webhooks
- Database synchronization
- Prevents fake webhook calls

### 3. Database Access

**Protected by:**
- Neon's SSL connections
- Environment variables (not in code)
- Server-side only access

## Security Checklist

### Before Production Launch:

- [ ] Implement Clerk token verification on Colyseus server (Option 1)
- [ ] Add rate limiting to WebSocket connections
- [ ] Set up monitoring and alerting
- [ ] Review and test all authentication flows
- [ ] Add session timeout handling
- [ ] Implement reconnection token system
- [ ] Add CSRF protection to API routes
- [ ] Review and minimize CORS settings
- [ ] Enable Clerk's security features:
  - [ ] Email verification required
  - [ ] Password strength requirements
  - [ ] Two-factor authentication (optional)
- [ ] Set up proper logging:
  - [ ] Authentication attempts
  - [ ] Failed logins
  - [ ] Suspicious activity
- [ ] Environment variables audit:
  - [ ] All secrets in env vars (not code)
  - [ ] Production keys different from development
  - [ ] Webhook secrets rotated

### Testing:

- [ ] Test with expired Clerk tokens
- [ ] Test with invalid userId
- [ ] Test concurrent connections
- [ ] Test reconnection after disconnect
- [ ] Test with revoked user accounts
- [ ] Load test WebSocket connections

## Additional Security Measures

### 1. Rate Limiting

Add to Colyseus server:

```typescript
private connectionAttempts = new Map<string, number>();

onJoin(client: Client, options: any) {
  const userId = options.userId;
  const attempts = this.connectionAttempts.get(userId) || 0;

  if (attempts > 5) {
    throw new Error("Too many connection attempts");
  }

  this.connectionAttempts.set(userId, attempts + 1);
}
```

### 2. Action Validation

Always verify player actions server-side:

```typescript
// ✅ Good: Server validates
handlePlayCard(client: Client, data: { cardId: string }) {
  const player = this.state.players.get(client.sessionId);

  // Verify it's player's turn
  if (this.state.currentTurn !== client.sessionId) {
    throw new Error("Not your turn");
  }

  // Verify card is in hand
  const hasCard = player.hand.some(c => c.id === data.cardId);
  if (!hasCard) {
    throw new Error("Card not in hand");
  }

  // Execute action
  this.playCard(client, data.cardId);
}
```

### 3. Data Access Layer Pattern

**Important Security Pattern (CVE-2025-29927):**

Never trust middleware alone. Always verify authentication at data access:

```typescript
// ❌ Bad: Only middleware protection
export async function getGameData(roomId: string) {
  return await db.query('SELECT * FROM games WHERE id = $1', [roomId]);
}

// ✅ Good: Verify auth at data access
export async function getGameData(userId: string, roomId: string) {
  // Verify user is authenticated
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId || clerkUserId !== userId) {
    throw new Error("Unauthorized");
  }

  return await db.query('SELECT * FROM games WHERE id = $1', [roomId]);
}
```

## Environment Variables Security

### Required Environment Variables:

**Vercel (Frontend):**
```env
NEXT_PUBLIC_COLYSEUS_URL=wss://your-server.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_***
CLERK_SECRET_KEY=sk_***
CLERK_WEBHOOK_SECRET=whsec_***
DATABASE_URL=postgresql://***
```

**Railway (Colyseus):**
```env
PORT=2567
NODE_ENV=production
CLERK_SECRET_KEY=sk_***  # For token verification
FRONTEND_URL=https://your-app.vercel.app  # For CORS
```

**Security Notes:**
- Never commit `.env` files to git
- Use different keys for development and production
- Rotate secrets regularly
- Use Vercel/Railway's secret management
- Never log environment variables

## Monitoring and Alerts

### Metrics to Track:

1. **Authentication Failures**
   - Failed Clerk token verifications
   - Invalid userId attempts
   - Expired token connections

2. **Suspicious Patterns**
   - Multiple connections from same user
   - Rapid connection/disconnection
   - Unusual game actions

3. **Performance**
   - Authentication latency
   - Connection success rate
   - Average session duration

### Recommended Tools:

- **Clerk Dashboard**: Monitor authentication events
- **Railway Logs**: Track server errors and warnings
- **Vercel Analytics**: Monitor frontend performance
- **Sentry** (optional): Error tracking and alerting

## Incident Response

### If Security Issue Detected:

1. **Immediate Actions:**
   - Review Railway and Vercel logs
   - Check Clerk dashboard for unusual activity
   - Temporarily disable affected features if needed

2. **Investigation:**
   - Identify attack vector
   - Assess impact (affected users, data)
   - Document timeline

3. **Remediation:**
   - Patch vulnerability
   - Rotate compromised secrets
   - Deploy fix to production
   - Notify affected users if needed

4. **Prevention:**
   - Update security measures
   - Add monitoring for similar attacks
   - Review and improve security practices

## Contact and Resources

- **Clerk Security**: https://clerk.com/docs/security
- **Colyseus Security**: https://docs.colyseus.io/security
- **OWASP Top 10**: https://owasp.org/www-project-top-ten

---

**Last Updated**: November 2025
**Next Review**: Before production launch
