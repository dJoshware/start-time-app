export async function sendPush(
    sort: string,
    area: string,
    title: string,
    body: string,
    url = '/dashboard',
) {
    const secret = process.env.PUSH_SECRET;

    await fetch(`${process.env.VAPID_SUBJECT}/api/send-push`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ sort, area, title, body, url }),
    }).catch(err => console.error('Push failed:', err));
}
