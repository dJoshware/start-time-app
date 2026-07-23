import { unstable_noStore as noStore } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import SupervisorClient from "./supervisor-client";
import { type SortKey, type LocationConfig } from "@/lib/helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type RecentRow = {
    employee_id: string;
    work_date: string;
    start_time: string;
    notes: string | null;
    updated_at: Date | string;
    updated_by: string | null;
    updated_by_name: string | null;
    sort: string;
    area: string;
};

export type EmployeeRow = {
    employee_id: string;
    full_name: string | null;
    role: "employee" | "supervisor";
    active: boolean;
    created_at: Date | string;
    last_signed_in: Date | string | null;
    sign_in_count: number;
    sort: string;
    area: string | null;
};

export default async function SupervisorPage({
    searchParams,
}: {
    searchParams: Promise<{ area?: string }> | { area?: string };
}) {
    noStore();

    const user = await getSessionUser();
    if (!user) redirect("/login");
    if (user.role !== "supervisor") redirect("/dashboard");

    const sp = await Promise.resolve(searchParams);
    const selectedArea = (sp.area ?? user.area ?? "").trim();
    const areaFilter =
        selectedArea.toLowerCase() === "all" ? null : selectedArea;

    const recent = await sql<RecentRow[]>`
        select
            st.sort,
            st.area,
            st.work_date::text as work_date,
            st.start_time,
            st.notes,
            st.updated_at,
            st.updated_by,
            u.full_name as updated_by_name,
            coalesce(st.updated_by, '') as employee_id
        from area_start_times st
        left join users u on u.employee_id = st.updated_by
        where st.location_id = ${user.location_id}
            and st.sort = ${user.sort}
            ${areaFilter ? sql`and st.area = ${areaFilter}` : sql``}
        order by st.updated_at desc
        limit 20
    `;

    const employees = await sql<EmployeeRow[]>`
        select
            employee_id,
            full_name,
            role,
            active,
            created_at,
            last_signed_in,
            sign_in_count,
            sort,
            area
        from users
        where location_id = ${user.location_id}
            and lower(trim(sort)) = lower(trim(${user.sort}))
        order by created_at desc
    `;

    return (
        <SupervisorClient
            supervisorId={user.employee_id}
            supervisorName={user.full_name ?? "Supervisor"}
            supervisorSort={user.sort as SortKey}
            supervisorArea={user.area}
            locationConfig={user.location_config as LocationConfig}
            recent={recent}
            employees={employees}
        />
    );
}
