import { NextResponse } from "next/server";
import {
  BUSINESS_SESSION_COOKIE,
  getBusinessSessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.delete(BUSINESS_SESSION_COOKIE);

  response.cookies.set(BUSINESS_SESSION_COOKIE, "", {
    ...getBusinessSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}