import type { NextRequest } from "next/server";

export const config = {
  matcher: "/admin/:path*",
};

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export function proxy(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  // Fail closed: an unset password locks the admin out rather than opening it up.
  if (!expected) return unauthorized();

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return unauthorized();
  }

  // Basic Auth credentials are "username:password". Only the password is checked —
  // any username is accepted — and the password may itself contain colons.
  const separator = decoded.indexOf(":");
  if (separator === -1) return unauthorized();
  if (decoded.slice(separator + 1) !== expected) return unauthorized();

  // Returning nothing lets the request through.
}
