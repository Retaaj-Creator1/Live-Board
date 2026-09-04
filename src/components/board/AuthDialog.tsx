import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "signin" | "signup";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (name: string, email: string, password: string) => Promise<string | null>;
};

export function AuthDialog({ open, onOpenChange, onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const err =
        mode === "signin"
          ? await onSignIn(email, password)
          : await onSignUp(name, email, password);
      if (err) {
        setError(err);
      } else {
        onOpenChange(false);
        setName("");
        setEmail("");
        setPassword("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "signin" ? "Sign in" : "Create an account"}</DialogTitle>
          <DialogDescription>
            {mode === "signin"
              ? "Sign in to sync your board across devices."
              : "Create an account to sync your board across devices."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </DialogContent>
    </Dialog>
  );
}