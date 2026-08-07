import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../../db";
import { appUsers, sessions } from "../../db/schema";

export type Role = "director" | "staff";

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  employeeName: string | null;
  status: string;
};

const SESSION_COOKIE = "aps_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 ngày
const PBKDF2_ITERATIONS = 100_000;

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes: number) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function derive(password: string, salt: string) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password: string) {
  const salt = randomHex(16);
  const hash = await derive(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const hash = await derive(password, salt);
  if (hash.length !== expectedHash.length) return false;
  // constant-time-ish compare
  let diff = 0;
  for (let i = 0; i < hash.length; i += 1) diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie");
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function sessionCookie(token: string, maxAgeSeconds: number) {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  return attrs.join("; ");
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(userId: number) {
  const db = await getDb();
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.insert(sessions).values({ token, userId, expiresAt });
  return { token, expiresAt, maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000) };
}

export async function destroySession(token: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const [row] = await db
    .select({
      id: appUsers.id,
      email: appUsers.email,
      fullName: appUsers.fullName,
      role: appUsers.role,
      employeeName: appUsers.employeeName,
      status: appUsers.status,
    })
    .from(sessions)
    .innerJoin(appUsers, eq(appUsers.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, nowIso)))
    .limit(1);
  if (!row) return null;
  if (row.status !== "active") return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: (row.role === "director" ? "director" : "staff") as Role,
    employeeName: row.employeeName,
    status: row.status,
  };
}

export async function countUsers() {
  await getDb(); // ensures the runtime schema (app_users table) exists
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare("SELECT COUNT(*) AS total FROM app_users").first<{ total: number }>();
  return result?.total ?? 0;
}

export function unauthorized(message = "Bạn cần đăng nhập.") {
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Bạn không có quyền thực hiện thao tác này.") {
  return Response.json({ error: message }, { status: 403 });
}

/**
 * Guard helper: returns the SessionUser if authenticated (and matches role when
 * `role` is provided), otherwise returns a Response to short-circuit with.
 */
export async function requireUser(
  request: Request,
  role?: Role
): Promise<{ user: SessionUser } | { response: Response }> {
  const user = await getSessionUser(request);
  if (!user) return { response: unauthorized() };
  if (role && user.role !== role) return { response: forbidden() };
  return { user };
}
