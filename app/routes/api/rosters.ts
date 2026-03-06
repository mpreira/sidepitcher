import type { ActionFunction, LoaderFunction } from "react-router";
import { getRostersState, saveRostersState, type RosterStatePayload } from "~/utils/database.server";

export const loader: LoaderFunction = async () => {
    return await getRostersState();
};

export const action: ActionFunction = async ({ request }) => {
    const data: RosterStatePayload = await request.json();
    await saveRostersState(data);
    return null;
};

