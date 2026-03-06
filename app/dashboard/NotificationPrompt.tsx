"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function NotificationPrompt() {
    const [state, setState] = React.useState<
        "idle" | "granted" | "denied" | "unsupported"
    >("idle");

    React.useEffect(() => {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            setState("unsupported");
            return;
        }
        if (Notification.permission === "denied") {
            setState("denied");
            return;
        }
        if (Notification.permission === "granted") {
            // Check if an active push subscription actually exists
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setState("granted"); // subscription exists, hide button
                    } else {
                        setState("idle"); // permission granted but no subscription, show button
                    }
                });
            });
            return;
        }
        // permission is 'default'
        setState("idle");
    }, []);

    async function subscribe() {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub.toJSON()),
        });
        setState("granted");
    }

    React.useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js");
        }
    }, []);

    if (state === "granted" || state === "unsupported") return null;

    if (state === "denied")
        return (
            <p className='text-xs text-muted-foreground mb-4'>
                Notifications blocked — enable them in your browser settings to
                get start time alerts.
            </p>
        );

    return (
        <Button
            variant='outline'
            size='sm'
            className='mb-4'
            onClick={subscribe}>
            Enable push notifications
        </Button>
    );
}
