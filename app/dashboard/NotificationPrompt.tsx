"use client";

import * as React from "react";
import { SORTS, titleCase } from "@/lib/helpers";

export default function NotificationPrompt() {
    const [isStandalone, setIsStandalone] = React.useState(false);
    const [supported, setSupported] = React.useState(false);
    const [permission, setPermission] =
        React.useState<NotificationPermission | null>(null);
    const [subscription, setSubscription] =
        React.useState<PushSubscription | null>(null);
    const [subscribedSorts, setSubscribedSorts] = React.useState<Set<string>>(
        new Set(),
    );
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);

    // user's own sort is passed via data attribute on a hidden element,
    // but we can read it from the subscription state instead
    const [userSort, setUserSort] = React.useState<string>("");

    React.useEffect(() => {
        const standalone =
            ("standalone" in navigator &&
                (navigator as { standalone?: boolean }).standalone === true) ||
            window.matchMedia("(display-mode: standalone)").matches;
        setIsStandalone(standalone);

        if (!standalone) {
            setLoading(false);
            return;
        }
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            setLoading(false);
            return;
        }

        setSupported(true);
        setPermission(Notification.permission);

        navigator.serviceWorker.register("/sw.js").then(async () => {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            setSubscription(sub);

            if (sub) {
                // Fetch which sorts this device is subscribed to
                const res = await fetch(
                    `/api/subscriptions?endpoint=${encodeURIComponent(sub.endpoint)}`,
                );
                const data = await res.json();
                setSubscribedSorts(new Set(data.sorts ?? []));
            }
            setLoading(false);
        });
    }, []);

    // Read user's sort from a hidden element rendered server-side
    React.useEffect(() => {
        const el = document.getElementById("user-sort-data");
        if (el) setUserSort(el.dataset.sort ?? "");
    }, []);

    async function enable() {
        setSaving(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== "granted") return;

            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey:
                        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                });
            }
            setSubscription(sub);

            // Default: subscribe to user's own sort only
            const defaultSorts = userSort ? [userSort] : [];
            await saveSorts(sub, defaultSorts);
            setSubscribedSorts(new Set(defaultSorts));
            setExpanded(true); // show sort picker after enabling
        } finally {
            setSaving(false);
        }
    }

    async function saveSorts(sub: PushSubscription, sorts: string[]) {
        await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...sub.toJSON(), sorts }),
        });
    }

    async function toggleSort(sort: string) {
        if (!subscription) return;
        setSaving(true);
        try {
            const next = new Set(subscribedSorts);
            if (next.has(sort)) {
                next.delete(sort);
            } else {
                next.add(sort);
            }
            await saveSorts(subscription, Array.from(next));
            setSubscribedSorts(next);
        } finally {
            setSaving(false);
        }
    }

    async function disable() {
        if (!subscription) return;
        setSaving(true);
        try {
            await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...subscription.toJSON(), sorts: [] }),
            });
            await subscription.unsubscribe();
            setSubscription(null);
            setSubscribedSorts(new Set());
            setExpanded(false);
        } finally {
            setSaving(false);
        }
    }

    if (!isStandalone || !supported || loading) return null;

    if (permission === "denied") {
        return (
            <p className='text-xs text-muted-foreground mb-4'>
                Notifications blocked — enable them in Settings → [App Name] →
                Notifications.
            </p>
        );
    }

    if (!subscription || subscribedSorts.size === 0) {
        return (
            <button
                onClick={enable}
                disabled={saving}
                className='mb-4 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50'>
                {saving ? "Enabling..." : "Enable push notifications"}
            </button>
        );
    }

    return (
        <div className='mb-4 space-y-2'>
            <div className='flex items-center gap-3'>
                <span className='text-xs text-green-600 font-medium'>
                    ✓ Notifications on
                </span>
                <button
                    onClick={() => setExpanded(v => !v)}
                    className='text-xs text-muted-foreground underline'>
                    {expanded ? "Hide" : "Manage sorts"}
                </button>
                <button
                    onClick={disable}
                    disabled={saving}
                    className='text-xs text-muted-foreground underline disabled:opacity-50'>
                    {saving ? "..." : "Turn off"}
                </button>
            </div>

            {expanded ? (
                <div className='rounded-lg border border-input p-3 space-y-2'>
                    <p className='text-xs text-muted-foreground font-medium'>
                        Notify me when start times are posted for:
                    </p>
                    <div className='grid grid-cols-2 gap-1.5'>
                        {SORTS.map(sort => (
                            <label
                                key={sort}
                                className='flex items-center gap-2 text-sm cursor-pointer'>
                                <input
                                    type='checkbox'
                                    checked={subscribedSorts.has(sort)}
                                    onChange={() => toggleSort(sort)}
                                    disabled={saving}
                                    className='h-4 w-4'
                                />
                                {titleCase(sort)}
                                {sort === userSort ? (
                                    <span className='text-xs text-muted-foreground'>
                                        (yours)
                                    </span>
                                ) : null}
                            </label>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
