import { unstable_noStore as noStore } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { setAnnouncementAction, upsertStartTimeAction } from "@/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupervisorPage() {
    noStore();
    const user = await getSessionUser();
    if (!user) redirect("/login");
    if (user.role !== "supervisor") redirect("/dashboard");

    const recent = await sql`
    select employee_id, work_date, start_time, notes, updated_at, updated_by
    from start_times
    order by updated_at desc
    limit 20
  `;

    return (
        <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
            <h1>Supervisor Panel</h1>

            <section
                style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    marginBottom: 16,
                }}>
                <h2>Set Announcement</h2>
                <form
                    action={async formData => {
                        "use server";
                        const message = String(formData.get("message") || "");
                        await setAnnouncementAction({
                            message,
                            updatedBy: user.employee_id,
                        });
                    }}
                    style={{ display: "grid", gap: 8 }}>
                    <textarea
                        name='message'
                        rows={3}
                        placeholder='Example: Sort begins at 5:30am today.'
                    />
                    <button type='submit'>Post</button>
                </form>
            </section>

            <section
                style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    marginBottom: 16,
                }}>
                <h2>Set Employee Start Time</h2>
                <form
                    action={async formData => {
                        "use server";
                        const employeeId = String(
                            formData.get("employeeId") || "",
                        ).trim();
                        const workDate = String(
                            formData.get("workDate") || "",
                        ).trim();
                        const startTime = String(
                            formData.get("startTime") || "",
                        ).trim();
                        const notes = String(formData.get("notes") || "");

                        await upsertStartTimeAction({
                            employeeId,
                            workDate,
                            startTime,
                            notes,
                            updatedBy: user.employee_id,
                        });
                    }}
                    style={{
                        display: "grid",
                        gap: 8,
                        gridTemplateColumns: "1fr 1fr 1fr",
                    }}>
                    <input
                        name='employeeId'
                        placeholder='Employee ID (7 digits)'
                    />
                    <input
                        name='workDate'
                        placeholder='YYYY-MM-DD'
                    />
                    <input
                        name='startTime'
                        placeholder='HH:MM (24h)'
                    />
                    <input
                        name='notes'
                        placeholder='Notes (optional)'
                        style={{ gridColumn: "1 / -1" }}
                    />
                    <button
                        type='submit'
                        style={{ gridColumn: "1 / -1" }}>
                        Save
                    </button>
                </form>
            </section>

            <section style={{ padding: 12, border: "1px solid #ddd" }}>
                <h2>Recent Updates</h2>
                <div style={{ display: "grid", gap: 8 }}>
                    {recent.map(r => (
                        <div
                            key={`${r.employee_id}-${r.work_date}`}
                            style={{ padding: 10, border: "1px solid #eee" }}>
                            <strong>{r.employee_id}</strong> •{" "}
                            {String(r.work_date)} •{" "}
                            {String(r.start_time).slice(0, 5)}
                            {r.notes ? <div>Notes: {r.notes}</div> : null}
                            <small>
                                Updated{" "}
                                {new Date(r.updated_at).toLocaleString()} by{" "}
                                {r.updated_by || "unknown"}
                            </small>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
