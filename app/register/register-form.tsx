"use client";

import * as React from "react";
import type { RegisterState } from "@/actions";
import { SORTS, areasForSort, titleCase, type LocationConfig } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Location = {
    id: number;
    name: string;
    lat: number | null;
    lng: number | null;
    config: LocationConfig;
};

function haversineMiles(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
) {
    const R = 3958.8; // earth radius, miles
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

export default function RegisterForm({
    action,
}: {
    action: (
        prevState: RegisterState | null,
        formData: FormData,
    ) => Promise<RegisterState>;
}) {
    const [state, formAction, isPending] = React.useActionState<
        RegisterState | null,
        FormData
    >(action, null);

    const [locations, setLocations] = React.useState<Location[]>([]);
    const [locationsLoaded, setLocationsLoaded] = React.useState(false);
    const [locationId, setLocationId] = React.useState("");
    const [geoStatus, setGeoStatus] = React.useState<
        "pending" | "suggested" | "denied" | "unavailable" | "insecure"
    >("pending");

    const [sort, setSort] = React.useState("");
    const [role, setRole] = React.useState<"employee" | "supervisor">(
        "employee",
    );
    const [inviteCode, setInviteCode] = React.useState("");
    const [area, setArea] = React.useState("");

    const [employeeId, setEmployeeId] = React.useState("");
    const [fullName, setFullName] = React.useState("");
    const [pin, setPin] = React.useState("");
    const [isPWA, setIsPWA] = React.useState(false);

    const locationSelectRef = React.useRef<HTMLSelectElement>(null);
    const sortSelectRef = React.useRef<HTMLSelectElement>(null);
    const roleSelectRef = React.useRef<HTMLSelectElement>(null);
    const areaSelectRef = React.useRef<HTMLSelectElement>(null);

    React.useEffect(() => {
        setIsPWA(window.matchMedia("(display-mode: standalone)").matches);
    }, []);

    // React 19's form actions call form.reset() after every submission.
    // React reliably re-syncs controlled <input> values against that, but
    // not <select> — so after a failed submit the dropdowns visually blank
    // out even though our state didn't change. Force them back in sync.
    React.useEffect(() => {
        if (state?.ok === false) {
            if (locationSelectRef.current) locationSelectRef.current.value = locationId;
            if (sortSelectRef.current) sortSelectRef.current.value = sort;
            if (roleSelectRef.current) roleSelectRef.current.value = role;
            if (areaSelectRef.current) areaSelectRef.current.value = area;
        }
    }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load active locations
    React.useEffect(() => {
        fetch("/api/locations")
            .then(res => res.json())
            .then((data: { locations: Location[] }) => {
                setLocations(data.locations ?? []);
                setLocationsLoaded(true);
            })
            .catch(() => setLocationsLoaded(true));
    }, []);

    // Suggest nearest location via geolocation once locations are loaded
    React.useEffect(() => {
        if (!locationsLoaded || locations.length === 0 || geoStatus !== "pending")
            return;

        if (!window.isSecureContext) {
            // Geolocation is silently blocked on non-https/non-localhost
            // origins (e.g. iOS Safari over a LAN IP) — don't even attempt it.
            setGeoStatus("insecure");
            return;
        }
        if (!("geolocation" in navigator)) {
            setGeoStatus("unavailable");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                let nearest: Location | null = null;
                let nearestDist = Infinity;

                for (const loc of locations) {
                    if (loc.lat == null || loc.lng == null) continue;
                    const dist = haversineMiles(
                        latitude,
                        longitude,
                        loc.lat,
                        loc.lng,
                    );
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = loc;
                    }
                }

                if (nearest) {
                    setLocationId(String(nearest.id));
                    setGeoStatus("suggested");
                } else {
                    setGeoStatus("unavailable");
                }
            },
            err => {
                setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
            },
            { timeout: 8000 },
        );
    }, [locationsLoaded, locations, geoStatus]);

    const selectedLocation = locations.find(l => String(l.id) === locationId);

    const sortOptions: string[] =
        selectedLocation?.config.sorts ?? (SORTS as readonly string[]).slice();
    const areaOptions = selectedLocation
        ? areasForSort(selectedLocation.config, sort)
        : [];

    // Keep sort/area valid as location/sort changes
    React.useEffect(() => {
        if (sort && !sortOptions.includes(sort)) setSort("");
    }, [locationId]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (area && !areaOptions.includes(area)) setArea("");
    }, [sort, locationId]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <main className='min-h-screen flex items-center justify-center bg-muted/30 p-4'>
            <Card className='w-full max-w-md'>
                <CardHeader>
                    <CardTitle className='text-xl'>
                        UPS Employee Registration
                    </CardTitle>
                </CardHeader>

                <CardContent className='space-y-4'>
                    {state?.ok === false ? (
                        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
                            {state.message}
                        </div>
                    ) : null}

                    <form
                        action={formAction}
                        className='space-y-3'>
                        <input
                            type='hidden'
                            name='isPWA'
                            value={isPWA ? "true" : "false"}
                        />

                        <div className='space-y-1'>
                            <Label htmlFor='locationId'>Location / Hub</Label>
                            <select
                                ref={locationSelectRef}
                                id='locationId'
                                name='locationId'
                                value={locationId}
                                onChange={e => setLocationId(e.target.value)}
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'>
                                <option value=''>Select your hub</option>
                                {locations.map(l => (
                                    <option
                                        key={l.id}
                                        value={l.id}>
                                        {l.name}
                                    </option>
                                ))}
                            </select>
                            <p className='text-xs text-muted-foreground'>
                                {!locationsLoaded || geoStatus === "pending"
                                    ? "Detecting nearest hub…"
                                    : geoStatus === "suggested"
                                      ? "We suggested the closest hub based on your location — change it if it's wrong."
                                      : geoStatus === "denied"
                                        ? "Location access was denied — please select your hub manually."
                                        : geoStatus === "insecure"
                                          ? "Location detection needs a secure (https) connection here — please select your hub manually."
                                          : "Couldn't detect your location — please select your hub manually."}
                            </p>
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='sort'>Sort</Label>
                            <select
                                ref={sortSelectRef}
                                id='sort'
                                name='sort'
                                value={sort}
                                onChange={e => setSort(e.target.value)}
                                disabled={!locationId}
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm capitalize'>
                                <option value=''>Select sort</option>
                                {sortOptions.map(s => (
                                    <option
                                        key={s}
                                        value={s}>
                                        {titleCase(s)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='role'>Role</Label>
                            <select
                                ref={roleSelectRef}
                                id='role'
                                name='role'
                                value={role}
                                onChange={e =>
                                    setRole(e.target.value as "employee" | "supervisor")
                                }
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'>
                                <option value='employee'>Employee</option>
                                <option value='supervisor'>Supervisor</option>
                            </select>
                        </div>

                        {role === "supervisor" ? (
                            <div className='space-y-1'>
                                <Label htmlFor='inviteCode'>
                                    Supervisor Invite Code
                                </Label>
                                <Input
                                    id='inviteCode'
                                    name='inviteCode'
                                    value={inviteCode}
                                    onChange={e =>
                                        setInviteCode(
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    aria-invalid={
                                        state?.ok === false &&
                                        state.field === "inviteCode"
                                    }
                                    placeholder='Code from your supervisor'
                                />
                                <p className='text-xs text-muted-foreground'>
                                    Ask an existing supervisor at your hub for
                                    a code. Employee accounts don&apos;t need
                                    one.
                                </p>
                            </div>
                        ) : null}

                        <div className='space-y-1'>
                            <Label htmlFor='area'>Area</Label>
                            <select
                                ref={areaSelectRef}
                                id='area'
                                name='area'
                                value={area}
                                onChange={e => setArea(e.target.value)}
                                disabled={!sort}
                                className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'>
                                <option value=''>Select area</option>
                                {areaOptions.map(a => (
                                    <option
                                        key={a}
                                        value={a}>
                                        {titleCase(a)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='fullName'>Full name</Label>
                            <Input
                                id='fullName'
                                name='fullName'
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder='First Last'
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='employeeId'>Employee ID</Label>
                            <Input
                                id='employeeId'
                                name='employeeId'
                                inputMode='numeric'
                                placeholder='1234567'
                                maxLength={7}
                                value={employeeId}
                                aria-invalid={
                                    state?.ok === false &&
                                    state.field === "employeeId"
                                }
                                onChange={e =>
                                    setEmployeeId(
                                        e.target.value.replace(/\D/g, ""),
                                    )
                                }
                            />
                        </div>

                        <div className='space-y-1'>
                            <Label htmlFor='pin'>Create a PIN</Label>
                            <Input
                                id='pin'
                                name='pin'
                                type='password'
                                inputMode='numeric'
                                placeholder='4-8 digits'
                                value={pin}
                                aria-invalid={
                                    state?.ok === false && state.field === "pin"
                                }
                                onChange={e => setPin(e.target.value)}
                            />
                        </div>

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isPending}>
                            {isPending ? "Registering..." : "Register"}
                        </Button>
                    </form>

                    <p className='text-center text-sm text-muted-foreground'>
                        Already registered?{" "}
                        <a
                            href='/login'
                            className='font-medium text-blue-600 hover:underline'>
                            Sign in
                        </a>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
