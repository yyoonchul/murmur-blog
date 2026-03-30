import { useState } from "react";
import { signInWithOtp } from "../service/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setMessage("");
    const redirectTo = `${window.location.origin}/`;
    const { error } = await signInWithOtp(email.trim(), redirectTo);
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <img src="/monolog-logo.svg" alt="Monolog" className="h-12 mb-8" />
      <div className="w-full max-w-sm space-y-6">
        <h1 className="font-display text-2xl font-semibold text-center">Sign in</h1>
        <p className="text-sm text-secondary text-center">
          We&apos;ll email you a magic link. No password required.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-primary w-full py-2 text-sm disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>
        {message && (
          <p className={`text-sm text-center ${status === "error" ? "text-red-600" : "text-secondary"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
