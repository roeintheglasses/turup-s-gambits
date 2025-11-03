'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { upsertPlayer } from '@/lib/db';

/**
 * Sync current Clerk user to database
 * Call this when user first interacts with the game
 */
export async function syncCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const user = await currentUser();

  if (!user) {
    throw new Error('User not found');
  }

  try {
    await upsertPlayer({
      id: user.id,
      username: user.username || user.emailAddresses[0].emailAddress.split('@')[0],
      displayName: user.firstName || user.username || undefined,
      avatarUrl: user.imageUrl || undefined,
      isGuest: false,
    });

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Failed to sync user:', error);
    throw error;
  }
}
