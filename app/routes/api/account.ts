import type { ActionFunction, LoaderFunction } from "react-router";
import {
  createAndAssignAccount,
  getConnectedAccountFromRequest,
  switchAccountFromAccessCode,
  buildAccountCookie,
  buildAccountLogoutCookie,
  renameCurrentAccount,
} from "~/utils/account.server";

export const loader: LoaderFunction = async ({ request }) => {
  const connectedAccount = await getConnectedAccountFromRequest(request);
  if (!connectedAccount) {
    return { connected: false, account: null };
  }
  return { connected: true, account: connectedAccount };
};

export const action: ActionFunction = async ({ request }) => {
  const body = (await request.json()) as {
    intent?: "create" | "switch" | "rename" | "logout";
    name?: string;
    accessCode?: string;
  };

  if (body.intent === "create") {
    const created = await createAndAssignAccount(body.name);
    return Response.json(
      {
        ok: true,
        account: created.account,
        accessCode: created.accessCode,
      },
      {
        headers: {
          "Set-Cookie": created.setCookieHeader,
        },
      }
    );
  }

  if (body.intent === "switch") {
    if (!body.accessCode) {
      return Response.json({ ok: false, error: "missing-access-code" }, { status: 400 });
    }

    const account = await switchAccountFromAccessCode(body.accessCode);
    if (!account) {
      return Response.json({ ok: false, error: "account-not-found" }, { status: 404 });
    }

    return Response.json(
      {
        ok: true,
        account,
      },
      {
        headers: {
          "Set-Cookie": buildAccountCookie(account.id),
        },
      }
    );
  }

  if (body.intent === "rename") {
    if (!body.name?.trim()) {
      return Response.json({ ok: false, error: "missing-name" }, { status: 400 });
    }

    const connectedAccount = await getConnectedAccountFromRequest(request);
    if (!connectedAccount) {
      return Response.json({ ok: false, error: "not-connected" }, { status: 401 });
    }

    const account = await renameCurrentAccount(connectedAccount.id, body.name);

    return Response.json({ ok: true, account });
  }

  if (body.intent === "logout") {
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": buildAccountLogoutCookie(),
        },
      }
    );
  }

  return Response.json({ ok: false, error: "invalid-intent" }, { status: 400 });
};
