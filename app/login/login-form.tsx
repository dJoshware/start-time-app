"use client";

import { useActionState, useEffect, useRef } from "react";
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
    const pinRef = useRef<HTMLInputElement>(null);
    const employeeRef = useRef<HTMLInputElement>(null);

    const [state, formAction, isPending] = useActionState<
        LoginState | null,
        FormData
    >(action, null);

    // Focus the field that has the error
    useEffect(() => {
        if (state?.ok === false) {
            if (state.field === "employeeId") employeeRef.current?.focus();
            if (state.field === "pin") pinRef.current?.focus();
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
                                onInput={e => {
                                    const input = e.currentTarget;
                                    input.value = input.value.replace(
                                        /\D/g,
                                        "",
                                    );
                                    if (input.value.length === 7)
                                        pinRef.current?.focus();
                                }}
                            />
                            {/* {state?.ok === false &&
                            state.field === "employeeId" ? (
                                <p className='text-xs text-destructive'>
                                    {state.message}
                                </p>
                            ) : null} */}
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
                            />
                            {/* {state?.ok === false && state.field === "pin" ? (
                                <p className='text-xs text-destructive'>
                                    {state.message}
                                </p>
                            ) : null} */}
                        </div>

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isPending}>
                            {isPending ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
