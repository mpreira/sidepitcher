export interface Player {
    id: string;
    name: string;
    number?: number; // optional jersey number
}

export interface CompositionEntry {
    player: Player;
    number: number; // jersey number
}

export interface Roster {
    id: string;
    name: string;
    players: Player[]; // effectif global
    category?: 'Top 14' | 'Pro D2';
}

export interface Team {
    id: string;              // nouveau : « nomDuRoster_journee »
    name: string;
    rosterId: string;        // which roster this team draws from
    starters: CompositionEntry[]; // numbers 1–15
    substitutes: CompositionEntry[]; // numbers 16–23
}

export interface Event {
    type: string;
    time: number; // seconds since match start
    team?: Team;
    player?: Player;
    playerNumber?: number;
    concussion?: boolean;
    // for substitutions
    playerOut?: Player;
    playerIn?: Player;
    // for half-time summaries
    summary?: string;
}
