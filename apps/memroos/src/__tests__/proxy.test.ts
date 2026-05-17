import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

describe("proxy", () => {
  it("redirects the production app host from HTTP to HTTPS", async () => {
    const response = await proxy(
      new NextRequest("http://memroos.epiloguecapital.com/login", {
        headers: { host: "memroos.epiloguecapital.com" },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://memroos.epiloguecapital.com/login");
  });
});
