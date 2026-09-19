import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function titleFor(pathname) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/scout/")) return "Opportunity Details";
  if (pathname.startsWith("/scout")) return "Opportunity Scout";
  if (pathname.startsWith("/ready-kit")) return "Application Ready Kit";
  if (pathname.startsWith("/daily-brief")) return "Daily Career Brief";
  if (pathname.startsWith("/documents/")) return "Document";
  if (pathname.startsWith("/documents")) return "Documents";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/chat")) return "Chat";
  return "Career OS";
}

export default function AppShell() {
  const location = useLocation();
  const title = titleFor(location.pathname);

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Floating Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="min-h-screen sm:ml-[224px]">
        {/* Sticky Navbar */}
        <Topbar title={title} />

        {/* Animated Page Content */}
        <main className="px-8 py-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto max-w-7xl"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
