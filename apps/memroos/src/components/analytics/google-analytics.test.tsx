import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoogleAnalyticsTracking } from "./google-analytics";

describe("GoogleAnalyticsTracking", () => {
  afterEach(() => {
    cleanup();
    document.querySelectorAll("#google-analytics-loader, #google-analytics-config").forEach((node) => node.remove());
  });

  it("renders the Google tag when a GA4 measurement id is configured", () => {
    render(<GoogleAnalyticsTracking measurementId="g-abc123xyz9" />);

    const loader = document.querySelector<HTMLScriptElement>("#google-analytics-loader");
    const config = document.querySelector<HTMLScriptElement>("#google-analytics-config");
    expect(loader?.src).toBe("https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9");
    expect(config?.textContent).toContain('gtag(\'config\', "G-ABC123XYZ9")');
  });

  it("does not render scripts without a valid GA4 measurement id", () => {
    render(<GoogleAnalyticsTracking measurementId="UA-123456-1" />);

    expect(document.querySelector("#google-analytics-loader")).toBeNull();
    expect(document.querySelector("#google-analytics-config")).toBeNull();
  });
});
