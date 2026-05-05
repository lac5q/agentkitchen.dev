"""LangGraph seam for Phase 36.

The unit-tested engine is intentionally deterministic. This module holds the
LangGraph integration point so later phases can grow policy without moving A2A
transport responsibilities out of Kitchen.
"""

from __future__ import annotations

from typing import Any, TypedDict


class OrchestrationState(TypedDict, total=False):
    taskSummary: str
    requiredCapability: str
    selectedAgentId: str | None
    status: str
    requiresApproval: bool


def build_langgraph(checkpointer: Any | None = None) -> Any:
    from langgraph.graph import END, START, StateGraph
    from langgraph.types import interrupt

    def route(state: OrchestrationState) -> OrchestrationState:
        if state.get("requiresApproval"):
            interrupt({"kind": "operator_approval", "taskSummary": state.get("taskSummary")})
            return {**state, "status": "approved"}
        return {**state, "status": "routed"}

    graph = StateGraph(OrchestrationState)
    graph.add_node("route", route)
    graph.add_edge(START, "route")
    graph.add_edge("route", END)
    return graph.compile(checkpointer=checkpointer)
