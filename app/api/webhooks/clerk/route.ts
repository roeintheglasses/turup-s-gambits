import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { upsertPlayer } from '@/lib/db';
import type { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set');
  }

  // Get headers
  const headerPayload = await headers();
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
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  // Handle events
  const { type, data } = evt;

  if (type === 'user.created' || type === 'user.updated') {
    try {
      await upsertPlayer({
        id: data.id,
        username: data.username || data.email_addresses[0].email_address.split('@')[0],
        displayName: data.first_name || data.username || undefined,
        avatarUrl: data.image_url || undefined,
        isGuest: false,
      });

      console.log(`✅ User ${type}: ${data.id}`);
    } catch (error) {
      console.error(`Error syncing user ${data.id}:`, error);
      return new Response('Error: Database sync failed', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
