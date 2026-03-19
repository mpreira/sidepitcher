export const PLAYER_POSITIONS = [
    "première ligne",
    "talonneur",
    "deuxième ligne",
    "troisième ligne",
    "demi de mêlée",
    "demi d'ouverture",
    "centre",
    "ailier",
    "arrière",
] as const;

export type PlayerPosition = typeof PLAYER_POSITIONS[number];

export interface Player {
    id: string;
    name: string;
    number?: number; // optional jersey number
    positions?: PlayerPosition[];
    photoUrl?: string;
    nationality?: string; // ISO 3166-1 alpha-2 code
}

export interface CompositionEntry {
    player: Player;
    number: number; // jersey number
}

export interface Roster {
    id: string;
    name: string;
    nickname?: string;
    color?: string;
    logo?: string;
    players: Player[]; // effectif global
    category?: 'Top 14' | 'Pro D2';
}

export interface Team {
    id: string;              // nouveau : « nomDuRoster_journee »
    name: string;
    nickname?: string;
    color?: string;
    logo?: string;
    rosterId: string;        // which roster this team draws from
    captainPlayerId?: string | null;
    starters: CompositionEntry[]; // numbers 1–15
    substitutes: CompositionEntry[]; // numbers 16–23
}

export interface EventSummaryTableStat {
    label: string;
    value: number;
}

export interface EventSummaryTableTeam {
    teamName: string;
    stats: EventSummaryTableStat[];
}

export interface EventSummaryTable {
    halfLabel: string;
    teams: [EventSummaryTableTeam, EventSummaryTableTeam];
}

export interface Event {
    type: string;
    time: number; // seconds since match start
    timelineHalf?: 1 | 2;
    timelineMinute?: number;
    timelineAdditionalMinute?: number;
    timelineSecond?: number;
    team?: Team;
    videoReason?: "essai" | "jeu déloyal";
    player?: Player;
    playerNumber?: number;
    concussion?: boolean;
    // for substitutions
    playerOut?: Player;
    playerOutNumber?: number;
    playerIn?: Player;
    playerInNumber?: number;
    // for half-time summaries
    summary?: string;
    summaryTable?: EventSummaryTable;
}
