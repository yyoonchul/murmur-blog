import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "../../features/auth/service/authService";

type HeaderVariant = "app" | "landing";

export default function Header({ variant = "app" }: { variant?: HeaderVariant }) {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isSettings = location.pathname === "/settings";
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  if (variant === "landing") {
    return (
      <header className="container-narrow py-8">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <h1 className="sr-only">Monolog</h1>
            <img src="/monolog-logo.svg" alt="Monolog" className="h-10" />
          </Link>
          <div className="flex items-center gap-5 text-sm text-secondary">
            <Link to="/login" className="hover:text-primary transition-colors">
              Sign in
            </Link>
            <Link to="/login" className="btn-primary text-xs px-3 py-1.5">
              Sign up
            </Link>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="container-narrow py-8">
      <nav className="flex items-center justify-between">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <h1 className="sr-only">Monolog</h1>
          <img src="/monolog-logo.svg" alt="Monolog" className="h-10" />
        </Link>
        <div className="flex items-center gap-6 text-sm text-secondary">
          <Link
            to="/"
            className={
              isHome
                ? "text-accent border-b border-accent pb-1"
                : "hover:text-primary transition-colors"
            }
          >
            Blog
          </Link>
          <Link
            to="/settings"
            className={
              isSettings
                ? "text-accent border-b border-accent pb-1"
                : "hover:text-primary transition-colors"
            }
          >
            Settings
          </Link>
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              className="hover:text-primary transition-colors flex items-center gap-1"
              onClick={() => setAccountOpen((o) => !o)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              Account
              <span className="text-xs opacity-70">{accountOpen ? "▴" : "▾"}</span>
            </button>
            {accountOpen && (
              <div
                className="absolute right-0 top-full mt-2 py-1 min-w-[10rem] rounded-lg border border-border-light bg-surface shadow-lg z-50"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface/80 transition-colors"
                  onClick={() => {
                    setAccountOpen(false);
                    signOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
