import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_HOSTS = new Set(["memroos.com", "www.memroos.com", "memroos.vercel.app"]);
const LEGACY_HOSTS = new Set(["agentkitchen.dev", "www.agentkitchen.dev"]);

function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

function isPublicLandingHost(host: string): boolean {
  return PUBLIC_HOSTS.has(host) || host.endsWith(".vercel.app");
}

function isLandingAsset(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/demo/")
  );
}

export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host") ?? "");
  const { pathname } = request.nextUrl;

  if (LEGACY_HOSTS.has(host)) {
    return NextResponse.redirect("https://memroos.com/", 308);
  }

  if (!isPublicLandingHost(host) || isLandingAsset(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
