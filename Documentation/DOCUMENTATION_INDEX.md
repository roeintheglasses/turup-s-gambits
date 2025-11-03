# Documentation Index

This file provides an overview of all available documentation for Turup's Gambit.

## 🚀 Start Here

If you're new to the codebase or need to understand the recent Colyseus migration:

1. **[COLYSEUS_MIGRATION.md](./COLYSEUS_MIGRATION.md)** - Complete migration guide
   - Architecture changes
   - How to use the new system
   - Step-by-step migration instructions
   - Examples and code patterns

2. **[MIGRATION_COMPLETE.md](../MIGRATION_COMPLETE.md)** - Migration summary
   - What was accomplished
   - Statistics and comparisons
   - Quick reference

## 📚 Current Documentation

### Core Architecture

- **[COLYSEUS_MIGRATION.md](./COLYSEUS_MIGRATION.md)** ⭐ START HERE
  - New Colyseus-based architecture
  - How game logic works now
  - Client integration examples
  - Migration patterns

- **[GAME_RULES_REFERENCE.md](./GAME_RULES_REFERENCE.md)**
  - Classic Mode rules
  - Card rankings
  - Game phases
  - Win conditions

- **[REBUILD_SUMMARY.md](./REBUILD_SUMMARY.md)**
  - Detailed rebuild overview
  - What was accomplished
  - Next steps for UI integration
  - Success criteria

- **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)**
  - What code was removed (~4,650 lines)
  - Why it was removed
  - Files deleted
  - Migration status

### Game Design

- **[PRD.md](./PRD.md)**
  - Product requirements
  - Feature specifications
  - User stories

- **[FLOW.md](./FLOW.md)**
  - Classic Mode game flow
  - Phase descriptions
  - Player actions
  - ⚠️ Note: References old architecture, see Colyseus docs for implementation

### Database

- **[../database/README.md](../database/README.md)** ⭐ NEW DATABASE SETUP
  - Neon + Clerk architecture
  - Complete schema and utilities
  - Migration from Supabase
  - 30+ pre-built functions

- **[DATABASE.md](./DATABASE.md)** ⚠️ DEPRECATED
  - Old Supabase setup
  - Being replaced by Neon + Clerk
  - See above for new setup

## 🗂️ Documentation Structure

```
Documentation/
├── COLYSEUS_MIGRATION.md      ⭐ Main migration guide
├── GAME_RULES_REFERENCE.md    📖 Game rules
├── REBUILD_SUMMARY.md         📊 Rebuild overview
├── CLEANUP_SUMMARY.md         🗑️ Cleanup details
├── PRD.md                     📋 Product requirements
├── FLOW.md                    🎮 Game flow
├── DATABASE.md                💾 Database setup (deprecated)
└── DOCUMENTATION_INDEX.md     📑 This file

database/                       ⭐ NEW DATABASE SETUP
├── README.md                  📖 Quick start & overview
├── schema.sql                 🗃️ Complete PostgreSQL schema
├── types.ts                   📘 TypeScript definitions
└── MIGRATION_GUIDE.md         🔄 Step-by-step migration

Root:
├── MIGRATION_COMPLETE.md      ✅ Colyseus migration summary
├── CLAUDE.md                  🤖 Claude Code guide
└── README.md                  📖 Project README

lib/
└── db.ts                      🔧 Database client (30+ functions)
```

## 📝 Documentation Changes (2025-10-28)

### Removed (Outdated)
The following documents were removed as they described the old Supabase Realtime implementation:

- ❌ `REALTIME_IMPLEMENTATION.md` (~16KB)
- ❌ `REALTIME_REFACTORING_UPDATE.md` (~7.6KB)
- ❌ `SUPABASE_REALTIME_TRUMP_VOTING.md` (~13.8KB)
- ❌ `SUPABASE_TROUBLESHOOTING.md` (~11.2KB)
- ❌ `MIGRATION.md` (Prisma migration, ~5.5KB)
- ❌ `AUTHENTICATION_FIX_SUMMARY.md` (~4.9KB)
- ❌ `OPTIMIZATION_SUMMARY.md` (~8KB)
- ❌ `GAME_SYNC_SUMMARY.md` (~26.8KB)
- ❌ `FRENZY_MODE.md` (~10.7KB)
- ❌ `RESTORING_AUTH.md` (~1.9KB)
- ❌ `DOCUMENTATION.md` (~12.3KB)

