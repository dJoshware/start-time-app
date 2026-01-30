import { unstable_noStore as noStore } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUSINESS_DAY_CUTOFF_HOUR = 9; // 9:00 AM
const TZ = "America/Chicago";

function chicagoHour(d = new Date()) {
    return Number(
        new Intl.DateTimeFormat("en-US", {
            timeZone: TZ,
            hour: "numeric",
            hour12: false,
        }).format(d),
    );
}

function tzParts(d = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(d);

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    return { y: get("year"), m: get("month"), day: get("day") };
}

function todayISOChicago() {
    const { y, m, day } = tzParts(new Date());
    return `${y}-${m}-${day}`;
}

// Make a Date object that is "noon UTC" for an ISO date.
// This avoids off-by-one issues when formatting a date-only value.
function dateFromISO(iso: string) {
    return new Date(`${iso}T12:00:00Z`);
}

function addDaysISO(iso: string, days: number) {
    const d = dateFromISO(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function startOfWeekMondayISO(iso: string) {
    const d = dateFromISO(iso);
    const day = d.getUTCDay(); // 0=Sun..6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
}

function dayLabelISO(iso: string) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        weekday: "short",
    }).format(dateFromISO(iso));
}

function monthDayISO(iso: string) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "short",
        day: "numeric",
    }).format(dateFromISO(iso));
}

function fmtUpdatedAt(value: Date | string) {
    return new Date(value).toLocaleString("en-US", {
        timeZone: TZ,
        hour: "numeric",
        minute: "2-digit",
        month: "2-digit",
        day: "2-digit",
    });
}

