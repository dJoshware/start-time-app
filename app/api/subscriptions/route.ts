import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
    const user = await getSessionUser();
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const endpoint = req.nextUrl.searchParams.get('endpoint');
    if (!endpoint) return NextResponse.json({ sorts: [] });

    const rows = await sql<{ sort: string }[]>`
        SELECT sort FROM push_subscriptions
        WHERE employee_id = ${user.employee_id}
          AND endpoint = ${endpoint}
    `;

    return NextResponse.json({ sorts: rows.map(r => r.sort) });
}
