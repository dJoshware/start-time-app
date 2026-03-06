import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
    const user = await getSessionUser();
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint, keys } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json(
            { error: 'Invalid subscription' },
            { status: 400 },
        );
    }

    await sql`
    INSERT INTO push_subscriptions (employee_id, sort, area, endpoint, p256dh, auth)
    VALUES (${user.employee_id}, ${user.sort}, ${user.area}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (employee_id, endpoint) DO UPDATE
      SET p256dh = excluded.p256dh,
          auth = excluded.auth,
          updated_at = now()
  `;

    return NextResponse.json({ ok: true });
}
