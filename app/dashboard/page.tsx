import { unstable_noStore as noStore } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
    SORTS,
    type SortKey,
    areasForSort,
    titleCase,
    normArea,
    getAreaOrderForSort,
} from "@/lib/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AutoSubmitSelect from "./AutoSubmitSelect";
import NotificationPrompt from "./NotificationPrompt";
import InstallPrompt from "./InstallPrompt";
import ShareButton from "./ShareButton";

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

function isSundayISO(iso: string) {
    // Use TZ so "Sunday" matches Chicago, not UTC
    const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        weekday: "short",
    }).format(dateFromISO(iso));

    return weekday === "Sun";
}

// function nextNonSundayISO(fromIso: string) {
//     let iso = addDaysISO(fromIso, 1);
//     while (isSundayISO(iso)) iso = addDaysISO(iso, 1);
//     return iso;
// }

function weekdayNameISO(iso: string) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        weekday: "long",
    }).format(dateFromISO(iso));
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams:
        | Promise<{ sort?: string; ann?: string; beta?: string }>
        | { sort?: string; ann?: string; beta?: string };
}) {
    noStore();
    const sp = await Promise.resolve(searchParams);

    const user = await getSessionUser();
    if (!user) redirect("/login");

    // Update last_signed_in and sign_in_count on every visit
    // Catches PWA users who stay signed in via long-lived session cookies
    await sql`
        update users
        set
            last_signed_in = now(),
            sign_in_count = coalesce(sign_in_count, 0) + 1
        where employee_id = ${user.employee_id}
            and (last_signed_in is null or last_signed_in < now() - interval '1 hour')
    `;

    const raw = String(sp.sort ?? user.sort);
    const selectedSortRaw = raw.trim().toLowerCase();
    const selectedSort = (SORTS as readonly string[]).includes(selectedSortRaw)
        ? (selectedSortRaw as SortKey)
        : (user.sort as SortKey);

    const todayIso = todayISOChicago();
    const windowStartIso = todayIso;
    const windowEndIso = addDaysISO(todayIso, 6);

    const weekRows = await sql<
        {
            sort: string;
            area: string;
            work_date: string;
            start_time: string;
            notes: string | null;
            updated_at: Date | string;
            updated_by: string | null;
            updated_by_name: string | null;
        }[]
    >`
    select
        st.sort,
        st.area,
        st.work_date::text as work_date,
        st.start_time,
        st.notes,
        st.updated_at,
        st.updated_by,
        u.full_name as updated_by_name
    from area_start_times st
    left join users u on u.employee_id = st.updated_by
    where st.location_id = ${user.location_id}
        and lower(trim(st.sort)) = ${selectedSort}
        and st.work_date between ${windowStartIso}::date and ${windowEndIso}::date
    order by st.area asc, st.work_date asc
    `;
    const weekRowsOneSort = weekRows.filter(
        r => r.sort.trim().toLowerCase() === selectedSort,
    );

    type WeekRow = (typeof weekRows)[number];

    // For non-Day sorts, check if Day sort has Sunday start times this week
    const sundayIsos = Array.from({ length: 7 }, (_, i) =>
        addDaysISO(todayIso, i),
    ).filter(iso => isSundayISO(iso));

    const daySundayRows =
        selectedSort !== "day" && sundayIsos.length > 0
            ? await sql<
                  { work_date: string; area: string; start_time: string }[]
              >`
                select work_date::text as work_date, area, start_time
                from area_start_times
                where location_id = ${user.location_id}
                and lower(trim(sort)) = 'day'
                and work_date = any(${sundayIsos}::date[])
            `
            : [];

    const daySundayDates = new Set(
        daySundayRows.map(r => String(r.work_date).slice(0, 10)),
    );

    const byArea = new Map<string, Map<string, WeekRow>>();

    for (const r of weekRowsOneSort) {
        const areaKey = normArea(r.area) || "unknown";
        const iso = String(r.work_date).slice(0, 10);

        if (!byArea.has(areaKey)) byArea.set(areaKey, new Map());
        byArea.get(areaKey)!.set(iso, r);
    }

    const mySortRaw = normArea(user.sort);
    const mySort = (SORTS as readonly string[]).includes(mySortRaw)
        ? (mySortRaw as SortKey)
        : selectedSort;
    const viewingMySort = selectedSort === mySort;

    const myAreaKey = normArea(user.area);

    // canonical list of areas for the selected sort
    const canonicalAreas = getAreaOrderForSort(user.location_config, selectedSort);

    // guarantee the UI has an entry for every area (even if DB has 0 rows)
    for (const area of canonicalAreas) {
        if (!byArea.has(area)) byArea.set(area, new Map());
    }

    // UI order: location's configured area order, optionally pin "my area" only when viewing my sort
    const areasOrdered =
        viewingMySort && myAreaKey && canonicalAreas.includes(myAreaKey)
            ? [myAreaKey, ...canonicalAreas.filter(a => a !== myAreaKey)]
            : canonicalAreas;

    const annChoices = await sql<
        {
            id: number;
            message: string;
            updated_at: Date | string;
            updated_by: string | null;
            updated_by_name: string | null;
            area: string; // non-null
        }[]
    >`
    select distinct on (lower(trim(a.area)))
        a.id,
        a.message,
        a.updated_at,
        a.updated_by,
        a.area,
        u.full_name as updated_by_name
    from announcements a
    left join users u on u.employee_id = a.updated_by
    where a.location_id = ${user.location_id}
        and lower(trim(a.sort)) = ${selectedSort}
        and a.area is not null
    order by
        lower(trim(a.area)),
        a.updated_at desc,
        a.id desc
    `;

    // configured area order for this sort at this location
    const areaOrder = areasForSort(user.location_config, selectedSort).map(a =>
        normArea(a),
    );
    const areaIndex = new Map(areaOrder.map((a, i) => [a, i]));

    // Only announcements whose area exists in this location's config for that sort
    const orderedAnnouncementsStrict = annChoices
        .filter(a => areaIndex.has(normArea(a.area)))
        .sort((a, b) => {
            const ai = areaIndex.get(normArea(a.area)) ?? 9999;
            const bi = areaIndex.get(normArea(b.area)) ?? 9999;
            if (ai !== bi) return ai - bi;
            // extra stability
            return (b.id ?? 0) - (a.id ?? 0);
        });

    const annParam = String((sp as any).ann ?? "")
        .trim()
        .toLowerCase();

    const annLookup = new Map(
        orderedAnnouncementsStrict.map(a => [normArea(a.area), a]),
    );

    // Default = user's area in configured area order that has an announcement
    const myAreaAnn = myAreaKey ? annLookup.get(myAreaKey) : undefined;
    const firstAreaAnn =
        areaOrder.map(a => annLookup.get(a)).find(Boolean) ??
        orderedAnnouncementsStrict[0] ??
        undefined;
    const defaultAnn = myAreaAnn ?? firstAreaAnn;

    // Final chosen announcement
    const ann = annParam ? (annLookup.get(annParam) ?? defaultAnn) : defaultAnn;

    const hourNow = chicagoHour();
    const isAfterSort = hourNow >= BUSINESS_DAY_CUTOFF_HOUR;
    const baseIso = isAfterSort ? addDaysISO(todayIso, 1) : todayIso;

    const myDetailRows =
        selectedSort === mySort
            ? weekRowsOneSort
            : await sql<
                  {
                      area: string;
                      work_date: string;
                      start_time: string;
                      notes: string | null;
                      updated_at: Date | string;
                  }[]
              >`
        select area, work_date::text as work_date, start_time, notes, updated_at
        from area_start_times
        where location_id = ${user.location_id}
          and lower(trim(sort)) = ${mySort}
          and lower(trim(area)) = ${myAreaKey ?? ""}
          and work_date between ${windowStartIso}::date and ${windowEndIso}::date
      `;

    // "Next sort" is data-driven per area/sort rather than a fixed weekday
    // rule: pick the earliest upcoming date (>= baseIso) that already has a
    // posted start time. If nothing's posted yet for the days ahead, fall
    // back to whichever weekday was the first one with a posted time last
    // week for this same area/sort.
    const WEEKDAY_ORDER_MON_FIRST = [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
    ];

    function weekdayShortISO(iso: string) {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: TZ,
            weekday: "short",
        }).format(dateFromISO(iso));
    }

    function nextOccurrenceOfWeekday(fromIso: string, targetWeekday: string) {
        let iso = fromIso;
        for (let i = 0; i < 7; i++) {
            if (weekdayShortISO(iso) === targetWeekday) return iso;
            iso = addDaysISO(iso, 1);
        }
        return fromIso;
    }

    const myUpcomingWithTime = myAreaKey
        ? myDetailRows
              .filter(
                  r =>
                      normArea(r.area) === myAreaKey &&
                      r.start_time &&
                      String(r.work_date).slice(0, 10) >= baseIso,
              )
              .sort((a, b) =>
                  String(a.work_date).localeCompare(String(b.work_date)),
              )
        : [];

    let detailIso = myUpcomingWithTime[0]
        ? String(myUpcomingWithTime[0].work_date).slice(0, 10)
        : null;

    if (!detailIso && myAreaKey) {
        const prevWeekStartIso = addDaysISO(windowStartIso, -7);
        const prevWeekEndIso = addDaysISO(windowStartIso, -1);

        const prevWeekRows = await sql<{ work_date: string }[]>`
            select work_date::text as work_date
            from area_start_times
            where location_id = ${user.location_id}
              and lower(trim(sort)) = ${mySort}
              and lower(trim(area)) = ${myAreaKey}
              and start_time is not null
              and work_date between ${prevWeekStartIso}::date and ${prevWeekEndIso}::date
        `;

        if (prevWeekRows.length > 0) {
            const weekdaysPresent = prevWeekRows.map(r =>
                weekdayShortISO(String(r.work_date).slice(0, 10)),
            );
            const firstWeekdayOfWeek = weekdaysPresent.sort(
                (a, b) =>
                    WEEKDAY_ORDER_MON_FIRST.indexOf(a) -
                    WEEKDAY_ORDER_MON_FIRST.indexOf(b),
            )[0];
            detailIso = nextOccurrenceOfWeekday(baseIso, firstWeekdayOfWeek);
        }
    }

    detailIso = detailIso ?? baseIso;

    // Label
    const daysFromToday = Math.round(
        (dateFromISO(detailIso).getTime() - dateFromISO(todayIso).getTime()) /
            86400000,
    );
    const detailLabel =
        daysFromToday === 0
            ? "Today"
            : daysFromToday === 1
              ? "Tomorrow"
              : weekdayNameISO(detailIso);

    const detailRow = myAreaKey
        ? myDetailRows.find(
              r =>
                  normArea(r.area) === myAreaKey &&
                  String(r.work_date).slice(0, 10) === detailIso,
          )
        : undefined;

    return (
        <main className='mx-auto w-full max-w-5xl px-4 py-10'>
            {/* Hidden element for client components to read user sort */}
            <span
                id='user-sort-data'
                data-sort={user.sort}
                className='hidden'
            />

            {/* Header */}
            <header className='flex items-start justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold tracking-tight'>
                        Hi
                        {user.full_name
                            ? `, ${user.full_name.split(" ")[0]}`
                            : ""}
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Week of {monthDayISO(windowStartIso)} –{" "}
                        {monthDayISO(windowEndIso)}
                    </p>
                </div>

                <div className='flex items-center gap-3'>
                    <ShareButton />

                    {user.role === "supervisor" ? (
                        <Button asChild>
                            <Link href='/supervisor'>Supervisor Panel</Link>
                        </Button>
                    ) : null}
                </div>
            </header>

            <Separator className='my-6' />

            <InstallPrompt />
            <NotificationPrompt />

            {/* Announcement */}
            {orderedAnnouncementsStrict.length ? (
                <Alert className='mb-6'>
                    <AlertTitle className='flex items-center gap-2'>
                        Announcements{" "}
                        <Badge variant='secondary'>Latest by area</Badge>
                        {orderedAnnouncementsStrict.length > 1 ? (
                            <form
                                action='/dashboard'
                                method='get'
                                className='ml-auto flex items-center gap-2'>
                                <input
                                    type='hidden'
                                    name='beta'
                                    value='1'
                                />
                                <input
                                    type='hidden'
                                    name='sort'
                                    value={selectedSort}
                                />

                                <AutoSubmitSelect
                                    name='ann'
                                    defaultValue={
                                        ann?.area ? normArea(ann.area) : ""
                                    }
                                    className='h-8 rounded-md border border-input bg-transparent px-2 text-xs'>
                                    {orderedAnnouncementsStrict.map(a => (
                                        <option
                                            key={a.id}
                                            value={normArea(a.area)}>
                                            {titleCase(normArea(a.area))}
                                        </option>
                                    ))}
                                </AutoSubmitSelect>
                            </form>
                        ) : null}
                    </AlertTitle>

                    <AlertDescription className='mt-2 space-y-2'>
                        <div className='text-sm'>{ann?.message}</div>
                        <div className='text-xs text-muted-foreground'>
                            Updated {ann ? fmtUpdatedAt(ann.updated_at) : ""}
                            {" • "}
                            Posted by{" "}
                            {ann?.updated_by_name ||
                                ann?.updated_by ||
                                "unknown"}
                        </div>
                    </AlertDescription>
                </Alert>
            ) : (
                /* No announcements */
                <Alert className='mb-6'>
                    <AlertTitle>No Announcements</AlertTitle>
                    <AlertDescription className='mt-2'>
                        A supervisor hasn&#39;t posted anything yet.
                    </AlertDescription>
                </Alert>
            )}

            {/* Week strip */}
            <section className='space-y-6'>
                <div className='flex items-center'>
                    <div className='flex font-semibold items-center mr-2'>
                        <form
                            action='/dashboard'
                            method='get'
                            className='flex items-center gap-2'>
                            <input
                                type='hidden'
                                name='beta'
                                value='1'
                            />

                            <AutoSubmitSelect
                                name='sort'
                                defaultValue={selectedSort}
                                className='h-9 rounded-md border border-input bg-transparent px-3 text-md'>
                                <option value='preload'>Preload</option>
                                <option value='sunrise'>Sunrise</option>
                                <option value='day'>Day</option>
                                <option value='twilight'>Twilight</option>
                                <option value='midnight'>Midnight</option>
                            </AutoSubmitSelect>
                        </form>
                    </div>
                    <div className='flex flex-1 items-center justify-between'>
                        <div className='font-semibold'>Sort</div>
                        <span className='text-xs text-muted-foreground'>
                            Today is highlighted
                        </span>
                    </div>
                </div>
                <span className='ml-3 text-xs text-muted-foreground'>
                    Scroll vertically for other areas
                </span>

                {/* VERTICAL SCROLLER of AREAS */}
                <div className='h-[300px] overflow-y-auto pr-1 space-y-8'>
                    {areasOrdered.map(area => {
                        const mapForArea = byArea.get(area)!;

                        const areaDays = Array.from({ length: 7 }, (_, i) => {
                            const iso = addDaysISO(todayIso, i);
                            return { iso, row: mapForArea.get(iso) };
                        });

                        return (
                            <Card
                                key={area}
                                className='border-primary/10'>
                                <CardHeader className='space-y-1'>
                                    <CardTitle className='text-base flex items-center justify-between'>
                                        {area === "da" ? "DA" : titleCase(area)}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className='space-y-3'>
                                    {/* HORIZONTAL DAY SCROLLER */}
                                    <div className='flex gap-4 overflow-x-auto pb-2'>
                                        {areaDays.map(({ iso, row }) => {
                                            const isToday = iso === todayIso;
                                            const time = row?.start_time
                                                ? String(row.start_time).slice(
                                                      0,
                                                      5,
                                                  )
                                                : null;

                                            const updatedAt = row?.updated_at
                                                ? fmtUpdatedAt(row.updated_at)
                                                : null;

                                            return (
                                                <Card
                                                    key={`${area}-${iso}`}
                                                    className={[
                                                        "shrink-0",
                                                        isToday
                                                            ? "w-80"
                                                            : "w-56 opacity-80",
                                                        isToday
                                                            ? "border-primary/40 shadow-md"
                                                            : "hover:opacity-100",
                                                    ].join(" ")}>
                                                    <CardHeader className='space-y-2'>
                                                        <div className='flex items-center justify-between'>
                                                            <CardTitle className='text-base'>
                                                                {dayLabelISO(
                                                                    iso,
                                                                )}{" "}
                                                                <span className='text-muted-foreground font-normal'>
                                                                    {monthDayISO(
                                                                        iso,
                                                                    )}
                                                                </span>
                                                            </CardTitle>
                                                            {isToday ? (
                                                                <Badge>
                                                                    Today
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent className='space-y-3'>
                                                        {(() => {
                                                            const isSunday =
                                                                isSundayISO(
                                                                    iso,
                                                                );
                                                            const isDaySort =
                                                                selectedSort ===
                                                                "day";
                                                            const daySundayPosted =
                                                                isSunday &&
                                                                !isDaySort &&
                                                                daySundayDates.has(
                                                                    iso,
                                                                );

                                                            if (time) {
                                                                return (
                                                                    <div
                                                                        className={
                                                                            isToday
                                                                                ? "text-4xl font-semibold"
                                                                                : "text-3xl font-semibold"
                                                                        }>
                                                                        {time}
                                                                    </div>
                                                                );
                                                            }
                                                            if (
                                                                daySundayPosted
                                                            ) {
                                                                return (
                                                                    <a
                                                                        href={`/dashboard?sort=day`}
                                                                        className='text-sm text-blue-600 underline hover:text-blue-800'>
                                                                        View
                                                                        Sunday
                                                                        start
                                                                        time →
                                                                    </a>
                                                                );
                                                            }
                                                            return (
                                                                <div className='text-sm text-muted-foreground'>
                                                                    No start
                                                                    time posted
                                                                    yet.
                                                                </div>
                                                            );
                                                        })()}

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
                                                                Updated{" "}
                                                                {updatedAt}
                                                            </div>
                                                        ) : null}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Detail card (area-scoped) */}
                {user.area ? (
                    <Card className='border-primary/30'>
                        <CardHeader>
                            <CardTitle className='text-base flex items-center justify-between'>
                                {detailLabel} ({monthDayISO(detailIso)})
                                <Badge
                                    className={
                                        isAfterSort
                                            ? "bg-yellow-300 text-slate-950"
                                            : "bg-green-400 text-slate-950"
                                    }>
                                    {isAfterSort ? "Next Sort" : "Current Sort"}
                                </Badge>
                            </CardTitle>

                            <div className='text-xs text-muted-foreground'>
                                <span className='block font-medium'>
                                    Your Sort: {titleCase(normArea(user.sort))}
                                </span>
                                <span className='block font-medium'>
                                    Your Area: {titleCase(normArea(user.area))}
                                </span>
                            </div>
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

                            {detailRow?.updated_at ? (
                                <div className='text-xs text-muted-foreground'>
                                    Updated {fmtUpdatedAt(detailRow.updated_at)}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : null}
            </section>
        </main>
    );
}
