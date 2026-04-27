import { createHmac, timingSafeEqual } from "crypto";

export const BUSINESS_SESSION_COOKIE = "business_session";
export const BUSINESS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  u: string;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.BUSINESS_SESSION_SECRET ?? "";

  if (secret.length < 32) {
    throw new Error(
      "BUSINESS_SESSION_SECRET est manquant ou trop court. Ajoute une clé longue dans .env.local.",
    );
  }

  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function sanitizeNextPath(input: string | null | undefined): string {
  if (!input || typeof input !== "string") {
    return "/business";
  }

  if (!input.startsWith("/")) {
    return "/business";
  }

  if (input.startsWith("//")) {
    return "/business";
  }

  if (input === "/business/login") {
    return "/business";
  }

  return input;
}

export function verifyBusinessCredentials(
  username: string,
  password: string,
): boolean {
  const expectedUser = process.env.ADMIN_USER ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedUser || !expectedPassword) {
    throw new Error(
      "ADMIN_USER ou ADMIN_PASSWORD manquant dans .env.local.",
    );
  }

  return (
    safeStringEqual(username, expectedUser) &&
    safeStringEqual(password, expectedPassword)
  );
}

export function createBusinessSessionToken(username: string): string {
  const payload: SessionPayload = {
    u: username,
    exp: Date.now() + BUSINESS_SESSION_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function readBusinessSessionToken(
  token: string | null | undefined,
): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);

  if (!safeStringEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as SessionPayload;

    if (
      typeof parsed.u !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isBusinessSessionValid(
  token: string | null | undefined,
): boolean {
  return readBusinessSessionToken(token) !== null;
}

export function getBusinessSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: BUSINESS_SESSION_MAX_AGE_SECONDS,
  };
}