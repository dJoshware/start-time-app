export const SORTS = [
    'preload',
    'sunrise',
    'day',
    'twilight',
    'midnight',
] as const;
export type SortKey = (typeof SORTS)[number];

export const AREA_MAP: Record<
    SortKey,
    { label: string; subAreas?: string[] }[]
> = {
    preload: [
        { label: 'package car', subAreas: ['metro center', 'east center'] },
        { label: 'outbound', subAreas: ['metro center', 'east center'] },
        { label: 'unload' /* subAreas: [] */ },
        { label: 'smalls' /* subAreas: ["Debag", "SLS1", "SLS2", "SLS3", "SLS4"] */ },
        { label: 'tender' /* subAreas: [] */ },
        // { label: 'da' },
    ],
    sunrise: [
        { label: 'outbound' /* subAreas: [] */ },
        { label: 'unload' /* subAreas: [] */ },
        { label: 'tender' /* subAreas: [] */ },
    ],
    day: [
        { label: 'outbound' /* subAreas: [] */ },
        { label: 'unload' /* subAreas: [] */ },
        { label: 'tender' /* subAreas: [] */ },
    ],
    twilight: [
        { label: 'outbound' /* subAreas: [] */ },
        { label: 'unload' /* subAreas: [] */ },
        { label: 'tender' /* subAreas: [] */ },
    ],
    midnight: [
        { label: 'outbound' /* subAreas: [] */ },
        { label: 'unload' /* subAreas: [] */ },
        { label: 'tender' /* subAreas: [] */ },
    ],
};

export function titleCase(s: string) {
    return s
        .trim()
        .split(/\s+/)
        .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
}

export function normArea(s: string | null | undefined) {
    return (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getAreaOrderForSort(sort: SortKey) {
    return (AREA_MAP[sort] ?? []).map(a => normArea(a.label));
}
