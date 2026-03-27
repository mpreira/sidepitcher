// Quick test: sync roster data to structured tables
import { saveRostersStateForAccount, getRostersStateForAccount } from "./app/utils/database.server.ts";

const payload = {
  rosters: [
    {
      id: "r1-test",
      name: "Stade Toulousain",
      nickname: "ST",
      color: "#FF0000",
      logo: null,
      coach: "Ugo Mola",
      president: "Didier Lacroix",
      category: "Top 14",
      founded_in: 1907,
      players: [
        {
          id: "p1",
          name: "Antoine Dupont",
          number: 9,
          positions: ["demi de mêlée"],
          nationality: "FR",
          stats: { points: 45, essais: 9, pied: 0, tauxTransfo: 0, cartons: 0, drops: 0, matchs2526: 15, titularisations2526: 14 },
        },
        {
          id: "p2",
          name: "Thomas Ramos",
          number: 15,
          positions: ["arrière", "demi d'ouverture"],
          nationality: "FR",
          stats: { points: 120, essais: 3, pied: 87, tauxTransfo: 78, cartons: 1, drops: 2, matchs2526: 18, titularisations2526: 18 },
        },
      ],
      titles: [
        { competition: "Top 14", ranking: "Vainqueur", year: 2023 },
        { competition: "Coupe d'Europe", ranking: "Vainqueur", year: 2024 },
      ],
    },
  ],
  teams: [
    {
      id: "t1-j1",
      name: "Stade Toulousain J1",
      nickname: "ST",
      color: "#FF0000",
      logo: null,
      rosterId: "r1-test",
      captainPlayerId: "p1",
      starters: [
        { player: { id: "p1", name: "Antoine Dupont", positions: ["demi de mêlée"] }, number: 9 },
        { player: { id: "p2", name: "Thomas Ramos", positions: ["arrière"] }, number: 15 },
      ],
      substitutes: [],
    },
  ],
  activeRosterId: "r1-test",
  matchDay: "1",
  sport: "Rugby",
  championship: "Top 14",
};

async function main() {
  console.log("Saving roster data for admin-account...");
  await saveRostersStateForAccount("admin-account", payload);
  console.log("Done! Verifying...");
  const state = await getRostersStateForAccount("admin-account");
  console.log("Rosters count:", Array.isArray(state.rosters) ? state.rosters.length : 0);
  console.log("Teams count:", Array.isArray(state.teams) ? state.teams.length : 0);
  console.log("Success!");
  process.exit(0);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
