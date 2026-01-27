'use server';

import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { setSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData): Promise<void> {
    const employeeId = String(formData.get('employeeId') || '').trim();
    const pin = String(formData.get('pin') || '').trim();

    if (!/^\d{7}$/.test(employeeId)) {
        redirect("/login?error=" + encodeURIComponent("Employee ID must be 7 digits."));
    }
    if (pin.length < 4) {
        redirect("/login?error=" + encodeURIComponent("PIN must be at least 4 digits."));
    }

    const { rows } = await sql`
    select employee_id, pin_hash, active
    from users
    where employee_id = ${employeeId}
    limit 1
  `;

    const user = rows[0];
    if (!user?.active)
        redirect("/login?error=" + encodeURIComponent("Account not found or inactive."));

    const match = await bcrypt.compare(pin, user.pin_hash);
    if (!match) {
        redirect("/login?error=" + encodeURIComponent("Invalid credentials."));
    }

    await setSession(employeeId);
    redirect('/dashboard');
}

export async function upsertStartTimeAction(payload: {
    employeeId: string;
    workDate: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    notes?: string;
    updatedBy: string;
}) {
    // Server-side authorization happens in the supervisor page before calling this,
    // but we also validate basics here.
    if (!/^\d{7}$/.test(payload.employeeId)) throw new Error('Bad employee id');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.workDate))
        throw new Error('Bad date');
    if (!/^\d{2}:\d{2}$/.test(payload.startTime)) throw new Error('Bad time');

    await sql`
        insert into start_times (employee_id, work_date, start_time, notes, updated_by)
        values (${payload.employeeId}, ${payload.workDate}::date, ${payload.startTime}::time, ${payload.notes || ''}, ${payload.updatedBy})
        on conflict (employee_id, work_date)
        do update set start_time = excluded.start_time,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        updated_at = now()
  `;
}

export async function setAnnouncementAction(payload: {
    message: string;
    updatedBy: string;
}) {
    const message = payload.message.trim();
    if (!message) throw new Error('Message required');

    await sql`
    insert into announcements (message, updated_by)
    values (${message}, ${payload.updatedBy})
  `;
}
