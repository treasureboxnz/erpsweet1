import { describe, it, expect } from "vitest";

describe("Apollo API Key", () => {
  it("should be set and valid", async () => {
    const apiKey = process.env.APOLLO_API_KEY;
    expect(apiKey).toBeTruthy();
    expect(apiKey!.length).toBeGreaterThan(10);

    const res = await fetch("https://api.apollo.io/v1/auth/health", {
      headers: { "X-Api-Key": apiKey! },
    });
    const data = await res.json() as { healthy: boolean; is_logged_in: boolean };
    expect(data.healthy).toBe(true);
    expect(data.is_logged_in).toBe(true);
  });
});
