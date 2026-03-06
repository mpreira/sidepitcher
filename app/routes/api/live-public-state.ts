import type { LoaderFunction } from "react-router";
import { getLiveMatchByPublicSlug } from "~/utils/database.server";

export const loader: LoaderFunction = async ({ params }) => {
  const publicSlug = params.publicSlug;

  if (!publicSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  const match = await getLiveMatchByPublicSlug(publicSlug);
  if (!match || !match.state) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    ok: true,
    updatedAt: match.updatedAt,
    state: match.state,
  };
};
