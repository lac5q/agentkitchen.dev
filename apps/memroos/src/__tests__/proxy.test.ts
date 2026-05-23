import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

describe("proxy", () => {
  it("does not hard-code private hosts for HTTPS redirects", async () => {
    const response = await proxy(
      new NextRequest("http://app.memroos.test/login", {
        headers: { host: "app.memroos.test" },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

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

  it("lets agent-authenticated API routes handle their own authorization", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3002/api/memory/add", {
        method: "POST",
        headers: { host: "localhost:3002", authorization: "Bearer agent-key" },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("lets operator-key API routes handle their own authorization", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3002/api/agents/register", {
        method: "POST",
        headers: { host: "localhost:3002", "x-memroos-operator-key": "operator-key" },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("lets ChatGPT Action routes handle their own API key authorization", async () => {
    const response = await proxy(
      new NextRequest("https://app.memroos.test/api/chatgpt/actions/search", {
        method: "POST",
        headers: { host: "app.memroos.test", "x-api-key": "action-key" },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });
});
