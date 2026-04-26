import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentification requise.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Business pizzas", charset="UTF-8"',
    },
  });
}

export function proxy(request: NextRequest) {
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    return new NextResponse(
      "ADMIN_USER et ADMIN_PASSWORD doivent être définis dans .env.local",
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const base64Credentials = authorization.slice("Basic ".length);
    const decoded = atob(base64Credentials);
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return unauthorized();
    }

    const user = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (user === adminUser && password === adminPassword) {
      return NextResponse.next();
    }
  } catch {
    return unauthorized();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/admin/:path*", "/business/:path*", "/api/admin/:path*"],
};