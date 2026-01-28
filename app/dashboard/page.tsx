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

function dateISO(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

function startOfWeekMonday(d: Date) {
    // Monday-based week (Mon-Sun)
    const x = new Date(d);
    const day = x.getDay(); // 0=Sun,1=Mon,...6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

function dayLabel(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
}

function monthDay(d: Date) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
    noStore();

    const user = await getSessionUser();
    if (!user) redirect("/login");

    const today = new Date();
    const todayIso = dateISO(today);

    const weekStart = startOfWeekMonday(today);
    const weekEnd = addDays(weekStart, 6);

    const weekStartIso = dateISO(weekStart);
    const weekEndIso = dateISO(weekEnd);

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
            and st.work_date between ${weekStartIso}::date and ${weekEndIso}::date
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

    // Map start_times by date string for quick lookup
    const byDate = new Map<string, (typeof weekRows)[number]>();
    for (const r of weekRows) {
        // work_date comes back as Date in many drivers; normalize
        const iso = dateISO(new Date(r.work_date));
        byDate.set(iso, r);
    }

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map(
        d => {
            const iso = dateISO(d);
            return { d, iso, row: byDate.get(iso) };
        },
    );

    const todayRow = byDate.get(todayIso);

    return (
        <main className='mx-auto w-full max-w-5xl px-4 py-10'>
            {/* Header */}
            <header className='flex items-start justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold tracking-tight'>
                        Hi{user.full_name ? `, ${user.full_name}` : ""}
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Week of {monthDay(weekStart)} – {monthDay(weekEnd)}
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
                            Updated {new Date(ann.updated_at).toLocaleString()}
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
                        This week
                    </h2>
                    <span className='text-xs text-muted-foreground'>
                        Today is highlighted
                    </span>
                </div>

                {/* Horizontal scroll on small screens */}
                <div className='flex gap-4 overflow-x-auto pb-2'>
                    {days.map(({ d, iso, row }) => {
                        const isToday = iso === todayIso;

                        const time = row?.start_time
                            ? String(row.start_time).slice(0, 5)
                            : null;
                        const updatedAt = row?.updated_at
                            ? new Date(row.updated_at).toLocaleString()
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
                                            {dayLabel(d)}{" "}
                                            <span className='text-muted-foreground font-normal'>
                                                {monthDay(d)}
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
                            Today ({todayIso})
                            <Badge variant='secondary'>Detail</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        {todayRow?.start_time ? (
                            <div className='text-3xl font-semibold'>
                                {String(todayRow.start_time).slice(0, 5)}
                            </div>
                        ) : (
                            <div className='text-sm text-muted-foreground'>
                                No start time posted yet.
                            </div>
                        )}

                        {todayRow?.notes ? (
                            <div className='text-sm'>
                                <span className='font-medium'>Notes:</span>{" "}
                                {todayRow.notes}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
