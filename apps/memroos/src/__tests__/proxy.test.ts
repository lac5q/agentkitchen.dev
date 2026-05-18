import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

describe("proxy", () => {
  it("redirects the production app host from HTTP to HTTPS", async () => {
    process.env.MEMROOS_HTTPS_APP_HOSTS = "app.memroos.test";
    const response = await proxy(
      new NextRequest("http://app.memroos.test/login", {
        headers: { host: "app.memroos.test" },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.memroos.test/login");
    delete process.env.MEMROOS_HTTPS_APP_HOSTS;
  });
});
