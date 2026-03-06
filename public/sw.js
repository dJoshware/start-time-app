self.addEventListener('push', event => {
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title ?? 'Start Time App', {
            body: data.body ?? '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: { url: data.url ?? '/dashboard' },
        }),
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            const url = event.notification.data?.url ?? '/dashboard';
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client)
                    return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        }),
    );
});
