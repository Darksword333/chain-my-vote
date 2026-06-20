export interface DeployedBallot {
  address: string;
  title: string;
}

const BUCKET_ID = "chain_my_vote_ballots_5c386c53";
const DB_URL = `https://kvdb.io/${BUCKET_ID}/deployedBallots`;

export async function getGlobalBallots(): Promise<DeployedBallot[]> {
  try {
    const res = await fetch(DB_URL);
    if (!res.ok) {
      if (res.status === 404) {
        // First initialization: write an empty array to establish the key
        await writeGlobalBallots([]);
        return [];
      }
      throw new Error(`Failed to fetch from global database: ${res.statusText}`);
    }
    const text = await res.text();
    if (!text || text === "null") return [];
    return JSON.parse(text) as DeployedBallot[];
  } catch (e) {
    console.error("Failed to read from global database:", e);
    return [];
  }
}

export async function writeGlobalBallots(ballots: DeployedBallot[]): Promise<void> {
  try {
    const res = await fetch(DB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ballots),
    });
    if (!res.ok) {
      throw new Error(`Failed to write to global database: ${res.statusText}`);
    }
  } catch (e) {
    console.error("Failed to write to global database:", e);
  }
}

export async function saveGlobalBallot(address: string, title: string): Promise<DeployedBallot[]> {
  try {
    const ballots = await getGlobalBallots();
    const exists = ballots.some((b) => b.address.toLowerCase() === address.toLowerCase());
    if (!exists) {
      const updated = [...ballots, { address, title }];
      await writeGlobalBallots(updated);
      return updated;
    }
    return ballots;
  } catch (e) {
    console.error("Failed to save ballot globally:", e);
    return [];
  }
}

export async function deleteGlobalBallot(address: string): Promise<DeployedBallot[]> {
  try {
    const ballots = await getGlobalBallots();
    const filtered = ballots.filter((b) => b.address.toLowerCase() !== address.toLowerCase());
    await writeGlobalBallots(filtered);
    return filtered;
  } catch (e) {
    console.error("Failed to delete ballot globally:", e);
    return [];
  }
}
