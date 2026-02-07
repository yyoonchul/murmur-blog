import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import PostView from "./pages/PostView";
import Editor from "./pages/Editor";
import Settings from "./pages/Settings";

export default function App() {
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
