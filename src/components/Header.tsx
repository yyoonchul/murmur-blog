import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isSettings = location.pathname === "/settings";

  return (
    <header className="container-narrow py-8">
      <nav className="flex items-center justify-between">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <h1 className="sr-only">Murmur</h1>
          <img src="/murmur-logo.svg" alt="Murmur" className="h-10" />
        </Link>
        <div className="flex gap-6 text-sm text-secondary">
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
        </div>
      </nav>
    </header>
  );
}
