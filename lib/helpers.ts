export const SORTS = [
    'preload',
    'sunrise',
    'day',
    'twilight',
    'midnight',
] as const;
export type SortKey = (typeof SORTS)[number];

// Default area template new locations are seeded with. Existing locations
// store their own config in locations.config (areasBySort) and this is
// only used as a starting point / fallback.
export const DEFAULT_AREAS_BY_SORT: Record<SortKey, string[]> = {
    preload: ['package car', 'outbound', 'unload', 'smalls', 'tender'],
    sunrise: ['outbound', 'unload', 'tender'],
    day: ['outbound', 'unload', 'tender'],
    twilight: ['outbound', 'unload', 'tender'],
    midnight: ['outbound', 'unload', 'tender'],
};

export type LocationConfig = {
    sorts?: string[];
    areasBySort?: Record<string, string[]>;
};

export function areasForSort(
    config: LocationConfig | null | undefined,
    sort: string,
): string[] {
    return (
        config?.areasBySort?.[sort] ??
        DEFAULT_AREAS_BY_SORT[sort as SortKey] ??
        []
    );
}

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

export function getAreaOrderForSort(
    config: LocationConfig | null | undefined,
    sort: string,
) {
    return areasForSort(config, sort).map(a => normArea(a));
}
