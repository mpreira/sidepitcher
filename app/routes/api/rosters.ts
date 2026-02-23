import type { ActionFunction, LoaderFunction } from "react-router";
import fs from "fs";
import path from "path";

interface StoredData {
  rosters: unknown;
  activeRosterId: string | null;
  globalPlayers?: unknown;
}

const filePath = path.join(process.cwd(), "data", "rosters.json");

export const loader: LoaderFunction = async () => {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return { rosters: [], activeRosterId: null, globalPlayers: [] };
  }
};

export const action: ActionFunction = async ({ request }) => {
  const data: StoredData = await request.json();
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write rosters", e);
  }
  return null;
};

