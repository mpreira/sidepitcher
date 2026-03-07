import type { ActionFunction, LoaderFunction } from "react-router";
import { resolveDataScopeFromRequest } from "~/utils/account.server";
import {
    getRostersStateForAccount,
    saveRostersStateForAccount,
    type RosterStatePayload,
} from "~/utils/database.server";

export const loader: LoaderFunction = async ({ request }) => {
    const scope = await resolveDataScopeFromRequest(request);
    const payload = await getRostersStateForAccount(scope.scopeId);

    if (!scope.setCookieHeader) {
        return payload;
    }

    return Response.json(payload, {
        headers: {
            "Set-Cookie": scope.setCookieHeader,
        },
    });
};

export const action: ActionFunction = async ({ request }) => {
    const scope = await resolveDataScopeFromRequest(request);
    const data: RosterStatePayload = await request.json();
    await saveRostersStateForAccount(scope.scopeId, data);

    if (!scope.setCookieHeader) {
        return null;
    }

    return Response.json(
        { ok: true },
        {
            headers: {
                "Set-Cookie": scope.setCookieHeader,
            },
        }
    );
};