**Total Removed**: 11 files, ~119KB of outdated documentation

### Added (New)
- ✅ `COLYSEUS_MIGRATION.md` - Complete migration guide
- ✅ `GAME_RULES_REFERENCE.md` - Clean rules reference
- ✅ `REBUILD_SUMMARY.md` - Rebuild overview
- ✅ `CLEANUP_SUMMARY.md` - Cleanup documentation
- ✅ `DOCUMENTATION_INDEX.md` - This file
- ✅ Updated `CLAUDE.md` - New architecture overview
- ✅ Updated `FLOW.md` - Added Colyseus notes
- ✅ Updated `DATABASE.md` - Clarified Supabase role

## 🎯 Quick Links by Task

### I want to...

**...understand the new architecture**
→ Read [`COLYSEUS_MIGRATION.md`](./COLYSEUS_MIGRATION.md)

**...update a UI component**
→ See the "Usage Example" section in [`COLYSEUS_MIGRATION.md`](./COLYSEUS_MIGRATION.md)

**...understand game rules**
→ Read [`GAME_RULES_REFERENCE.md`](./GAME_RULES_REFERENCE.md)

**...see what was removed**
→ Read [`CLEANUP_SUMMARY.md`](./CLEANUP_SUMMARY.md)

**...check migration status**
→ Read [`REBUILD_SUMMARY.md`](./REBUILD_SUMMARY.md)

**...set up the database (NEW!)**
→ Read [`../database/README.md`](../database/README.md)

**...migrate from Supabase**
→ Read [`../database/MIGRATION_GUIDE.md`](../database/MIGRATION_GUIDE.md)

**...understand the overall change**
→ Read [`../MIGRATION_COMPLETE.md`](../MIGRATION_COMPLETE.md)

## 🔧 Technical Reference

### Server (Game Logic)
- **Location**: `server/rooms/GameRoom.ts`
- **Documentation**: [`COLYSEUS_MIGRATION.md`](./COLYSEUS_MIGRATION.md) → "How Game Flow Works Now"

### Client (Integration)
- **Location**: `hooks/useColyseus.ts`
- **Documentation**: [`COLYSEUS_MIGRATION.md`](./COLYSEUS_MIGRATION.md) → "Usage Example"

### Database (Supabase)
- **Use Case**: Auth, profiles, game history (NOT real-time gameplay)
- **Documentation**: [`DATABASE.md`](./DATABASE.md)

## 📊 Documentation Statistics

### Before Cleanup
- **Files**: 20 documents
- **Size**: ~191KB
- **Outdated**: 11 files (57%)

### After Cleanup
- **Files**: 9 documents
- **Size**: ~72KB
- **Current**: 100%
- **Reduction**: 62% smaller, 100% relevant

## ❓ FAQ

**Q: Where's the realtime documentation?**
A: The old Supabase Realtime system was replaced by Colyseus. See [`COLYSEUS_MIGRATION.md`](./COLYSEUS_MIGRATION.md).

**Q: Where's Frenzy Mode documentation?**
A: Frenzy Mode is planned for future implementation. Currently focusing on Classic Mode only.

**Q: Can I see the old docs?**
A: Check git history if needed, but old implementation is obsolete and had security issues.

**Q: How do I contribute to docs?**
A: Update the relevant `.md` file. Keep docs in sync with code changes.

## 🎓 Learning Path

For new developers, recommended reading order:

1. `../README.md` - Project overview
2. `COLYSEUS_MIGRATION.md` - Architecture and patterns
3. `GAME_RULES_REFERENCE.md` - Game mechanics
4. `../CLAUDE.md` - Development guidelines
5. `FLOW.md` - Detailed game flow
6. `DATABASE.md` - Database setup (if needed)

---

**Last Updated**: 2025-10-28
**Documentation Version**: 2.0 (Colyseus)
**Status**: ✅ Complete and current
