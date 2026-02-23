export interface Player {
  id: string;
  name: string;
}

export interface Team {
  name: string;
  starters: Player[];
  substitutes: Player[];
}

export interface Event {
  type: string;
  time: number; // seconds since match start
  team?: Team;
  player?: Player;
  concussion?: boolean;
  // for substitutions
  playerOut?: Player;
  playerIn?: Player;
}
