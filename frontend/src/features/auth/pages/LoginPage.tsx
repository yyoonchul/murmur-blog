import { useState } from "react";
import { Link } from "react-router-dom";
import { signInWithGoogle } from "../service/authService";
import Header from "../../../shared/components/Header";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleGoogle() {
    setStatus("loading");
    setMessage("");
    const { error } = await signInWithGoogle();
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="landing" />
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-secondary">Use your Google account to continue.</p>
          <button
            type="button"
            disabled={status === "loading"}
            onClick={handleGoogle}
            className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {status === "loading" ? "Redirecting…" : "Continue with Google"}
          </button>
          {message && <p className="text-sm text-accent">{message}</p>}
          <Link to="/" className="text-sm text-secondary hover:text-primary block">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
