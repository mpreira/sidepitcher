export interface Player {
  id: string;
  name: string;
}

export interface CompositionEntry {
  player: Player;
  number: number; // jersey number
}

export interface Team {
  name: string;
  starters: CompositionEntry[]; // numbers 1–15
  substitutes: CompositionEntry[]; // numbers 16–23
}

export interface Roster {
  id: string;
  name: string;
  teams: Team[];
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
}
