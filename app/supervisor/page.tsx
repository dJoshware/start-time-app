import { unstable_noStore as noStore } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import SupervisorClient from "./supervisor-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type RecentRow = {
    employee_id: string;
    work_date: Date | string;
    start_time: string;
    notes: string | null;
    updated_at: Date | string;
    updated_by: string | null;
    updated_by_name: string | null;
};

export default async function SupervisorPage() {
    noStore();

    const user = await getSessionUser();
    if (!user) redirect("/login");
    if (user.role !== "supervisor") redirect("/dashboard");

    const recent = await sql<RecentRow[]>`
        select
            st.area,
            st.work_date,
            st.start_time,
            st.notes,
            st.updated_at,
            st.updated_by,
            u.full_name as updated_by_name
        from area_start_times st
        left join users u on u.employee_id = st.updated_by
        where st.area = 'preload'
        order by st.updated_at desc
        limit 20
    `;

    return (
        <SupervisorClient
            supervisorId={user.employee_id}
            supervisorName={user.full_name ?? user.employee_id}
            recent={recent}
        />
    );
}
