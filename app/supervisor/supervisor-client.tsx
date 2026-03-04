"use client";

import * as React from "react";
import Link from "next/link";
import type { RecentRow, EmployeeRow } from "./page";
import {
    setAnnouncementAction,
    upsertStartTimeAction,
    upsertUserAction,
    deleteUsersAction,
} from "@/actions";
import {
    type SortKey,
    AREA_MAP,
    titleCase,
    normArea,
} from "@/lib/helpers";

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
    supervisorSort,
    supervisorArea,
    supervisorSubArea,
    recent,
    employees,
}: {
    supervisorId: string;
    supervisorName: string;
    supervisorSort: SortKey;
    supervisorArea: string | null;
    supervisorSubArea: string | null;
    recent: RecentRow[];
    employees: EmployeeRow[];
}) {
    const [annState, annAction, annPending] = React.useActionState(
        setAnnouncementAction,
        null,
    );
    const [stState, stAction, stPending] = React.useActionState(
        upsertStartTimeAction,
        null,
    );
    const [userState, userAction, userPending] = React.useActionState(
        upsertUserAction,
        null,
    );
    const [delState, delAction, delPending] = React.useActionState(
        deleteUsersAction,
        null,
    );

    const [qName, setQName] = React.useState("");
    const [qId, setQId] = React.useState("");
    const [qArea, setQArea] = React.useState("");
    const [qSubArea, setQSubArea] = React.useState("");
    const [qRole, setQRole] = React.useState<"" | "employee" | "supervisor">(
        "",
    );
    const [qActive, setQActive] = React.useState<"" | "active" | "inactive">(
        "",
    );
    const [isEdit, setIsEdit] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
        new Set(),
    );
    // ADMIN: sort the NEW user will be created under
    const [newUserSort, setNewUserSort] = React.useState<SortKey>(supervisorSort);
    const areasForSort = AREA_MAP[newUserSort] ?? [];
    const [newArea, setNewArea] = React.useState(supervisorArea ?? "");
    const subAreasForNewArea =
        areasForSort.find(a => a.label === newArea)?.subAreas ?? [];
    const [recentArea, setRecentArea] = React.useState<string>(
        supervisorArea ?? "",
    );

    const visibleRecent = React.useMemo(() => {
        if (!recentArea) return recent;
        return recent.filter(r => r.area === recentArea);
    }, [recent, recentArea]);

    const norm = (v: unknown) =>
        String(v ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

    const filteredEmployees = React.useMemo(() => {
        const nName = norm(qName);
        const nId = norm(qId);
        const nArea = norm(qArea);
        const nSub = norm(qSubArea);

        return employees.filter(e => {
            if (nName && !norm(e.full_name).includes(nName)) return false;
            if (nId && !String(e.employee_id).includes(nId)) return false;

            if (qRole && e.role !== qRole) return false;

            if (qActive === "active" && !e.active) return false;
            if (qActive === "inactive" && e.active) return false;

            if (nArea && !norm(e.area).includes(nArea)) return false;
            if (nSub && !norm(e.sub_area).includes(nSub)) return false;

            return true;
        });
    }, [employees, qName, qId, qRole, qActive, qArea, qSubArea]);

    function toggleSelected(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function clearSelection() {
        setSelectedIds(new Set());
    }

    const editableVisibleIds = React.useMemo(
        () =>
            filteredEmployees
                .filter(e => supervisorArea && e.area === supervisorArea)
                .map(e => e.employee_id),
        [filteredEmployees, supervisorArea],
    );

    const allVisibleSelected =
        editableVisibleIds.length > 0 &&
        editableVisibleIds.every(id => selectedIds.has(id));

    function toggleSelectAllVisible() {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                // unselect all visible
                editableVisibleIds.forEach(id => next.delete(id));
            } else {
                // select all visible
                editableVisibleIds.forEach(id => next.add(id));
            }
            return next;
        });
    }

    React.useEffect(() => {
        if (delState?.ok) {
            clearSelection();
            setIsEdit(false);
        }
    }, [delState]);

    // Keep newArea valid if sort changes
    React.useEffect(() => {
      if (newArea && !areasForSort.some(a => a.label === newArea)) {
        setNewArea("");
      }
    }, [newUserSort]); // intentionally not depending on newArea to avoid extra resets

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
                    <Badge variant='secondary'>
                        Your work area:{" "}
                        {supervisorArea ? titleCase(supervisorArea) : ""}
                    </Badge>
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
                                placeholder={
                                    supervisorArea
                                        ? `No one outside of ${titleCase(supervisorArea)} will see what you post.`
                                        : "No one outside of your area will see what you post."
                                }
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
                        Set Start Time for{" "}
                        {supervisorArea ? titleCase(supervisorArea) : ""}
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                        This sets the start time for your work area.
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

                    <form action={stAction} className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2 md:col-span-3">
                        <Label>Apply to areas</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {areasForSort.map(a => (
                            <label key={a.label} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="areas"
                                value={a.label}
                                defaultChecked={normArea(a.label) === normArea(supervisorArea)}
                              />
                              {a.label === "da" ? "DA" : titleCase(a.label)}
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your own area is always included automatically.
                        </p>
                      </div>
                    
                      <div className="space-y-1">
                        <Label htmlFor="workDate">Work date</Label>
                        <Input id="workDate" name="workDate" type="date" required />
                      </div>
                    
                      <div className="space-y-1">
                        <Label htmlFor="startTime">Start time</Label>
                        <Input id="startTime" name="startTime" type="time" required />
                      </div>
                    
                      <div className="space-y-1 md:col-span-3">
                        <Label htmlFor="notes">Notes</Label>
                        <Input id="notes" name="notes" placeholder="Optional notes" />
                      </div>
                    
                      <div className="md:col-span-3">
                        <Button type="submit" disabled={stPending}>
                          {stPending ? "Saving..." : "Save Start Time"}
                        </Button>
                      </div>
                    </form>
                </CardContent>
            </Card>

            {/* Add/Update users */}
            <Card>
                <CardHeader>
                    <CardTitle className='text-base'>
                        Add/Update {titleCase(supervisorSort)} Employee
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                        Creates a login for an employee. If the ID already
                        exists, it updates their info.
                    </p>
                </CardHeader>

                <CardContent className='space-y-3'>
                    {userState?.ok === false ? (
                        <Alert className='bg-red-400'>
                            <AlertTitle>Couldn’t save user</AlertTitle>
                            <AlertDescription>
                                {userState.message}
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    {userState?.ok === true ? (
                        <Alert className='bg-green-300'>
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

                        <div className='space-y-1'>
                          <Label htmlFor='sortNew'>Sort</Label>
                        
                          {supervisorId === '7255540' ? (
                            <>
                              <select
                                id='sortNew'
                                name='sort'
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm capitalize'
                                value={newUserSort}
                                onChange={e => setNewUserSort(e.target.value as SortKey)}>
                                {Object.keys(AREA_MAP).map(s => (
                                  <option key={s} value={s} className='capitalize'>
                                    {s}
                                  </option>
                                ))}
                              </select>
                        
                              <p className='text-xs text-muted-foreground'>
                                This only affects the user you’re creating.
                              </p>
                            </>
                          ) : (
                            <>
                              {/* Important: still submit the sort to the server */}
                              <input type='hidden' name='sort' value={supervisorSort} />
                              <p className='capitalize bg-secondary rounded-md text-sm py-2 pl-4'>
                                {supervisorSort}
                              </p>
                            </>
                          )}
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='areaNew'>Area</Label>
                            <select
                                id='areaNew'
                                name='area'
                                value={newArea}
                                onChange={e => setNewArea(e.target.value)}
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'>
                                <option value=''>Select area</option>
                                {areasForSort.map(a => (
                                    <option
                                        key={a.label}
                                        value={a.label}>
                                        {a.label === "da"
                                            ? "DA"
                                            : titleCase(a.label)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className='space-y-1'>
                            {subAreasForNewArea.length > 0 ? (
                                <div className='space-y-1'>
                                    <Label htmlFor='subAreaNew'>Sub-Area</Label>
                                    <select
                                        id='subAreaNew'
                                        name='subArea'
                                        className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'
                                        defaultValue={supervisorSubArea ?? ""}>
                                        <option value=''>
                                            Select sub-area
                                        </option>
                                        {subAreasForNewArea.map(sa => (
                                            <option
                                                key={sa}
                                                value={sa}>
                                                {titleCase(sa)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}
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
                    <select
                        className='h-9 rounded-md border border-input bg-transparent px-3 mt-1 text-sm'
                        value={recentArea}
                        onChange={e => setRecentArea(e.target.value)}>
                        <option value=''>Sort-wide</option>
                        {areasForSort.map(a => (
                            <option
                                key={a.label}
                                value={a.label}>
                                {a.label === "da" ? "DA" : titleCase(a.label)}
                            </option>
                        ))}
                    </select>
                </CardHeader>
                <CardContent>
                    <div className='max-h-80 overflow-x-auto overflow-y-auto'>
                        <Table>
                            <TableHeader className='sticky top-0 bg-background z-10'>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead>By</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {visibleRecent.map(r => (
                                    <TableRow
                                        key={`${r.updated_by ?? "unknown"}-${r.work_date}-${String(r.updated_at)}`}>
                                        <TableCell>
                                            {(() => {
                                                const [y, m, d] =
                                                    r.work_date.split("-");
                                                const localDate = new Date(
                                                    Number(y),
                                                    Number(m) - 1,
                                                    Number(d),
                                                );
                                                return localDate
                                                    .toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            weekday: "short",
                                                            month: "short",
                                                            day: "numeric",
                                                        },
                                                    )
                                                    .replace(",", "");
                                            })()}
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
                    <div className='flex items-center gap-3'>
                        <CardTitle className='text-base'>
                            {titleCase(supervisorSort)} Employees
                        </CardTitle>
                    </div>
                    <Badge variant='secondary'>
                        {filteredEmployees.length} / {employees.length}
                    </Badge>
                </CardHeader>

                <CardContent className='space-y-4'>
                    {/* Filters */}
                    <div className='grid gap-3 md:grid-cols-6'>
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
                            <Label htmlFor='filterArea'>Area</Label>
                            <select
                                id='filterArea'
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'
                                value={qArea}
                                onChange={e => setQArea(e.target.value as any)}>
                                <option value=''>All</option>
                                <option value='package car'>Package Car</option>
                                <option value='outbound'>Outbound</option>
                                <option value='unload'>Unload</option>
                                <option value='smalls'>Smalls</option>
                                <option value='tender'>Tender</option>
                                <option value='da'>DA</option>
                                <option value='dispatch'>Dispatch</option>
                            </select>
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='filterSubArea'>Sub-Area</Label>
                            <select
                                id='filterSubArea'
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'
                                value={qSubArea}
                                onChange={e =>
                                    setQSubArea(e.target.value as any)
                                }>
                                <option value=''>All</option>
                                <option value='metro center'>
                                    Metro Center
                                </option>
                                <option value='east center'>East Center</option>
                            </select>
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

                    {/* Sort note */}
                    <div className='capitalize text-xs text-muted-foreground'>
                        Your sort:{" "}
                        <span className='font-medium'>{supervisorSort}</span>
                    </div>

                    {/* Table */}
                    <div className='max-h-86 overflow-x-auto overflow-y-auto'>
                        {delState?.ok === false ? (
                            <Alert className='bg-red-400'>
                                <AlertTitle>Couldn’t delete</AlertTitle>
                                <AlertDescription>
                                    {delState.message}
                                </AlertDescription>
                            </Alert>
                        ) : null}

                        {delState?.ok === true ? (
                            <Alert className='bg-green-300'>
                                <AlertTitle>Done</AlertTitle>
                                <AlertDescription>
                                    {delState.message}
                                </AlertDescription>
                            </Alert>
                        ) : null}
                        <Table>
                            <TableHeader className='sticky top-0 bg-background z-10'>
                                <TableRow>
                                    {isEdit ? (
                                        <TableHead className='w-10'>
                                            <input
                                                type='checkbox'
                                                aria-label='Select all visible employees'
                                                checked={allVisibleSelected}
                                                onChange={
                                                    toggleSelectAllVisible
                                                }
                                            />
                                        </TableHead>
                                    ) : null}
                                    <TableHead>Name</TableHead>
                                    <TableHead>Employee ID</TableHead>
                                    <TableHead>Area</TableHead>
                                    <TableHead>Sub-Area</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Added</TableHead>
                                    <TableHead>Last Signed In</TableHead>
                                    <TableHead>Sign In Count</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {filteredEmployees.map(e => {
                                    const canEditRow =
                                        supervisorArea &&
                                        e.area === supervisorArea;

                                    return (
                                        <TableRow key={e.employee_id}>
                                            {isEdit ? (
                                                <TableCell className='w-10'>
                                                    <input
                                                        type='checkbox'
                                                        disabled={!canEditRow}
                                                        checked={selectedIds.has(
                                                            e.employee_id,
                                                        )}
                                                        onChange={() =>
                                                            canEditRow &&
                                                            toggleSelected(
                                                                e.employee_id,
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                            ) : null}
                                            <TableCell className='font-medium'>
                                                {e.full_name ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {e.employee_id}
                                            </TableCell>
                                            <TableCell>
                                                {e.area
                                                    ? titleCase(e.area)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {e.sub_area
                                                    ? titleCase(e.sub_area)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className='capitalize'>
                                                {e.role}
                                            </TableCell>
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
                                            <TableCell>
                                                {e.last_signed_in
                                                    ? new Date(
                                                          e.last_signed_in,
                                                      ).toLocaleString(
                                                          "en-US",
                                                          {
                                                              timeZone:
                                                                  "America/Chicago",
                                                              year: "numeric",
                                                              month: "2-digit",
                                                              day: "2-digit",
                                                              hour: "numeric",
                                                              minute: "2-digit",
                                                          },
                                                      )
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className='tabular-nums'>
                                                {e.sign_in_count ?? 0}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {filteredEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={isEdit ? 10 : 9}
                                            className='text-sm text-muted-foreground'>
                                            No employees match your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Edit button */}
                    {isEdit ? (
                        <Badge variant='outline'>
                            {selectedIds.size} selected
                        </Badge>
                    ) : null}
                    <div className='flex items-center gap-2'>
                        {isEdit ? (
                            <>
                                <form
                                    action={delAction}
                                    onSubmit={e => {
                                        const count = selectedIds.size;
                                        if (count === 0) {
                                            e.preventDefault();
                                            return;
                                        }
                                        const ok = window.confirm(
                                            `Delete ${count} user${count === 1 ? "" : "s"}? This will permanently remove them.`,
                                        );
                                        if (!ok) e.preventDefault();
                                    }}>
                                    <input
                                        type='hidden'
                                        name='employeeIds'
                                        value={JSON.stringify(
                                            Array.from(selectedIds),
                                        )}
                                    />

                                    <Button
                                        type='submit'
                                        variant='destructive'
                                        disabled={
                                            delPending || selectedIds.size === 0
                                        }>
                                        {delPending
                                            ? "Deleting..."
                                            : "Delete Selected"}
                                    </Button>
                                </form>

                                <Button
                                    onClick={() => {
                                        clearSelection();
                                        setIsEdit(false);
                                    }}>
                                    Done
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEdit(true)}>
                                Edit
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
