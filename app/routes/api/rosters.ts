import type { ActionFunction, LoaderFunction } from "react-router";
import { resolveAccountFromRequest } from "~/utils/account.server";
import {
    getRostersStateForAccount,
    saveRostersStateForAccount,
    type RosterStatePayload,
} from "~/utils/database.server";

export const loader: LoaderFunction = async ({ request }) => {
    const resolved = await resolveAccountFromRequest(request);
    const payload = await getRostersStateForAccount(resolved.account.id);

    if (!resolved.setCookieHeader) {
        return payload;
    }

    return Response.json(payload, {
        headers: {
            "Set-Cookie": resolved.setCookieHeader,
        },
    });
};

export const action: ActionFunction = async ({ request }) => {
    const resolved = await resolveAccountFromRequest(request);
    const data: RosterStatePayload = await request.json();
    await saveRostersStateForAccount(resolved.account.id, data);

    if (!resolved.setCookieHeader) {
        return null;
    }

    return Response.json(
        { ok: true },
        {
            headers: {
                "Set-Cookie": resolved.setCookieHeader,
            },
        }
    );
};

