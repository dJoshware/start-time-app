"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { RecentRow } from "./page";
import { setAnnouncementAction, upsertPreloadStartTimeAction } from "@/actions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function SupervisorClient({
    supervisorId,
    supervisorName,
    recent,
}: {
    supervisorId: string;
    supervisorName: string;
    recent: RecentRow[];
}) {
    const [annState, annAction, annPending] = useActionState(
        setAnnouncementAction,
        null,
    );
    const [stState, stAction, stPending] = useActionState(
        upsertPreloadStartTimeAction,
        null,
    );

    return (
        <main className='mx-auto w-full max-w-5xl px-4 py-10 space-y-6'>
            <header className='flex items-start justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold tracking-tight'>
                        Supervisor Panel
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Signed in as{" "}
                        <span className='font-medium'>
                            {supervisorName} - {supervisorId}
                        </span>
                    </p>
                </div>

                <Button
                    asChild
                    variant='secondary'>
                    <Link href='/dashboard'>Back to Dashboard</Link>
                </Button>
            </header>

            <Separator />

            {/* Announcement */}
            <Card>
                <CardHeader className='flex-row items-center justify-between space-y-0'>
                    <CardTitle className='text-base'>
                        Set Announcement
                    </CardTitle>
                    <Badge variant='secondary'>Site-wide</Badge>
                </CardHeader>
                <CardContent className='space-y-3'>
                    {annState?.ok === false ? (
                        <Alert>
                            <AlertTitle>Couldn’t post</AlertTitle>
                            <AlertDescription>
                                {annState.message}
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    <form
                        action={annAction}
                        className='space-y-3'>
                        <div className='space-y-1'>
                            <Label htmlFor='message'>Message</Label>
                            <Textarea
                                id='message'
                                name='message'
                                rows={3}
                                placeholder='Example: Preload start time is 5:15am today due to weather.'
                            />
                        </div>

                        <Button
                            type='submit'
                            disabled={annPending}>
                            {annPending ? "Posting..." : "Post Announcement"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Start time */}
            <Card>
                <CardHeader>
                    <CardTitle className='text-base'>
                        Set Preload Start Time
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                        This sets the start time everyone will see.
                    </p>
                </CardHeader>

                <CardContent className='space-y-3'>
                    {stState?.ok === false ? (
                        <Alert>
                            <AlertTitle>Couldn’t save</AlertTitle>
                            <AlertDescription>
                                {stState.message}
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    <form
                        action={stAction}
                        className='grid gap-3 md:grid-cols-3'>
                        <div className='space-y-1'>
                            <Label htmlFor='workDate'>Work date</Label>
                            <Input
                                id='workDate'
                                name='workDate'
                                type="date"
                                // placeholder='YYYY-MM-DD'
                                required
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='startTime'>Start time</Label>
                            <Input
                                id='startTime'
                                name='startTime'
                                type="time"
                                // placeholder='HH:MM'
                                required
                            />
                        </div>

                        <div className='space-y-1 md:col-span-3'>
                            <Label htmlFor='notes'>Notes</Label>
                            <Input
                                id='notes'
                                name='notes'
                                placeholder='Optional notes'
                            />
                        </div>

                        <div className='md:col-span-3'>
                            <Button
                                type='submit'
                                disabled={stPending}>
                                {stPending
                                    ? "Saving..."
                                    : "Save Preload Start Time"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Recent */}
            <Card>
                <CardHeader className='flex-row items-center justify-between space-y-0'>
                    <CardTitle className='text-base'>Recent Updates</CardTitle>
                    <Badge variant='secondary'>Last 20</Badge>
                </CardHeader>
                <CardContent>
                    <div className='overflow-x-auto'>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead>By</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {recent.map(r => (
                                    <TableRow
                                        key={`${r.employee_id}-${String(r.work_date)}`}>
                                        <TableCell className='font-medium'>
                                            {r.employee_id}
                                        </TableCell>
                                        <TableCell>
                                            {String(r.work_date).slice(0, 10)}
                                        </TableCell>
                                        <TableCell>
                                            {String(r.start_time).slice(0, 5)}
                                        </TableCell>
                                        <TableCell className='max-w-[320px] truncate'>
                                            {r.notes || ""}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                r.updated_at,
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {r.updated_by_name ||
                                                r.updated_by ||
                                                "unknown"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
