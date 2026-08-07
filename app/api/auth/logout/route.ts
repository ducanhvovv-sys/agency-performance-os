import { clearSessionCookie, destroySession, parseCookies } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const token = parseCookies(request)["aps_session"];
    if (token) await destroySession(token);
  } catch {
    // Ignore — logout should always succeed from the client's point of view.
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
