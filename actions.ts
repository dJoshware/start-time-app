'use server';

import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { setSession, getSessionUser } from '@/lib/auth';

export type LoginState =
    | { ok: true }
    | { ok: false; message: string; field?: 'employeeId' | 'pin' };

async function requireSupervisor() {
    return getSessionUser().then(u => {
        if (!u) redirect('/login');
        if (u.role !== 'supervisor') redirect('/dashboard');
        return u;
    });
}

export async function setAnnouncementAction(
    _prevState: { ok: boolean; message?: string } | null,
    formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
    const user = await requireSupervisor();

    const message = String(formData.get('message') || '').trim();
    if (!message)
        return { ok: false, message: 'Announcement message is required.' };

    await sql`
    insert into announcements (message, updated_by)
    values (${message}, ${user.employee_id})
  `;

    return { ok: true };
}

export async function upsertPreloadStartTimeAction(
    _prevState: { ok: boolean; message?: string } | null,
    formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
    const user = await requireSupervisor();

    const workDate = String(formData.get('workDate') || '').trim();
    const startTime = String(formData.get('startTime') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
        return { ok: false, message: 'Work date must be YYYY-MM-DD.' };
    }
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
        return { ok: false, message: 'Start time must be HH:MM (24h).' };
    }

    await sql`
    insert into area_start_times (area, work_date, start_time, notes, updated_by, updated_at)
    values ('preload', ${workDate}::date, ${startTime}::time, ${notes || null}, ${user.employee_id}, now())
    on conflict (area, work_date) do update
      set start_time = excluded.start_time,
          notes = excluded.notes,
          updated_by = excluded.updated_by,
          updated_at = now()
  `;

    return { ok: true };
}

export async function loginAction(
    _prevState: LoginState | null,
    formData: FormData,
): Promise<LoginState> {
    const employeeId = String(formData.get('employeeId') || '').trim();
    const pin = String(formData.get('pin') || '').trim();

    if (!/^\d{7}$/.test(employeeId)) {
        return {
            ok: false,
            message: 'Employee ID must be 7 digits.',
            field: 'employeeId',
        };
    }
    if (!/^\d{4,}$/.test(pin)) {
        return {
            ok: false,
            message: 'PIN must be at least 4 digits.',
            field: 'pin',
        };
    }

    const rows = await sql`
    select employee_id, pin_hash, role, active
    from users
    where employee_id = ${employeeId}
    limit 1
  `;
    const user = rows[0];

    if (!user || !user.active) {
        return {
            ok: false,
            message: 'Employee ID not found or inactive.',
            field: 'employeeId',
        };
    }

    const ok = await bcrypt.compare(pin, user.pin_hash);
    if (!ok) {
        return { ok: false, message: 'Incorrect PIN.', field: 'pin' };
    }

    await setSession(user.employee_id);

    // If you want to redirect after success, do it here:
    redirect('/dashboard');
}
