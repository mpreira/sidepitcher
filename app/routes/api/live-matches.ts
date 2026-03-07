import crypto from "crypto";
import type { ActionFunction } from "react-router";
import type { LiveSnapshot } from "~/types/live";
import { createLiveMatch } from "~/utils/database.server";

function createPublicSlug() {
  return crypto.randomBytes(10).toString("hex");
}

function createAdminToken() {
  return crypto.randomBytes(24).toString("hex");
}

function toMatchDay(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return { ok: false };
  }

  const payload = (await request.json()) as {
    championship?: string;
    matchDay?: string | number;
    state?: LiveSnapshot;
  };

  if (!payload.state) {
    return { ok: false, error: "state is required" };
  }

  const record = await createLiveMatch({
    id: crypto.randomUUID(),
    publicSlug: createPublicSlug(),
    adminToken: createAdminToken(),
    championship: payload.championship,
    matchDay: toMatchDay(payload.matchDay),
    state: payload.state,
  });

  return {
    ok: true,
    matchId: record.id,
    publicSlug: record.publicSlug,
    adminToken: record.adminToken,
  };
};
