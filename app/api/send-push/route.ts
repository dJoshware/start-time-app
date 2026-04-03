import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { sql } from '@/lib/db';

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(req: NextRequest) {
    const pushSecret = process.env.PUSH_SECRET;
    if (pushSecret) {
        const auth = req.headers.get('authorization') ?? '';
        if (auth !== `Bearer ${pushSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }
    }

    const { sort, area, title, body, url } = await req.json();

    if (!sort || !area || !title) {
        return NextResponse.json(
            { error: 'sort, area, and title are required' },
            { status: 400 },
        );
    }

    const subs = await sql<
        { endpoint: string; p256dh: string; auth: string }[]
    >`
        SELECT endpoint, p256dh, auth
        FROM push_subscriptions
        WHERE lower(trim(sort)) = ${sort.toLowerCase().trim()}
          AND lower(trim(area)) = ${area.toLowerCase().trim()}
    `;

    const payload = JSON.stringify({ title, body, url: url ?? '/dashboard' });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload,
            );
            sent++;
        } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
                expiredEndpoints.push(sub.endpoint);
            } else {
                console.error(
                    'Push failed for endpoint:',
                    sub.endpoint,
                    err?.statusCode,
                    err?.body,
                );
                failed++;
            }
        }
    }

    if (expiredEndpoints.length > 0) {
        await sql`
            DELETE FROM push_subscriptions
            WHERE endpoint = ANY(${expiredEndpoints})
        `;
        console.log('Cleaned up expired endpoints:', expiredEndpoints.length);
    }

    console.log(
        `Push results — sent: ${sent}, failed: ${failed}, expired: ${expiredEndpoints.length}`,
    );

    return NextResponse.json({
        sent,
        failed,
        expired: expiredEndpoints.length,
    });
}
