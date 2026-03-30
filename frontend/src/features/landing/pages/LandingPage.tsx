import { Link } from "react-router-dom";
import Header from "../../../shared/components/Header";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="landing" />
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
        <p className="text-sm text-secondary uppercase tracking-widest mb-4">Monolog</p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-center text-balance max-w-xl mb-4">
          A quiet writing surface
        </h1>
        <p className="text-secondary text-center max-w-md text-sm leading-relaxed mb-10">
          Write in markdown. AI personas read your posts and leave threaded comments—warm, sharp, or curious—so
          you never publish into silence.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link to="/login" className="btn-primary text-sm px-6 py-2.5">
            Sign in with Google
          </Link>
          <Link to="/login" className="text-sm text-secondary hover:text-primary transition-colors">
            Create account (Google)
          </Link>
        </div>
      </main>
    </div>
  );
}
