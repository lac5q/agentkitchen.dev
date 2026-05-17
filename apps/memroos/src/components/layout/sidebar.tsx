"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Brain,
  GitBranch,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";
import { KangarooMark } from "./brand-mark";

// 8 consolidated groups. `href` is the group's primary destination; `match`
// lists every route the group subsumes so the item highlights when the user
// is on any subsumed page. No routes are deleted — every old page stays
// reachable by direct URL and (Phase 5) via in-page sub-tabs.
const NAV_ITEMS = [
  {
    href: "/",
    label: "Operations",
    description: "NOC · efficiency · anomalies",
    icon: Activity,
    badge: "8",
    match: ["/", "/ledger", "/business-ops"],
  },
  {
    href: "/flow",
    label: "Workflow Map",
    description: "How work actually flows",
    icon: GitBranch,
    match: ["/flow"],
  },
  {
    href: "/notebooks",
    label: "Memory",
    description: "Memory · Knowledge · Notebooks",
    icon: Brain,
    match: ["/notebooks", "/library"],
  },
  {
    href: "/cookbooks",
    label: "Skills",
    description: "Cookbooks · lifecycle",
    icon: Sparkles,
    match: ["/cookbooks"],
  },
  {
    href: "/agents",
    label: "Agents",
    description: "Registry · runtimes",
    icon: Bot,
    match: ["/agents"],
  },
  {
    href: "/dispatch",
    label: "Engage",
    description: "Dispatch · chat · standups",
    icon: Send,
    badge: "2",
    match: ["/dispatch"],
  },
  {
    href: "/apo",
    label: "Improve",
    description: "APO · SEAL · Evals · Autogen",
    icon: Zap,
    badge: "4",
    match: ["/apo", "/seal", "/evals", "/agent-autogen", "/memory-autogen"],
  },
  {
    href: "/audit",
    label: "Governance",
    description: "Audit · escalations · team · keys",
    icon: ShieldCheck,
    match: [
      "/audit",
      "/escalations",
      "/team",
      "/settings/api-keys",
      "/settings/compliance",
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    onClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navContent = (showClose: boolean) => (
    <>
      <div className="mb-7 flex items-center justify-between border-b border-[#c9c9c2] px-2 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <KangarooMark className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7a2a1e]">MemroOS</p>
            <h1 className="mt-1 truncate text-base font-semibold text-[#0f0f0e]">MemroOS</h1>
            <p className="text-xs text-[#4a4a45]">Memory OS for agent workflows</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9c9c2] text-[#4a4a45] transition-colors hover:bg-[#f2e2dc] hover:text-[#7a2a1e] lg:hidden"
            aria-label="Close menu"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match.some((m) =>
            m === "/" ? pathname === "/" : pathname.startsWith(m)
          );
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-start gap-2.5 border-l-2 px-2.5 py-2.5 text-sm transition-all",
                isActive
                  ? "border-[#a8392c] bg-[#f2e2dc] text-[#7a2a1e]"
                  : "border-transparent text-[#4a4a45] hover:bg-white/70 hover:text-[#0f0f0e]"
              )}
            >
              <item.icon
                className="mt-0.5 h-[15px] w-[15px] shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "block truncate leading-4",
                      isActive ? "font-semibold" : "font-medium"
                    )}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={cn(
                        "ml-auto px-1.5 font-mono text-[10px] leading-4",
                        isActive
                          ? "bg-[#a8392c] text-[#fafaf7]"
                          : "bg-[#f2f2ee] text-[#4a4a45]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[10.5px] font-medium leading-3",
                    isActive ? "text-[#7a2a1e]" : "text-[#73736b]"
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#c9c9c2] px-2 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a2a1e]">Operating model</p>
        <p className="mt-1 text-xs text-[#4a4a45]">Retain, retrieve, dispatch, improve</p>
      </div>
      <div className="border-t border-[#c9c9c2] mt-4 pt-2">
        <UserMenu />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[232px] flex-col border-r border-[#e4e4dd] bg-white px-3.5 py-5 text-[#1f1f1c] lg:flex">
        {navContent(false)}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden">
        {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-[#0f0f0e]/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

        {/* Slide-in drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-screen w-[232px] flex-col border-r border-[#e4e4dd] bg-white px-3.5 py-5 text-[#1f1f1c] shadow-2xl transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {navContent(true)}
        </aside>
        </div>
      )}
    </>
  );
}
