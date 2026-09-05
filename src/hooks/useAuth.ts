import { authClient } from "@/lib/auth/client";

type AuthState = {
  /** undefined = still checking, null = signed out, object = signed in */
  user: { id: string; name: string; email: string } | null | undefined;
  pending: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthState {
  const session = authClient.useSession();
  const user = session.isPending ? undefined : (session.data?.user ?? null);

  const signIn = async (email: string, password: string) => {
    const res = await authClient.signIn.email({ email, password });
    return res.error?.message ?? null;
  };

  const signUp = async (name: string, email: string, password: string) => {
    const res = await authClient.signUp.email({ name, email, password });
    return res.error?.message ?? null;
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  return { user, pending: session.isPending, signIn, signUp, signOut };
}
