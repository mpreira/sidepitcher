import type { ActionFunction, LoaderFunction } from "react-router";
import {
  deleteManagedAccount,
  getConnectedAccountFromRequest,
  listAdminAccounts,
  updateManagedAccount,
} from "~/utils/account.server";
import { adminDeleteSchema, adminPatchSchema, parsePayload } from "~/utils/schemas.server";

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
    const raw = await request.json();
    const parsed = parsePayload(adminPatchSchema, raw);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const account = await updateManagedAccount({
      accountId: body.accountId,
      name: body.name,
      email: body.email,
      password: body.password,
      isAdmin: body.isAdmin,
      isApproved: body.isApproved,
    });

    return { ok: true, account };
  }

  if (request.method === "DELETE") {
    const raw = await request.json();
    const parsed = parsePayload(adminDeleteSchema, raw);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    if (body.accountId === admin.id) {
      return Response.json({ ok: false, error: "cannot-delete-self" }, { status: 400 });
    }

    await deleteManagedAccount(body.accountId);
    return { ok: true };
  }

  return Response.json({ ok: false, error: "method-not-allowed" }, { status: 405 });
};
