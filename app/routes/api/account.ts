import type { ActionFunction, LoaderFunction } from "react-router";
import {
  createAndAssignAccount,
  resolveAccountFromRequest,
  switchAccountFromAccessCode,
  buildAccountCookie,
  renameCurrentAccount,
} from "~/utils/account.server";

export const loader: LoaderFunction = async ({ request }) => {
  const resolved = await resolveAccountFromRequest(request);
  const payload = { account: resolved.account };

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
  const body = (await request.json()) as {
    intent?: "create" | "switch" | "rename";
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

    const resolved = await resolveAccountFromRequest(request);
    const account = await renameCurrentAccount(resolved.account.id, body.name);

    if (!resolved.setCookieHeader) {
      return Response.json({ ok: true, account });
    }

    return Response.json(
      { ok: true, account },
      {
        headers: {
          "Set-Cookie": resolved.setCookieHeader,
        },
      }
    );
  }

  return Response.json({ ok: false, error: "invalid-intent" }, { status: 400 });
};
