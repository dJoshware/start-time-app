export async function sendPush(
    sort: string,
    area: string,
    title: string,
    body: string,
    url = '/dashboard',
) {
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`;
    const secret = process.env.PUSH_SECRET;

    await fetch(fnUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ sort, area, title, body, url }),
    }).catch(err => console.error('Push failed:', err));
}
