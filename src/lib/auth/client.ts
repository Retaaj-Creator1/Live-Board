import { createAuthClient } from "better-auth/react";

// Defaults to same-origin, which is correct for both local dev and production.
export const authClient = createAuthClient();
