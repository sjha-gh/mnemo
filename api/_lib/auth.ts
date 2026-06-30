import { query } from "./db.js";

/**
 * Milestone 6: single-user hackathon ownership guard.
 *
 * The browser never sends a user id. The server decides who owns the request.
 * For the MVP this is a single stable demo user, seeded by migration
 * 003_demo_user_ownership.sql. `ensureOwner` also performs an idempotent insert
 * so the API works even if the migration has not been run in a fresh database.
 *
 * Upgrade path to real auth:
 * - Set MNEMO_ACCESS_TOKEN to require a shared secret on every API call.
 * - Replace `resolveUserId` with a real session/JWT lookup (Clerk, Auth.js,
 *   etc.) that maps an authenticated identity to a row in `users`.
 */

const DEMO_USER_ID =
  process.env.DEMO_USER_ID || "00000000-0000-0000-0000-000000000001";
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || "demo@mnemo.app";
const DEMO_USER_NAME = "Mnemo Demo User";

export type AuthenticatedUser = { id: string };

export class AuthError extends Error {
  status: number;
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

let ensuredUserId: string | null = null;

async function ensureOwner(): Promise<string> {
  if (ensuredUserId) return ensuredUserId;

  await query(
    `
      INSERT INTO users (id, email, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING
    `,
    [DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_NAME],
  );

  ensuredUserId = DEMO_USER_ID;
  return ensuredUserId;
}

function extractToken(req: any): string | null {
  const authHeader = req?.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const custom = req?.headers?.["x-mnemo-access"];
  if (typeof custom === "string" && custom) return custom.trim();

  const cookie = req?.headers?.cookie;
  if (typeof cookie === "string") {
    const match = /(?:^|;\s*)mnemo_access=([^;]+)/.exec(cookie);
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

/**
 * Resolve and authorize the owner of the current request.
 *
 * Throws AuthError (401) when MNEMO_ACCESS_TOKEN is configured and the request
 * does not present the matching token. The returned user id is always decided
 * by the server, never read from the request body or query string.
 */
export async function authenticate(req: any): Promise<AuthenticatedUser> {
  const requiredToken = process.env.MNEMO_ACCESS_TOKEN;
  if (requiredToken) {
    const provided = extractToken(req);
    if (!provided || provided !== requiredToken) {
      throw new AuthError();
    }
  }

  const id = await ensureOwner();
  return { id };
}
