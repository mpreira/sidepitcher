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

export interface PlayerStats {
    points: number;
    essais: number;
    pied: number;
    tauxTransfo: number; // 0..100
    cartons: number;
    drops: number;
    matchs2526: number;
    titularisations2526: number;
}

export interface Player {
    id: string;
    name: string;
    number?: number; // optional jersey number
    positions?: PlayerPosition[];
    photoUrl?: string;
    nationality?: string; // ISO 3166-1 alpha-2 code
    stats?: PlayerStats;
}

export interface CompositionEntry {
    player: Player;
    number: number; // jersey number
}

export interface Coach {
    name: string;
    photoUrl?: string;
    nationality?: string; // ISO 3166-1 alpha-2 code
    club?: Team["name"];
}

export interface President {
    name: string;
    photoUrl?: string;
    nationality?: string; // ISO 3166-1 alpha-2 code
    club?: Team["name"];
}

export interface Title {
    competition: 'Top 14' | 'Pro D2 | Coupe d\'Europe' | 'Challenge Cup' | string;
    ranking: 'Vainqueur' | 'Finaliste' | string;
    year: number;
}

export interface MatchFixture {
    date: string;           // ISO date string (YYYY-MM-DD)
    time?: string;          // HH:MM
    opponent: string;
    competition?: string;
    isHome: boolean;
    location?: string;
    scoreHome?: number;
    scoreAway?: number;
    status?: "upcoming" | "played" | "cancelled";
}

export interface SeasonData {
    players: Player[];
    coach?: string;
    calendar?: MatchFixture[];
}

export const CURRENT_SEASON = "2025/2026";

export interface Roster {
    id: string;
    name: string;
    nickname?: string;
    color?: string;
    logo?: string;
    coach?: Coach["name"];
    coachData?: Coach;
    president?: President["name"];
    presidentData?: President;
    players: Player[]; // effectif global (mirrors current season)
    seasons?: Record<string, SeasonData>;
    category?: 'Top 14' | 'Pro D2';
    founded_in?: number; // year of creation
    titles?: Title[]; // list of titles won
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
    ref?: string;
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
