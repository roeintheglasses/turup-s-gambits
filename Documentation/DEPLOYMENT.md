# Deployment Guide

This guide walks you through deploying Turup's Gambit with:
- **Colyseus Game Server** on Railway
- **Next.js Frontend** on Vercel
- **Supabase** for authentication and user data

## Architecture Overview

```
┌─────────────┐         WebSocket          ┌──────────────────┐
│             │ ◄────────────────────────► │   Railway        │
│   Browser   │                             │   (Colyseus)     │
│             │         HTTPS               │   Port 2567      │
└─────────────┘ ◄────────────────────────► └──────────────────┘
       │
       │ HTTPS (Static Assets, API Routes)
       ▼
┌─────────────────────────────────────────┐
│            Vercel (Next.js)             │
│         Frontend + API Routes           │
└─────────────────────────────────────────┘
       │
       │ HTTPS (Auth, User Data)
       ▼
┌─────────────────────────────────────────┐
│           Supabase Cloud                │
│    (PostgreSQL + Auth + Storage)        │
└─────────────────────────────────────────┘
```

## Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **Vercel Account**: Sign up at https://vercel.com
3. **Supabase Account**: Sign up at https://supabase.com
4. **Git Repository**: Push your code to GitHub/GitLab/Bitbucket

---

## Part 1: Deploy Colyseus Server to Railway

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will detect your `railway.toml` configuration

### Step 2: Configure Environment Variables

In Railway dashboard, add these environment variables:

```env
# Port (Railway provides this automatically)
PORT=2567

# Node Environment
NODE_ENV=production

# Optional: Supabase (if you want server-side stats tracking)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: Railway automatically provides `PORT` variable. The server will use it.

### Step 3: Deploy

1. Railway will automatically build and deploy
2. Once deployed, you'll get a URL like: `your-app.railway.app`
3. **Note down this URL** - you'll need it for the frontend

### Step 4: Verify WebSocket Connection

Your Colyseus server will be available at:
- **HTTP**: `https://your-app.railway.app`
- **WebSocket**: `wss://your-app.railway.app`

Test it by visiting the HTTP URL - you should see the Colyseus monitor or a response.

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Project

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will detect Next.js automatically

### Step 2: Configure Environment Variables

In Vercel dashboard, add these environment variables:

```env
# Colyseus Game Server (from Railway)
NEXT_PUBLIC_COLYSEUS_URL=wss://your-app.railway.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Critical**: Use `wss://` (not `ws://`) for the Colyseus URL in production!

### Step 3: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your Next.js app
3. You'll get a URL like: `your-app.vercel.app`

### Step 4: Test the Connection

1. Visit your Vercel URL
2. Sign up/login
3. Create a game
4. Verify WebSocket connection works

---

## Part 3: Configure Supabase

### Step 1: Set Up Database

Your database should already be configured if you've been developing locally. If not:

1. Go to Supabase dashboard
2. SQL Editor
3. Run the schema from `Documentation/DATABASE.md`

### Step 2: Configure Authentication

1. **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure redirect URLs:
   - Development: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`

### Step 3: Configure Storage (Optional)

If you plan to add avatars or game replays:

1. **Storage** → **New Bucket**
2. Create buckets: `avatars`, `replays`
3. Set up storage policies

---

## Environment Variables Reference

### Railway (Colyseus Server)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | ✅ | Provided by Railway automatically |
| `NODE_ENV` | ✅ | Set to `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | For server-side stats |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | For server-side stats |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | For server-side stats |

### Vercel (Next.js Frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_COLYSEUS_URL` | ✅ | WSS URL from Railway (e.g., `wss://your-app.railway.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |

---

## Deployment Checklist

### Before Deploying

- [ ] Push all code to Git repository
- [ ] Verify local development works with `pnpm dev:all`
- [ ] Update CORS settings if needed
- [ ] Review and test all game functionality locally

### Railway Deployment

- [ ] Create Railway project
- [ ] Configure environment variables
- [ ] Deploy and verify build succeeds
- [ ] Test WebSocket endpoint (`wss://...`)
- [ ] Check server logs for errors

### Vercel Deployment

- [ ] Create Vercel project
- [ ] Configure environment variables (especially `NEXT_PUBLIC_COLYSEUS_URL`)
- [ ] Deploy and verify build succeeds
- [ ] Test the deployed site
- [ ] Verify WebSocket connection to Railway

### Supabase Configuration

- [ ] Database schema is up to date
- [ ] Authentication providers configured
- [ ] Redirect URLs updated for production
- [ ] Storage policies configured (if needed)

### Post-Deployment Testing

