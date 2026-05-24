// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(path.resolve(__dirname, "../page.tsx"), "utf8");
const paperPath = path.resolve(
  __dirname,
  "../../../public/research/memroos-governed-knowledge-architecture-paper.pdf"
);

describe("public landing research proof", () => {
  it("links the governed knowledge architecture paper from the benchmark proof area", () => {
    expect(pageSource).toContain("/research/memroos-governed-knowledge-architecture-paper.pdf");
    expect(pageSource).toContain("Read the research paper");
    expect(pageSource).toContain("governed knowledge architecture");
  });

  it("ships the research paper as a public static asset", () => {
    expect(existsSync(paperPath)).toBe(true);
  });
});
