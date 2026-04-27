import { NextResponse } from "next/server";
import {
  BUSINESS_SESSION_COOKIE,
  getBusinessSessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

function isLocalHost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("192.168.")
  );
}

export async function GET(request: Request) {
  const forwardedHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";

  const forwardedProtoHeader = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtoHeader
    ? forwardedProtoHeader
    : isLocalHost(forwardedHost)
      ? "http"
      : "https";

  const redirectUrl = new URL("/", `${protocol}://${forwardedHost}`);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.delete(BUSINESS_SESSION_COOKIE);

  response.cookies.set(BUSINESS_SESSION_COOKIE, "", {
    ...getBusinessSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}