import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { listGHLContacts, findOrCreateGHLProperty, associateContactWithProperty } from '@/lib/ghl/client';
import type { GHLCredentials } from '@/lib/ghl/credentials';
import { getBackfillPropertiesDone, setBackfillPropertiesDone } from '@/lib/kv';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function buildAddressFromContact(contact: any): string {
  const parts = [
    contact.address1 ?? contact.address ?? '',
    contact.city ?? '',
    contact.state ?? '',
    contact.postalCode ?? contact.postal_code ?? '',
  ].filter((p) => p != null && String(p).trim() !== '');
  return parts.map((p) => String(p).trim()).join(', ').replace(/\s+/g, ' ').trim();
}

/**
 * POST /api/dashboard/backfill-ghl-properties
 * One-time backfill for this account/location: for each GHL contact with an address,
 * create a Property (if missing) and associate. Once run, never runs again for this location.
 * Query: dryRun=true to only count (does not set the "done" flag).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Location ID required', contactsProcessed: 0, associationsCreated: 0 },
        { status: 400 }
      );
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json(
        { error: ctx.reason ?? 'Connect this location first', contactsProcessed: 0, associationsCreated: 0 },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true' || searchParams.get('dryRun') === '1';

    if (!dryRun) {
      const alreadyDone = await getBackfillPropertiesDone(ctx.locationId);
      if (alreadyDone) {
        return NextResponse.json({ ok: true, alreadyDone: true, message: 'Backfill already completed for this location.' });
      }
    }

    const credentials: GHLCredentials = { token: ctx.token, locationId: ctx.locationId };
    const { contacts, total } = await listGHLContacts(ctx.locationId, { limit: 1000 }, credentials);

    let contactsProcessed = 0;
    let associationsCreated = 0;
    const errors: Array<{ contactId: string; message: string }> = [];

    for (const contact of contacts) {
      const contactId = contact.id ?? contact._id;
      if (!contactId) continue;

      const address = buildAddressFromContact(contact);
      if (!address) continue;

      contactsProcessed++;

      if (dryRun) continue;

      try {
        const propertyId = await findOrCreateGHLProperty(
          ctx.locationId,
          { address },
          ctx.token
        );
        if (propertyId) {
          await associateContactWithProperty(contactId, propertyId, ctx.locationId, ctx.token);
          associationsCreated++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ contactId, message });
      }
    }

    if (!dryRun) {
      await setBackfillPropertiesDone(ctx.locationId);
    }

    return NextResponse.json({
      ok: true,
      alreadyDone: false,
      contactsProcessed,
      totalContacts: total,
      associationsCreated: dryRun ? undefined : associationsCreated,
      dryRun,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
    });
  } catch (err) {
    console.error('Backfill GHL properties failed:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Backfill failed',
        contactsProcessed: 0,
        associationsCreated: 0,
      },
      { status: 500 }
    );
  }
}
