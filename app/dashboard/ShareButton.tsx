"use client";

import * as React from "react";

const APP_URL = "https://start-time-app.vercel.app/dashboard";

export default function ShareButton() {
    const [showQR, setShowQR] = React.useState(false);

    async function handleShare() {
        if (navigator.share) {
            await navigator
                .share({
                    title: "Start Time App",
                    text: "Check your UPS sort start times here:",
                    url: APP_URL,
                })
                .catch(() => {}); // user cancelled, no-op
        } else {
            // Fallback: show QR code modal
            setShowQR(true);
        }
    }

    return (
        <>
            <button
                onClick={handleShare}
                className='text-muted-foreground hover:text-foreground transition-colors'
                aria-label='Show QR code'>
                <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='w-5 h-5'>
                    <rect
                        x='3'
                        y='3'
                        width='7'
                        height='7'
                    />
                    <rect
                        x='14'
                        y='3'
                        width='7'
                        height='7'
                    />
                    <rect
                        x='3'
                        y='14'
                        width='7'
                        height='7'
                    />
                    <rect
                        x='14'
                        y='14'
                        width='3'
                        height='3'
                    />
                </svg>
            </button>

            {showQR ? (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
                    onClick={() => setShowQR(false)}>
                    <div
                        className='bg-background rounded-xl p-6 space-y-4 max-w-xs w-full mx-4'
                        onClick={e => e.stopPropagation()}>
                        <div className='flex items-center justify-between'>
                            <h2 className='font-semibold text-base'>
                                Share Start Time App
                            </h2>
                            <button
                                onClick={() => setShowQR(false)}
                                className='text-muted-foreground hover:text-foreground text-xl leading-none'>
                                ×
                            </button>
                        </div>
                        <p className='text-xs text-muted-foreground'>
                            Scan with your phone's camera to open the app.
                        </p>
                        <img
                            src='/qr-code.png'
                            alt='QR code for Start Time App'
                            className='w-full rounded-lg'
                        />
                    </div>
                </div>
            ) : null}
        </>
    );
}
