"use client";

import * as React from "react";
import type { LoginState } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginForm({
    action,
}: {
    action: (
        prevState: LoginState | null,
        formData: FormData,
    ) => Promise<LoginState>;
}) {
    const employeeRef = React.useRef<HTMLInputElement>(null);
    const [employeeId, setEmployeeId] = React.useState("");
    const pinRef = React.useRef<HTMLInputElement>(null);
    const [pin, setPin] = React.useState("");
    const [isPWA, setIsPWA] = React.useState(false);

    React.useEffect(() => {
        setIsPWA(window.matchMedia("(display-mode: standalone)").matches);
    }, []);

    const [state, formAction, isPending] = React.useActionState<
        LoginState | null,
        FormData
    >(action, null);

    // Focus the field that has the error
    React.useEffect(() => {
        if (state?.ok === false) {
            if (state.field === "employeeId") {
                setEmployeeId("");
                employeeRef.current?.focus();
            }
            if (state.field === "pin") {
                setPin("");
                pinRef.current?.focus();
            }
        }
    }, [state]);

    return (
        <main className='min-h-screen flex items-center justify-center bg-muted/30 p-4'>
            <Card className='w-full max-w-sm'>
                <CardHeader>
                    <CardTitle className='text-xl'>
                        UPS Employee Sign In
                    </CardTitle>
                </CardHeader>

                <CardContent className='space-y-4'>
                    {state?.ok === false ? (
                        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
                            {state.message}
                        </div>
                    ) : null}

                    <form
                        action={formAction}
                        className='space-y-3'>
                        <div className='space-y-1'>
                            <Label htmlFor='employeeId'>Employee ID</Label>
                            <input
                                type='hidden'
                                name='isPWA'
                                value={isPWA ? "true" : "false"}
                            />
                            <Input
                                ref={employeeRef}
                                id='employeeId'
                                name='employeeId'
                                inputMode='numeric'
                                placeholder='1234567'
                                maxLength={7}
                                aria-invalid={
                                    state?.ok === false &&
                                    state.field === "employeeId"
                                }
                                value={employeeId}
                                onChange={e =>
                                    setEmployeeId(
                                        e.target.value.replace(/\D/g, ""),
                                    )
                                }
                                onInput={e => {
                                    if (e.currentTarget.value.length === 7)
                                        pinRef.current?.focus();
                                }}
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='pin'>PIN</Label>
                            <Input
                                ref={pinRef}
                                id='pin'
                                name='pin'
                                type='password'
                                inputMode='numeric'
                                placeholder='••••'
                                aria-invalid={
                                    state?.ok === false && state.field === "pin"
                                }
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                            />
                        </div>

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isPending}>
                            {isPending ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    <p className='text-center text-sm text-muted-foreground'>
                        New here?{" "}
                        <a
                            href='/register'
                            className='font-medium text-blue-600 hover:underline'>
                            Register
                        </a>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
