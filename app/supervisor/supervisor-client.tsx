"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { RecentRow, EmployeeRow } from "./page";
import {
    setAnnouncementAction,
    upsertPreloadStartTimeAction,
    upsertUserAction,
} from "@/actions";

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
    employees,
}: {
    supervisorId: string;
    supervisorName: string;
    recent: RecentRow[];
    employees: EmployeeRow[];
}) {
    const [annState, annAction, annPending] = useActionState(
        setAnnouncementAction,
        null,
    );
    const [stState, stAction, stPending] = useActionState(
        upsertPreloadStartTimeAction,
        null,
    );
    const [userState, userAction, userPending] = useActionState(
        upsertUserAction,
        null,
    );
    const [qName, setQName] = useState("");
    const [qId, setQId] = useState("");
    const [qRole, setQRole] = useState<"" | "Employee" | "Supervisor">("");
    const [qActive, setQActive] = useState<"" | "Active" | "Inactive">("");
    // Area is assumed preload for now
    const qArea = "Preload";

    const filteredEmployees = useMemo(() => {
        const name = qName.trim().toLowerCase();
        const id = qId.trim();

        return employees.filter(e => {
            const fullName = (e.full_name ?? "").toLowerCase();

            if (name && !fullName.includes(name)) return false;
            if (id && !e.employee_id.includes(id)) return false;
            if (qRole && e.role !== qRole) return false;
            if (qActive === "Active" && !e.active) return false;
            if (qActive === "Inactive" && e.active) return false;

            // area assumed preload
            if (qArea && qArea !== "Preload") return false;

            return true;
        });
    }, [employees, qName, qId, qRole, qActive]);

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
                                type='date'
                                // placeholder='YYYY-MM-DD'
                                required
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='startTime'>Start time</Label>
                            <Input
                                id='startTime'
                                name='startTime'
                                type='time'
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

            {/* Add new users */}
            <Card>
                <CardHeader>
                    <CardTitle className='text-base'>Add/Update User</CardTitle>
                    <p className='text-sm text-muted-foreground'>
                        Creates a login for an employee. If the ID already
                        exists, it updates their info.
                    </p>
                </CardHeader>

                <CardContent className='space-y-3'>
                    {userState?.ok === false ? (
                        <Alert>
                            <AlertTitle>Couldn’t save user</AlertTitle>
                            <AlertDescription>
                                {userState.message}
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    {userState?.ok === true ? (
                        <Alert>
                            <AlertTitle>Saved</AlertTitle>
                            <AlertDescription>
                                {userState.message}
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    <form
                        action={userAction}
                        className='grid gap-3 md:grid-cols-2'>
                        <div className='space-y-1'>
                            <Label htmlFor='employeeIdNew'>Employee ID</Label>
                            <Input
                                id='employeeIdNew'
                                name='employeeId'
                                inputMode='numeric'
                                placeholder='1234567'
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='fullNameNew'>Full name</Label>
                            <Input
                                id='fullNameNew'
                                name='fullName'
                                placeholder='First Last'
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='pinNew'>PIN</Label>
                            <Input
                                id='pinNew'
                                name='pin'
                                type='password'
                                inputMode='numeric'
                                placeholder='••••'
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='roleNew'>Role</Label>
                            <select
                                id='roleNew'
                                name='role'
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'
                                defaultValue='employee'>
                                <option value='employee'>Employee</option>
                                <option value='supervisor'>Supervisor</option>
                            </select>
                        </div>

                        <div className='md:col-span-2'>
                            <Button
                                type='submit'
                                disabled={userPending}>
                                {userPending ? "Saving..." : "Save User"}
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
                                            ).toLocaleString("en-US", {
                                                timeZone: "America/Chicago",
                                                year: "numeric",
                                                month: "2-digit",
                                                day: "2-digit",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
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

            {/* Employees */}
            <Card>
                <CardHeader className='flex-row items-center justify-between space-y-0'>
                    <CardTitle className='text-base'>Employees</CardTitle>
                    <Badge variant='secondary'>
                        {filteredEmployees.length} / {employees.length}
                    </Badge>
                </CardHeader>

                <CardContent className='space-y-4'>
                    {/* Filters */}
                    <div className='grid gap-3 md:grid-cols-4'>
                        <div className='space-y-1'>
                            <Label htmlFor='filterName'>Name</Label>
                            <Input
                                id='filterName'
                                placeholder='Search name...'
                                value={qName}
                                onChange={e => setQName(e.target.value)}
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='filterId'>Employee ID</Label>
                            <Input
                                id='filterId'
                                placeholder='1234567'
                                inputMode='numeric'
                                value={qId}
                                onChange={e =>
                                    setQId(e.target.value.replace(/\D/g, ""))
                                }
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='filterRole'>Role</Label>
                            <select
                                id='filterRole'
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'
                                value={qRole}
                                onChange={e => setQRole(e.target.value as any)}>
                                <option value=''>All</option>
                                <option value='employee'>Employee</option>
                                <option value='supervisor'>Supervisor</option>
                            </select>
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='filterActive'>Status</Label>
                            <select
                                id='filterActive'
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'
                                value={qActive}
                                onChange={e =>
                                    setQActive(e.target.value as any)
                                }>
                                <option value=''>All</option>
                                <option value='active'>Active</option>
                                <option value='inactive'>Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Area note (MVP) */}
                    <div className='text-xs text-muted-foreground'>
                        Area is currently assumed:{" "}
                        <span className='font-medium'>Preload</span>
                    </div>

                    {/* Table */}
                    <div className='overflow-x-auto'>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Employee ID</TableHead>
                                    <TableHead>Area</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Added</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {filteredEmployees.map(e => (
                                    <TableRow key={e.employee_id}>
                                        <TableCell className='font-medium'>
                                            {e.full_name ?? "—"}
                                        </TableCell>
                                        <TableCell>{e.employee_id}</TableCell>
                                        <TableCell>Preload</TableCell>
                                        <TableCell className="capitalize">{e.role}</TableCell>
                                        <TableCell>
                                            {e.active ? (
                                                <Badge variant='secondary'>
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant='outline'>
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                e.created_at,
                                            ).toLocaleString("en-US", {
                                                timeZone: "America/Chicago",
                                                year: "numeric",
                                                month: "2-digit",
                                                day: "2-digit",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {filteredEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className='text-sm text-muted-foreground'>
                                            No employees match your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
