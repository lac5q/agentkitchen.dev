// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const operationsDir = path.resolve(__dirname, "..");

function productionFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry !== "__tests__") files.push(...productionFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) files.push(fullPath);
  }
  return files;
}

describe("Operations NOC production data sources", () => {
  it("does not import NOC mock fixtures from production components", () => {
    const offenders = productionFiles(operationsDir).filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("noc-mock-data") || source.includes("MOCK_");
    });

    expect(offenders).toEqual([]);
  });
});
