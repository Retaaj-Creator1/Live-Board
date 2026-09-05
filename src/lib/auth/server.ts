import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

type Auth = ReturnType<typeof betterAuth>;

let _auth: Auth | null = null;

// Built lazily so importing this module is safe without DATABASE_URL (the
// drizzle adapter would query the DB at construction time). When Postgres is
// unavailable (e.g. stripped desktop builds) an offline stub is returned so
// SSR render paths never throw; /api/auth/* calls degrade to 503 and session
// lookups to "signed out".
function getAuth(): Auth {
  if (_auth) return _auth;
  try {
    _auth = betterAuth({
      database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
          user: schema.user,
          session: schema.session,
          account: schema.account,
          verification: schema.verification,
        },
      }),
      emailAndPassword: {
        enabled: true,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },
      secret: process.env["BETTER_AUTH_SECRET"],
      baseURL: process.env["BETTER_AUTH_URL"],
    }) as Auth;
  } catch {
    _auth = {
      handler: async (request: Request) =>
        new Response(JSON.stringify({ error: "auth_not_configured" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      api: {
        getSession: async () => null,
      },
      options: { baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000" },
    } as unknown as Auth;
  }
  return _auth;
}

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
