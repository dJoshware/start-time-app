import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { LocationConfig } from '@/lib/helpers';

export async function GET() {
    const locations = await sql<
        {
            id: number;
            name: string;
            lat: number | null;
            lng: number | null;
            config: LocationConfig;
        }[]
    >`
        select id, name, lat, lng, config
        from locations
        where active = true
        order by name asc
    `;

    return NextResponse.json({ locations });
}
