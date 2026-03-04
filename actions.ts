'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { AREA_MAP, normArea } from '@/lib/helpers';
import bcrypt from 'bcryptjs';
import { setSession, getSessionUser } from '@/lib/auth';

const SORT_OVERRIDE_IDS = new Set(['7255540']); // must match client-side check in supervisor-client.tsx

function bad(message: string) {
    return { ok: false as const, message };
}

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

function canonicalAreaLabel(sort: string, input: string): string | null {
    const options = AREA_MAP[sort as keyof typeof AREA_MAP] ?? [];
    const want = normArea(input);

    // match against AREA_MAP labels (case/space insensitive)
    const hit = options.find(o => normArea(o.label) === want);
    return hit ? hit.label : null;
}

export async function setAnnouncementAction(
    _prev: { ok: boolean; message?: string } | null,
    formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
    const user = await requireSupervisor();

    const message = String(formData.get('message') || '').trim();
    if (!message)
        return { ok: false, message: 'Announcement message is required.' };

    if (!user.sort)
        return { ok: false, message: 'Your account is missing a sort.' };
    if (!user.area)
        return { ok: false, message: 'Your account is missing an area.' };

    await sql`
    insert into announcements (message, updated_by, sort, area, updated_at)
    values (${message}, ${user.employee_id}, ${user.sort}, ${user.area}, now())
  `;

    revalidatePath('/supervisor');
    revalidatePath('/dashboard');
    return { ok: true };
}

export async function upsertStartTimeAction(
    _prev: { ok: boolean; message?: string } | null,
    formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
    const user = await requireSupervisor();
    if (!user.sort)
        return { ok: false, message: 'Your account is missing a sort.' };

    const workDate = String(formData.get('workDate') || '').trim();
    const startTime = String(formData.get('startTime') || '').trim();
    const notesRaw = String(formData.get('notes') || '').trim();

    const pickedAreasRaw = formData
        .getAll('areas')
        .map(v => String(v).trim())
        .filter(Boolean);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate))
        return { ok: false, message: 'Work date must be YYYY-MM-DD.' };

    if (!/^\d{2}:\d{2}$/.test(startTime))
        return { ok: false, message: 'Start time must be HH:MM (24h).' };

    const rawAreas = Array.from(
        new Set([user.area ?? '', ...pickedAreasRaw].filter(Boolean)),
    );

    const areas = Array.from(
        new Set(
            rawAreas
                .map(a => canonicalAreaLabel(user.sort, a))
                .filter(Boolean) as string[],
        ),
    );

    if (areas.length === 0) {
        return { ok: false, message: 'No valid area selected for this sort.' };
    }

    // Either sequential (simple)...
    for (const area of areas) {
        await sql`
      insert into area_start_times
        (sort, area, work_date, start_time, notes, updated_by, updated_at)
      values
        (${user.sort}, ${area}, ${workDate}::date, ${startTime}::time, ${notesRaw || null}, ${user.employee_id}, now())
      on conflict (sort, area, work_date) do update
        set start_time = excluded.start_time,
            notes = excluded.notes,
            updated_by = excluded.updated_by,
            updated_at = now()
    `;
    }

    // ...or parallel (faster, still fine)
    // await Promise.all(areas.map(area => sql`...same insert...`));

    revalidatePath('/supervisor');
    revalidatePath('/dashboard');

    return {
        ok: true,
        message: `Saved ${startTime} for ${areas.length} area${areas.length === 1 ? '' : 's'}.`,
    };
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

    const rows = await sql<
        {
            employee_id: string;
            pin_hash: string;
            role: 'employee' | 'supervisor';
            active: boolean;
        }[]
    >`
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

    // Record successful login (only after PIN is correct)
    await sql`
        update users
        set
            last_signed_in = now(),
            sign_in_count = coalesce(sign_in_count, 0) + 1
        where employee_id = ${user.employee_id}
    `;

    await setSession(user.employee_id);
    redirect('/dashboard');
}

export async function upsertUserAction(_prev: any, formData: FormData) {
    const me = await requireSupervisor();

    const employeeId = String(formData.get('employeeId') || '').trim();
    const pin = String(formData.get('pin') || '').trim();
    const role = String(formData.get('role') || '').trim() as
        | 'employee'
        | 'supervisor';
    const fullName = String(formData.get('fullName') || '').trim();

    const area = String(formData.get('area') || '').trim();
    const subArea = String(formData.get('subArea') || '').trim();

    // Sort can be overridden only for specific supervisor IDs
    const requestedSort = String(formData.get('sort') || '').trim();
    const sortToUse =
        SORT_OVERRIDE_IDS.has(me.employee_id) && requestedSort
            ? requestedSort
            : me.sort;

    if (!/^\d{7}$/.test(employeeId))
        return bad('Employee ID must be exactly 7 digits.');
    if (!/^\d{4,8}$/.test(pin)) return bad('PIN must be 4–8 digits.');
    if (role !== 'employee' && role !== 'supervisor')
        return bad('Role must be employee or supervisor.');

    if (!sortToUse) return bad('Your account is missing a sort.');
    if (!area) return bad('Area is required.');
    if (!me.sort) return bad('Your account is missing a sort.');
    if (!area) return bad('Area is required.');

    const pinHash = await bcrypt.hash(pin, 10);

    await sql`
    insert into users (employee_id, pin_hash, role, full_name, sort, area, sub_area)
    values (${employeeId}, ${pinHash}, ${role}, ${fullName || null}, ${sortToUse}, ${area}, ${subArea || null})
    on conflict (employee_id) do update
      set pin_hash = excluded.pin_hash,
          role = excluded.role,
          full_name = excluded.full_name,
          sort = excluded.sort,
          area = excluded.area,
          sub_area = excluded.sub_area,
          active = true
  `;

    revalidatePath('/supervisor');
    return {
        ok: true as const,
        message: `Saved user ${employeeId} (${role}).`,
    };
}

export async function deleteUsersAction(
    _prev: { ok: boolean; message?: string } | null,
    formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
    const me = await requireSupervisor();

    const raw = String(formData.get('employeeIds') || '').trim();
    if (!raw) return { ok: false, message: 'No employees selected.' };

    let employeeIds: string[] = [];
    try {
        employeeIds = JSON.parse(raw);
    } catch {
        return { ok: false, message: 'Invalid employee selection payload.' };
    }

    employeeIds = employeeIds
        .filter(id => typeof id === 'string')
        .map(id => id.trim())
        .filter(id => /^\d{7}$/.test(id));

    if (employeeIds.length === 0) {
        return { ok: false, message: 'No valid employee IDs selected.' };
    }

    employeeIds = employeeIds.filter(id => id !== me.employee_id);
    if (employeeIds.length === 0) {
        return { ok: false, message: 'You cannot delete your own account.' };
    }

    try {
        await sql`
            delete from users
            where employee_id = any(${employeeIds}::text[])
                and sort = ${me.sort}
                and area = ${me.area}
            `;
    } catch (err: any) {
        // Most common failure: foreign key constraint
        return {
            ok: false,
            message:
                'Delete failed. This user likely has related records (announcements/start times). Either delete those first or change foreign keys to allow deleting users.',
        };
    }

    revalidatePath('/supervisor');
    return { ok: true, message: `Deleted ${employeeIds.length} user(s).` };
}
