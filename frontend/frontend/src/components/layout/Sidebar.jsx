import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Compass,
  FolderClosed,
  Sparkles,
  MessageSquare,
  Settings,
  Briefcase,
  Send,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { computeReadiness } from "../../lib/readiness";

const nav = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/",
    icon: LayoutGrid,
  },
  {
    id: "scout",
    label: "Scout",
    to: "/scout",
    icon: Compass,
  },
  {
    id: "applications",
    label: "Applications",
    to: "/applications",
    icon: Send,
  },
  {
    id: "chat",
    label: "AI Chat",
    to: "/chat",
    icon: MessageSquare,
  },
  {
    id: "brief",
    label: "Daily Brief",
    to: "/daily-brief",
    icon: Sparkles,
  },
  {
    id: "documents",
    label: "Documents",
    to: "/documents",
    icon: FolderClosed,
  },
];

function NavItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
          isActive
            ? "text-[#18181B]"
            : "text-[#6B7280] hover:text-[#18181B]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="active-pill"
              className="absolute inset-0 rounded-2xl bg-white shadow-[0_8px_30px_rgba(24,24,27,0.08)]"
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 34,
              }}
            />
          )}

          <Icon
            size={18}
            strokeWidth={1.9}
            className={`relative z-10 transition-transform ${
              isActive ? "scale-105" : "group-hover:scale-105"
            }`}
          />

          <span className="relative z-10 font-medium">
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { profile, documents } = useApp();
  const readiness = computeReadiness(documents).percent;

  return (
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[224px] flex-col border-r border-[#ECE8DF]/70 bg-[#FAF8F4]/80 px-4 py-6 backdrop-blur-2xl sm:flex">

      {/* Logo */}

      <div className="mb-8 px-2">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B7CF6] to-[#A796FF] text-white shadow-lg shadow-[#8B7CF6]/25">
            <Briefcase size={18} />
          </div>

          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-[#18181B]">
              Career OS
            </h1>

            <p className="text-[11px] text-[#8B8B94]">
              AI Career Assistant
            </p>
          </div>

        </div>

      </div>

      {/* Navigation */}

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Settings */}

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `group mb-3 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
            isActive
              ? "bg-white text-[#18181B] shadow-md"
              : "text-[#6B7280] hover:bg-white hover:text-[#18181B]"
          }`
        }
      >
        <Settings
          size={18}
          strokeWidth={1.9}
          className="group-hover:rotate-12 transition-transform"
        />

        <span className="font-medium">Settings</span>
      </NavLink>

      {/* Profile */}

      <motion.div
        whileHover={{ y: -2 }}
        className="rounded-[24px] border border-[#ECE8DF] bg-white p-4 shadow-sm"
      >

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7CF6] to-[#6FD6A7] text-sm font-semibold text-white">
            {profile.name[0]}
          </div>

          <div className="min-w-0">

            <p className="truncate text-[14px] font-semibold text-[#18181B]">
              {profile.name}
            </p>

            <p className="truncate text-[12px] text-[#8B8B94]">
              {profile.role}
            </p>

          </div>

        </div>

        <div className="mt-4">

          <div className="mb-2 flex justify-between text-[11px] text-[#8B8B94]">
            <span>Application Readiness</span>
            <span className="font-medium text-[#6B5AE0]">{readiness}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#F1EEE8]">

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readiness}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-[#8B7CF6] to-[#6FD6A7]"
            />

          </div>

        </div>

      </motion.div>

    </aside>
  );
}
