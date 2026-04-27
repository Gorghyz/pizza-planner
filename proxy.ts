import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  BUSINESS_SESSION_COOKIE,
  isBusinessSessionValid,
  sanitizeNextPath,
} from "@/lib/auth";

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/api/admin/")) {
    return true;
  }

  if (pathname === "/api/orders") {
    return true;
  }

  if (pathname === "/api/quote/orders") {
    return true;
  }

  if (pathname.startsWith("/business/")) {
    return pathname !== "/business/login" && pathname !== "/business/logout";
  }

  if (pathname === "/business") {
    return true;
  }

  if (pathname.startsWith("/admin/")) {
    return true;
  }

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(BUSINESS_SESSION_COOKIE)?.value;
  const isAuthenticated = isBusinessSessionValid(token);

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentification business requise." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/business/login", request.url);
  loginUrl.searchParams.set(
    "next",
    sanitizeNextPath(`${pathname}${search}`),
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/business/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/orders",
    "/api/quote/orders",
  ],
};