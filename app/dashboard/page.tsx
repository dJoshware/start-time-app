import { getSessionUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default async function DashboardPage() {
    const user = await getSessionUser();
    if (!user) redirect("/login");

    const workDate = todayISO();

    const stRows = await sql`
    select work_date, start_time, notes, updated_at
    from start_times
    where employee_id = ${user.employee_id}
      and work_date = ${workDate}::date
    limit 1
  `;

    const annRows = await sql`
    select message, updated_at, updated_by
    from announcements
    order by updated_at desc
    limit 1
  `;

    const st = stRows[0];
    const ann = annRows[0];

    return (
        <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
            <h1>Hi{user.full_name ? `, ${user.full_name}` : ""}</h1>

            {ann ? (
                <section
                    style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        marginBottom: 16,
                    }}>
                    <strong>Announcement</strong>
                    <div>{ann.message}</div>
                    <small>
                        Updated {new Date(ann.updated_at).toLocaleString()}
                    </small>
                </section>
            ) : null}

            <section style={{ padding: 12, border: "1px solid #ddd" }}>
                <h2>Today ({workDate})</h2>
                {st ? (
                    <>
                        <div style={{ fontSize: 28 }}>
                            {String(st.start_time).slice(0, 5)}
                        </div>
                        {st.notes ? <div>Notes: {st.notes}</div> : null}
                        <small>
                            Last updated{" "}
                            {new Date(st.updated_at).toLocaleString()}
                        </small>
                    </>
                ) : (
                    <p>No start time posted yet.</p>
                )}
            </section>

            {user.role === "supervisor" ? (
                <p style={{ marginTop: 16 }}>
                    <Link href='/supervisor'>Supervisor panel</Link>
                </p>
            ) : null}
        </main>
    );
}
