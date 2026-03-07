"use client";

import * as React from "react";
import { X } from "lucide-react";

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
    if (typeof window === "undefined") return null;
    const ua = navigator.userAgent;

    // If already running as installed PWA, don't show
    const isStandalone =
        ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
        window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return null;

    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isIOSSafari = isIOS && /Version\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const isAndroid = /Android/.test(ua) && /Chrome\//.test(ua) && !/SamsungBrowser/.test(ua);

    if (isIOSSafari) return "ios";
    if (isAndroid) return "android";
    return null;
}

export default function InstallPrompt() {
    const [platform, setPlatform] = React.useState<Platform>(null);
    const [dismissed, setDismissed] = React.useState(false);
    const [deferredPrompt, setDeferredPrompt] = React.useState<Event & {
        prompt: () => void;
        userChoice: Promise<{ outcome: string }>;
    } | null>(null);

    React.useEffect(() => {
        setPlatform(detectPlatform());

        // Android: capture native install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    if (!platform || dismissed) return null;

    if (platform === "ios") {
        return (
            <div className="relative mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute right-2 top-2 text-blue-400 hover:text-blue-600"
                    aria-label="Dismiss">
                    <X size={16} />
                </button>
                <p className="font-semibold mb-1">📲 Install this app</p>
                <p>
                    Tap the{" "}
                    <span className="inline-flex items-center gap-0.5 font-medium">
                        Share{" "}
                        <svg
                            xmlns="https://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="inline w-4 h-4">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                    </span>{" "}
                    button in Safari, then select{" "}
                    <span className="font-medium">Add to Home Screen</span> to
                    get push notifications for start times.
                </p>
            </div>
        );
    }

    if (platform === "android") {
        return (
            <div className="relative mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute right-2 top-2 text-green-400 hover:text-green-600"
                    aria-label="Dismiss">
                    <X size={16} />
                </button>
                <p className="font-semibold mb-2">📲 Install this app</p>
            {deferredPrompt ? (
                <button
                    onClick={async () => {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === "accepted") setDismissed(true);
                        setDeferredPrompt(null);
                    }}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-white font-medium hover:bg-green-700">
                    Add to Home Screen
                </button>
            ) : (
                <p>
                    Tap the{" "}
                    <span className="font-medium">⋮ menu</span> in Chrome,
                    then select{" "}
                    <span className="font-medium">"Add to Home Screen"</span>{" "}
                    to get push notifications for start times.
                </p>
            )}
            </div>
        );
    }

    return null;
}
