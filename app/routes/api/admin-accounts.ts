import type { ActionFunction, LoaderFunction } from "react-router";
import {
  deleteManagedAccount,
  getConnectedAccountFromRequest,
  listAdminAccounts,
  updateManagedAccount,
} from "~/utils/account.server";

async function requireAdmin(request: Request) {
  const account = await getConnectedAccountFromRequest(request);
  if (!account) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (!account.isAdmin) {
    throw new Response("Forbidden", { status: 403 });
  }
  return account;
}

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdmin(request);
  const accounts = await listAdminAccounts();
  return { accounts };
};

export const action: ActionFunction = async ({ request }) => {
  const admin = await requireAdmin(request);

  if (request.method === "PATCH") {
    const body = (await request.json()) as {
      accountId?: string;
      name?: string;
      email?: string;
      password?: string;
      isAdmin?: boolean;
    };

    if (!body.accountId) {
      return Response.json({ ok: false, error: "missing-account-id" }, { status: 400 });
    }

    const account = await updateManagedAccount({
      accountId: body.accountId,
      name: body.name,
      email: body.email,
      password: body.password,
      isAdmin: body.isAdmin,
    });

    return { ok: true, account };
  }

  if (request.method === "DELETE") {
    const body = (await request.json()) as { accountId?: string };
    if (!body.accountId) {
      return Response.json({ ok: false, error: "missing-account-id" }, { status: 400 });
    }

    if (body.accountId === admin.id) {
      return Response.json({ ok: false, error: "cannot-delete-self" }, { status: 400 });
    }

    await deleteManagedAccount(body.accountId);
    return { ok: true };
  }

  return Response.json({ ok: false, error: "method-not-allowed" }, { status: 405 });
};
