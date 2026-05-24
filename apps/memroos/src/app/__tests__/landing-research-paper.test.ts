// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(path.resolve(__dirname, "../page.tsx"), "utf8");
const paperPath = path.resolve(
  __dirname,
  "../../../public/research/memroos-governed-knowledge-architecture-paper.pdf"
);
const publicDir = path.resolve(__dirname, "../../../public");

const screenshotAssets = [
  "screenshots/memroos-floor.png",
  "screenshots/readme-memory.png",
  "screenshots/readme-dispatch.png",
  "screenshots/readme-skills.png",
];

describe("public landing research proof", () => {
  it("links the governed knowledge architecture paper from the benchmark proof area", () => {
    expect(pageSource).toContain("/research/memroos-governed-knowledge-architecture-paper.pdf");
    expect(pageSource).toContain("Read the research paper");
    expect(pageSource).toContain("governed knowledge architecture");
  });

  it("ships the research paper as a public static asset", () => {
    expect(existsSync(paperPath)).toBe(true);
  });

  it("keeps the public CTAs focused on GitHub and getting in touch", () => {
    expect(pageSource).toContain("https://github.com/lac5q/memroos");
    expect(pageSource).toContain("GitHub repo");
    expect(pageSource).toContain("#contact");
    expect(pageSource).toContain("Get in touch");
  });

  it("embeds Luis's Google Calendar appointment availability", () => {
    expect(pageSource).toContain("calendar.google.com/calendar/appointments/schedules");
    expect(pageSource).toContain("Book time with Luis");
    expect(pageSource).toContain("Schedule on Google Calendar");
  });

  it("ships the updated public screenshot assets used by the landing page", () => {
    for (const asset of screenshotAssets) {
      expect(pageSource).toContain(`/${asset}`);
      expect(existsSync(path.join(publicDir, asset))).toBe(true);
    }
  });
});
