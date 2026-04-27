import { NextResponse } from "next/server";
import {
  BUSINESS_SESSION_COOKIE,
  createBusinessSessionToken,
  getBusinessSessionCookieOptions,
  sanitizeNextPath,
  verifyBusinessCredentials,
} from "@/lib/auth";

export const runtime = "nodejs";

type LoginBody = {
  username?: unknown;
  password?: unknown;
  nextPath?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const nextPath = sanitizeNextPath(
      typeof body.nextPath === "string" ? body.nextPath : undefined,
    );

    if (!username || !password) {
      return NextResponse.json(
        { error: "Identifiant et mot de passe obligatoires." },
        { status: 400 },
      );
    }

    const isValid = verifyBusinessCredentials(username, password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 401 },
      );
    }

    const token = createBusinessSessionToken(username);

    const response = NextResponse.json({
      ok: true,
      nextPath,
    });

    response.cookies.set(
      BUSINESS_SESSION_COOKIE,
      token,
      getBusinessSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de se connecter." },
      { status: 500 },
    );
  }
}