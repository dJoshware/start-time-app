import crypto from 'crypto';
import { cookies } from 'next/headers';
import { sql } from './db';

const COOKIE_NAME = 'st_session';
const SECRET = process.env.SESSION_SECRET!;

function sign(payload: string) {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export async function setSession(employeeId: string) {
    const payload = `${employeeId}.${Date.now()}`;
    const sig = sign(payload);

    const c = await cookies();

    c.set(COOKIE_NAME, `${payload}.${sig}`, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });
}

export async function clearSession() {
    const c = await cookies();
    c.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export async function getSessionUser() {
    const c = await cookies();

    const raw = c.get(COOKIE_NAME)?.value;
    if (!raw) return null;

    const parts = raw.split('.');
    if (parts.length !== 3) return null;

    const [employeeId, ts, sig] = parts;
    const payload = `${employeeId}.${ts}`;
    if (sign(payload) !== sig) return null;

    const ageMs = Date.now() - Number(ts);
    if (Number.isNaN(ageMs) || ageMs > 7 * 24 * 60 * 60 * 1000) return null;

    const rows = await sql`
    select employee_id, role, full_name, active
    from users
    where employee_id = ${employeeId}
    limit 1
  `;
    const user = rows[0];
    if (!user?.active) return null;

    return user as {
        employee_id: string;
        role: 'employee' | 'supervisor';
        full_name: string | null;
        active: boolean;
    };
}
