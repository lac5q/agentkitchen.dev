/**
 * GET /api/skillforge/proposals
 * List all SkillForge proposals (operator only).
 *
 * PATCH /api/skillforge/proposals
 * Apply approval action (approve/reject/rollback).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authorizeRegistryWrite } from "@/lib/operator-auth";
import { listProposals, applyApprovalAction, getProposal } from "@/lib/skillforge/operator-approval";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authorizeRegistryWrite(req)) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    const db = getDb();
    const queue = listProposals(db);
    return NextResponse.json(queue);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!authorizeRegistryWrite(req)) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { proposalId, action, reasoning } = body;

    if (!proposalId || !action) {
      return NextResponse.json(
        { error: "proposalId and action are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = applyApprovalAction(db, {
      proposalId,
      action,
      operator: "operator", // TODO: extract from auth context
      reasoning,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return updated proposal
    const updated = getProposal(db, proposalId);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
