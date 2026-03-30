import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/context/AuthContext";
import LoginPage from "./features/auth/pages/LoginPage";
import LandingPage from "./features/landing/pages/LandingPage";
import Home from "./features/posts/pages/Home";
import PostView from "./features/posts/pages/PostView";
import Editor from "./features/posts/pages/Editor";
import Settings from "./features/settings/pages/Settings";
import Header from "./shared/components/Header";

function AuthedLayout() {
  return (
    <div className="min-h-screen">
      <Header variant="app" />
      <main className="container-narrow pb-16">
        <Outlet />
      </main>
    </div>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-secondary text-sm">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AuthedLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/post/:id" element={<PostView />} />
        <Route path="/write" element={<Editor />} />
        <Route path="/edit/:id" element={<Editor />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