export default async function DashboardPage() {
    noStore();

    const user = await getSessionUser();
    if (!user) redirect("/login");
    const todayIso = todayISOChicago();
    const windowStartIso = todayIso;
    const windowEndIso = addDaysISO(todayIso, 6);

    // Fetch start times for this week
    const weekRows = await sql<
        {
            work_date: Date | string;
            start_time: string;
            notes: string | null;
            updated_at: Date | string;
            updated_by: string | null;
            updated_by_name: string | null;
        }[]
    >`
        select
            st.work_date,
            st.start_time,
            st.notes,
            st.updated_at,
            st.updated_by,
            u.full_name as updated_by_name
        from area_start_times st
        left join users u on u.employee_id = st.updated_by
        where st.area = 'preload'
            and st.work_date between ${windowStartIso}::date and ${windowEndIso}::date
        order by st.work_date asc
    `;

    const annRows = await sql<
        {
            message: string;
            updated_at: Date | string;
            updated_by: string | null;
            updated_by_name: string | null;
        }[]
    >`
        select
            a.message,
            a.updated_at,
            a.updated_by,
            u.full_name as updated_by_name
        from announcements a
        left join users u
            on u.employee_id = a.updated_by
        order by a.updated_at desc
        limit 1
    `;

    const ann = annRows[0];

    function isoFromDbDate(value: Date | string) {
        // If Postgres returns "YYYY-MM-DD" as a string, keep it.
        if (typeof value === "string") return value.slice(0, 10);

        // If it returns a Date, convert using UTC date parts.
        const y = value.getUTCFullYear();
        const m = String(value.getUTCMonth() + 1).padStart(2, "0");
        const d = String(value.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    // Map start_times by date string for quick lookup
    const byDate = new Map<string, (typeof weekRows)[number]>();
    for (const r of weekRows) {
        // work_date comes back as Date in many drivers; normalize
        const iso = isoFromDbDate(r.work_date);
        byDate.set(iso, r);
    }

    const days = Array.from({ length: 7 }, (_, i) => {
        const iso = addDaysISO(todayIso, i);
        return { iso, row: byDate.get(iso) };
    });

    const hourNow = chicagoHour();
    const isAfterSort = hourNow >= BUSINESS_DAY_CUTOFF_HOUR;
    const detailIso = isAfterSort ? addDaysISO(todayIso, 1) : todayIso;
    const detailLabel = isAfterSort ? "Tomorrow" : "Today";
    const detailRow = byDate.get(detailIso);

    return (
        <main className='mx-auto w-full max-w-5xl px-4 py-10'>
            {/* Header */}
            <header className='flex items-start justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold tracking-tight'>
                        Hi{user.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Week of {monthDayISO(windowStartIso)} –{" "}
                        {monthDayISO(windowEndIso)}
                    </p>
                </div>

                {user.role === "supervisor" ? (
                    <Button asChild>
                        <Link href='/supervisor'>Supervisor Panel</Link>
                    </Button>
                ) : null}
            </header>

            <Separator className='my-6' />

            {/* Announcement */}
            {ann ? (
                <Alert className='mb-6'>
                    <AlertTitle className='flex items-center gap-2'>
                        Announcement <Badge variant='secondary'>Latest</Badge>
                    </AlertTitle>
                    <AlertDescription className='mt-2 space-y-2'>
                        <div className='text-sm'>{ann.message}</div>
                        <div className='text-xs text-muted-foreground'>
                            Updated {fmtUpdatedAt(ann.updated_at)}
                            {" • "}
                            Posted by{" "}
                            {ann.updated_by_name || ann.updated_by || "unknown"}
                        </div>
                    </AlertDescription>
                </Alert>
            ) : null}

            {/* Week strip */}
            <section className='space-y-3'>
                <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold tracking-tight'>
                        This week - Preload {/** Change to {sort} query */}
                    </h2>
                    <span className='text-xs text-muted-foreground'>
                        Today is highlighted
                    </span>
                </div>

                {/* Horizontal scroll on small screens */}
                <div className='flex gap-4 overflow-x-auto pb-2'>
                    {days.map(({ iso, row }) => {
                        const isToday = iso === todayIso;
                        const time = row?.start_time
                            ? String(row.start_time).slice(0, 5)
                            : null;
                        const updatedAt = row?.updated_at
                            ? fmtUpdatedAt(row.updated_at)
                            : null;

                        return (
                            <Card
                                key={iso}
                                className={[
                                    "shrink-0",
                                    isToday ? "w-80" : "w-56 opacity-80",
                                    isToday
                                        ? "border-primary/40 shadow-md"
                                        : "hover:opacity-100",
                                ].join(" ")}>
                                <CardHeader className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                        <CardTitle className='text-base'>
                                            {dayLabelISO(iso)}{" "}
                                            <span className='text-muted-foreground font-normal'>
                                                {monthDayISO(iso)}
                                            </span>
                                        </CardTitle>
                                        {isToday ? <Badge>Today</Badge> : null}
                                    </div>
                                </CardHeader>

                                <CardContent className='space-y-3'>
                                    {time ? (
                                        <div
                                            className={
                                                isToday
                                                    ? "text-4xl font-semibold"
                                                    : "text-3xl font-semibold"
                                            }>
                                            {time}
                                        </div>
                                    ) : (
                                        <div className='text-sm text-muted-foreground'>
                                            No start time posted yet.
                                        </div>
                                    )}

                                    {row?.notes ? (
                                        <div className='text-sm'>
                                            <span className='font-medium'>
                                                Notes:
                                            </span>{" "}
                                            {row.notes}
                                        </div>
                                    ) : null}

                                    {updatedAt ? (
                                        <div className='text-xs text-muted-foreground'>
                                            Updated {updatedAt}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Today detail card (optional big one below week strip) */}
                <Card className='border-primary/30'>
                    <CardHeader>
                        <CardTitle className='text-base flex items-center justify-between'>
                            {detailLabel} ({monthDayISO(detailIso)})
                            <Badge className={isAfterSort ? "bg-yellow-300 text-slate-950" : "bg-green-400 text-slate-950"}>
                                {isAfterSort ? 'Next Sort' : 'Current Sort'}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        {detailRow?.start_time ? (
                            <div className='text-3xl font-semibold'>
                                {String(detailRow.start_time).slice(0, 5)}
                            </div>
                        ) : (
                            <div className='text-sm text-muted-foreground'>
                                No start time posted yet.
                            </div>
                        )}

                        {detailRow?.notes ? (
                            <div className='text-sm'>
                                <span className='font-medium'>Notes:</span>{" "}
                                {detailRow.notes}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
