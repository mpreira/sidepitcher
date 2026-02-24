/**
 * Local storage management for tracker team selections
 */

export interface SavedTeamSelection {
    championship: string;
    matchDay: number;
    team1Id: string;
    team2Id: string;
    savedAt: string;
}

const STORAGE_KEY_PREFIX = "tracker-teams";

function getStorageKey(championship: string, matchDay: number): string {
    return `${STORAGE_KEY_PREFIX}-${championship}-J${matchDay}`;
}

export function loadTrackerTeamSelection(
    championship: string,
    matchDay: number
): SavedTeamSelection | null {
    if (typeof window === "undefined") return null;

    try {
        const key = getStorageKey(championship, matchDay);
        const stored = localStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored) as SavedTeamSelection;
        }
    } catch (e) {
        console.error("Failed to load team selection from localStorage", e);
    }
    return null;
}

export function saveTrackerTeamSelection(
    championship: string,
    matchDay: number,
    team1Id: string,
    team2Id: string
): boolean {
    if (typeof window === "undefined") return false;

    try {
        const key = getStorageKey(championship, matchDay);
        const data: SavedTeamSelection = {
            championship,
            matchDay,
            team1Id,
            team2Id,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error("Failed to save team selection to localStorage", e);
        return false;
    }
}

export function clearTrackerTeamSelection(championship: string, matchDay: number): boolean {
    if (typeof window === "undefined") return false;

    try {
        const key = getStorageKey(championship, matchDay);
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error("Failed to clear team selection from localStorage", e);
        return false;
    }
}

