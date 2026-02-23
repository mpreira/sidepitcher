import type { LoaderArgs } from "@remix-run/node";

// catch-all for well-known paths used by dev tools, respond 204 with empty body
export const loader = async ({ request }: LoaderArgs) => {
  return new Response(null, { status: 204 });
};

export default function WellKnown() {
  // nothing to render on the client
  return null;
}