- [ ] Create account
- [ ] Create game room
- [ ] Add bots
- [ ] Play a full game
- [ ] Verify all phases work correctly
- [ ] Test reconnection (close/reopen browser tab)
- [ ] Check browser console for errors
- [ ] Monitor Railway logs for server errors

---

## Monitoring and Debugging

### Railway Logs

View real-time logs in Railway dashboard:
```
🎮 Colyseus Game Server is running on port 2567
📡 WebSocket endpoint: ws://localhost:2567
```

### Vercel Logs

View function logs in Vercel dashboard:
- **Functions** tab shows API route logs
- **Deployments** tab shows build logs

### Supabase Logs

- **Logs Explorer**: Real-time database queries
- **API Logs**: Authentication and API usage

### Common Issues

**1. WebSocket Connection Fails**
- ✅ Verify `NEXT_PUBLIC_COLYSEUS_URL` uses `wss://` (not `ws://`)
- ✅ Check Railway server is running
- ✅ Test direct connection to Railway URL

**2. Authentication Fails**
- ✅ Verify Supabase environment variables
- ✅ Check redirect URLs in Supabase dashboard
- ✅ Ensure anon key is correct

**3. Game State Not Syncing**
- ✅ Check browser console for WebSocket errors
- ✅ Check Railway logs for server errors
- ✅ Verify Colyseus server version matches client version

**4. Build Fails on Railway**
- ✅ Verify `railway.toml` exists
- ✅ Check `package.json` has correct scripts
- ✅ Ensure all dependencies are in `dependencies` (not `devDependencies`)

**5. Build Fails on Vercel**
- ✅ Check Next.js version compatibility
- ✅ Verify all environment variables are set
- ✅ Check build logs for specific errors

---

## Scaling Considerations

### Railway Scaling

**Single Server** (Current Setup):
- Good for up to 50-100 concurrent players
- Simple setup, no additional configuration

**Multiple Servers** (Future):
- Use Colyseus Redis Presence for multi-server setup
- Railway supports horizontal scaling
- Add Redis instance from Railway marketplace

### Vercel Scaling

- Automatic edge network scaling
- No manual configuration needed
- Serverless API routes scale automatically

### Supabase Scaling

- Free tier: Good for development and small apps
- Pro tier: Production-ready with better limits
- Database connection pooling handled automatically

---

## Cost Estimates

### Railway
- **Free Tier**: $5 credit/month (enough for development)
- **Paid**: ~$5-10/month for small production apps
- **Scaling**: Pay for usage, scales with player count

### Vercel
- **Free Tier**: Perfect for hobby projects
- **Pro**: $20/month (commercial usage, better limits)
- **Bandwidth**: Watch for bandwidth usage with WebSocket traffic

### Supabase
- **Free Tier**: 500MB database, 2GB bandwidth
- **Pro**: $25/month (8GB database, 250GB bandwidth)
- **Pay-as-you-go**: Additional resources as needed

**Total Estimated Cost**:
- **Development**: Free (using free tiers)
- **Small Production**: $10-20/month (Railway + Vercel free)
- **Production**: $30-60/month (Railway + Vercel Pro + Supabase Pro)

---

## Continuous Deployment

### Automatic Deployments

**Railway**:
- Auto-deploys on push to main branch
- Configure in Railway dashboard

**Vercel**:
- Auto-deploys on push to main branch
- Preview deployments for PRs
- Configure in Vercel dashboard

### Manual Deployments

**Railway**:
```bash
# Install Railway CLI
npm install -g railway

# Login
railway login

# Deploy
railway up
```

**Vercel**:
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Security Checklist

- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS/WSS in production
- [ ] Configure Supabase Row Level Security (RLS)
- [ ] Add rate limiting to API routes
- [ ] Review and minimize CORS settings
- [ ] Use secure headers in Next.js config
- [ ] Regular dependency updates
- [ ] Monitor logs for suspicious activity

---

## Support and Resources

### Documentation
- **Colyseus**: https://docs.colyseus.io
- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs

### Project Documentation
- **Game Architecture**: `COLYSEUS_MIGRATION.md`
- **Database Schema**: `DATABASE.md`
- **Game Rules**: `GAME_RULES_REFERENCE.md`
- **Development Guide**: `CLAUDE.md`

---

## Next Steps After Deployment

1. **Monitor Performance**: Watch Railway and Vercel logs
2. **Gather Feedback**: Get users to test the game
3. **Add Analytics**: Consider adding analytics for user tracking
4. **Optimize**: Profile and optimize hot paths
5. **Scale**: Add Redis for multi-server support when needed
6. **Add Features**: Implement leaderboards, achievements, etc.

---

**Congratulations! Your game is now live!** 🎉
