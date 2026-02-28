import { upsertSummaries } from "../../data/upsertSummaries.server";
import { upsertMatchDayTeams } from "../../data/upsertMatchDayTeam.server";
import { upsertAppState } from "../../data/upsertAppState.server";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const matchId = form.get("matchId");

  const apiData = await fetch(
    `https://api.example.com/match/${matchId}`
  ).then(r => r.json());

  // 1️⃣ state global
  if (apiData.rostersState) {
    await upsertAppState("rosters_state", apiData.rostersState);
  }

  // 2️⃣ summaries
  if (Array.isArray(apiData.summaries)) {
    await upsertSummaries(apiData.summaries);
  }

  // 3️⃣ match day teams
  if (Array.isArray(apiData.matchDayTeams)) {
    await upsertMatchDayTeams(apiData.matchDayTeams);
  }

  return null;
}