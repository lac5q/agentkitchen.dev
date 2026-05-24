import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MemoryList } from "../memory-list";
import type { MemoryInventoryRow } from "@/lib/api-client";

const rows: MemoryInventoryRow[] = [
  {
    id: "messages:1",
    category: "ingested_message",
    label: "Ingested message",
    content: "Operators need source-backed memory inventory.",
    backend: "SQLite messages",
    source: "codex",
    project: "memroos",
    workspace: "memroos",
    timestamp: "2026-05-24T12:00:00Z",
    securityLabel: { visibility: "internal", domain: "product", sensitivity: "normal", policy: "indexable" },
    consolidationState: "pending",
    salienceScore: 0.82,
    accessCount: 4,
    evidencePointer: "messages:1",
    provenance: {
      sourceTable: "messages",
      sourceId: 1,
      sourceTimestamp: "2026-05-24T12:00:00Z",
    },
  },
];

describe("MemoryList", () => {
  it("renders category, backend, provenance, and state instead of ambiguous memory labels", () => {
    render(<MemoryList entries={rows} onSelect={vi.fn()} selected={null} />);

    expect(screen.getByText("Ingested message")).toBeInTheDocument();
    expect(screen.getByText("SQLite messages")).toBeInTheDocument();
    expect(screen.getByText("codex")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText(/messages:1/i)).toBeInTheDocument();
    expect(screen.queryByText(/^memories$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/total memories/i)).not.toBeInTheDocument();
  });
});
