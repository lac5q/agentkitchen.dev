"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NOC } from "@/lib/noc-theme";

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserInfo | null) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    // Clear local access_token cookie
    document.cookie = "access_token=; SameSite=Lax; Path=/; Max-Age=0";
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: NOC.muted }}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" style={{ color: NOC.ink }}>{user.displayName || user.email}</p>
        <p className="truncate capitalize" style={{ color: NOC.soft }}>{user.role}</p>
      </div>
      <button
        onClick={handleLogout}
        className="shrink-0 rounded-md px-2 py-1 transition"
        style={{ color: NOC.soft }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = NOC.peach;
          event.currentTarget.style.color = NOC.terraDeep;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
          event.currentTarget.style.color = NOC.soft;
        }}
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}
