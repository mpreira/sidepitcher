import type { ActionFunction } from "react-router";
import type { LiveSnapshot } from "~/types/live";
import { updateLiveMatchState } from "~/utils/database.server";
import { publishLiveMatch } from "~/utils/live-broker.server";

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== "PATCH") {
    return { ok: false };
  }

  const matchId = params.matchId;
  const adminToken = request.headers.get("x-live-admin-token");

  if (!matchId || !adminToken) {
    return { ok: false, error: "missing credentials" };
  }

  const payload = (await request.json()) as { state?: LiveSnapshot };
  if (!payload.state) {
    return { ok: false, error: "state is required" };
  }

  const updated = await updateLiveMatchState({
    matchId,
    adminToken,
    state: payload.state,
  });

  if (!updated) {
    return { ok: false, error: "unauthorized or unknown match" };
  }

  if (updated.state) {
    publishLiveMatch(updated.publicSlug, {
      payload: updated.state,
      updatedAt: updated.updatedAt,
    });
  }

  return { ok: true, updatedAt: updated.updatedAt };
};
