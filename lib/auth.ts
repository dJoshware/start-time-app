import crypto from 'crypto';
import { cookies } from 'next/headers';
import { sql } from './db';
import type { LocationConfig } from './helpers';

const COOKIE_NAME = 'st_session';
const SECRET = process.env.SESSION_SECRET!;
if (!SECRET) throw new Error('SESSION_SECRET is not set');

export type SessionUser = {
    employee_id: string;
    role: 'employee' | 'supervisor';
    full_name: string | null;
    sort: string;
    area: string | null;
    location_id: number;
    location_name: string;
    location_config: LocationConfig;
};

function sign(payload: string) {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export async function setSession(employeeId: string, extended = false) {
    const payload = `${employeeId}.${Date.now()}`;
    const sig = sign(payload);
    const c = await cookies();

    c.set(COOKIE_NAME, `${payload}.${sig}`, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: extended
            ? 90 * 24 * 60 * 60 // 90 days for PWA home screen users
            : 7 * 24 * 60 * 60, // 7 days for regular browser users
    });
}

export async function clearSession() {
    const c = await cookies();
    c.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
    const c = await cookies();

    const raw = c.get(COOKIE_NAME)?.value;
    if (!raw) return null;

    const parts = raw.split('.');
    if (parts.length !== 3) return null;

    const [employeeId, ts, sig] = parts;
    const payload = `${employeeId}.${ts}`;
    if (sign(payload) !== sig) return null;

    const ageMs = Date.now() - Number(ts);
    if (Number.isNaN(ageMs) || ageMs > 90 * 24 * 60 * 60 * 1000) return null;

    const rows = await sql<
        {
            employee_id: string;
            role: 'employee' | 'supervisor';
            full_name: string | null;
            sort: string;
            area: string | null;
            active: boolean;
            location_id: number;
            location_name: string;
            location_config: LocationConfig;
        }[]
    >`
      select
        u.employee_id, u.role, u.full_name, u.sort, u.area, u.active,
        u.location_id,
        l.name as location_name,
        l.config as location_config
      from users u
      join locations l on l.id = u.location_id
      where u.employee_id = ${employeeId}
      limit 1
    `;
    const user = rows[0];
    if (!user?.active) return null;

    const {
        employee_id,
        role,
        full_name,
        sort,
        area,
        location_id,
        location_name,
        location_config,
    } = user;
    return {
        employee_id,
        role,
        full_name,
        sort,
        area,
        location_id,
        location_name,
        location_config,
    };
}
