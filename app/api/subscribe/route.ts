import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
    const user = await getSessionUser();
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint, keys, sorts } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json(
            { error: 'Invalid subscription' },
            { status: 400 },
        );
    }

    // sorts is an array of sort strings to subscribe to
    // defaults to just the user's own sort if not provided
    const targetSorts: string[] =
        Array.isArray(sorts) && sorts.length > 0 ? sorts : [user.sort];

    // Delete existing subscriptions for this endpoint to handle unsubscribes
    await sql`
        DELETE FROM push_subscriptions
        WHERE employee_id = ${user.employee_id} AND endpoint = ${endpoint}
    `;

    // Insert one row per sort
    for (const sort of targetSorts) {
        await sql`
            INSERT INTO push_subscriptions (employee_id, sort, area, location_id, endpoint, p256dh, auth)
            VALUES (${user.employee_id}, ${sort}, ${user.area}, ${user.location_id}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
            ON CONFLICT (employee_id, endpoint, sort) DO UPDATE
                SET p256dh = excluded.p256dh,
                    auth = excluded.auth,
                    location_id = excluded.location_id,
                    updated_at = now()
        `;
    }

    return NextResponse.json({ ok: true });
}
