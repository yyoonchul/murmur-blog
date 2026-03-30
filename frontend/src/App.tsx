import { Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/context/AuthContext";
import Login from "./features/auth/components/Login";
import Home from "./features/posts/pages/Home";
import PostView from "./features/posts/pages/PostView";
import Editor from "./features/posts/pages/Editor";
import Settings from "./features/settings/pages/Settings";
import Header from "./shared/components/Header";

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
    return <Login />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container-narrow pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostView />} />
          <Route path="/write" element={<Editor />} />
          <Route path="/edit/:id" element={<Editor />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
