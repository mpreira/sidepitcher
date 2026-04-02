import type { ActionFunction } from "react-router";
import { resolveDataScopeFromRequest } from "~/utils/account.server";
import {
  getRostersStateForAccount,
  saveRostersStateForAccount,
} from "~/utils/database.server";
import { buildCalendarForTeam } from "~/utils/ical.server";
import { CURRENT_SEASON } from "~/types/tracker";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const scope = await resolveDataScopeFromRequest(request);
  const body = await request.json();
  const { rosterId, icsUrl, season } = body as {
    rosterId?: string;
    icsUrl?: string;
    season?: string;
  };

  if (!rosterId || !icsUrl) {
    return Response.json(
      { error: "rosterId and icsUrl are required" },
      { status: 400 },
    );
  }

  // SSRF protection: only allow https:// and webcal:// URLs
  try {
    const parsed = new URL(icsUrl);
    if (!["https:", "webcal:"].includes(parsed.protocol)) {
      return Response.json({ error: "Only https:// and webcal:// URLs are allowed" }, { status: 400 });
    }
    // Block private/internal IPs
    const host = parsed.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.endsWith(".local") ||
      host === "0.0.0.0" ||
      host === "169.254.169.254"
    ) {
      return Response.json({ error: "Internal URLs are not allowed" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  const targetSeason = season || CURRENT_SEASON;
  const payload = await getRostersStateForAccount(scope.scopeId);
  const roster = payload.rosters.find((r) => r.id === rosterId);

  if (!roster) {
    return Response.json({ error: "Roster not found" }, { status: 404 });
  }

  const fixtures = await buildCalendarForTeam(icsUrl, roster.name);

  // Ensure seasons object exists
  if (!roster.seasons) roster.seasons = {};
  if (!roster.seasons[targetSeason]) {
    roster.seasons[targetSeason] = { players: roster.players ?? [] };
  }
  roster.seasons[targetSeason].calendar = fixtures;

  await saveRostersStateForAccount(scope.scopeId, payload);

  const headers: HeadersInit = {};
  if (scope.setCookieHeader) {
    headers["Set-Cookie"] = scope.setCookieHeader;
  }

  return Response.json(
    { ok: true, matchCount: fixtures.length, season: targetSeason },
    { headers },
  );
};
