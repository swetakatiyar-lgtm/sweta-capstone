import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SkillLayout from "../components/SkillLayout";
import HoverCard from "../components/ui/HoverCard";
import {
  Sparkles,
  Clock,
  Search,
  ShieldCheck,
  Calendar,
  ArrowRight,
  FolderOpen,
  Send,
  CalendarClock,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { computeMatch } from "../lib/match";
import { verifyCompany } from "../services/verify";
import { searchJobs } from "../services/jobs";
import { categoryStatus } from "../lib/readiness";
import { FileText } from "lucide-react";

const STATUS_COPY = {
  ready: "is fully ready to go",
  "needs-update": "needs one more update",
  missing: "is missing",
};

function relativeDay(iso) {
  const target = new Date(iso);
  const today = new Date();
  const diffDays = Math.round((target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `in ${diffDays} days`;
}

export default function DailyBrief() {
  const { profile, settings, applications, documents } = useApp();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    searchJobs({
      query: profile.preferredRole,
      location: profile.preferredLocations?.find((l) => l.toLowerCase() !== "remote") || "",
      remoteOnly: profile.workMode === "remote",
      resultsPerPage: 12,
    })
      .then(({ results }) => {
        if (!cancelled) setJobs(results);
      })
      .catch((err) => console.error("Daily Brief live fetch failed:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Agent Mode's "personal assistant" reminders — every card is a real fact
  // pulled from the applications the agent actually submitted (with
  // approval), not generic copy.
  const reminders = [];
  applications
    .filter((a) => relativeDay(a.appliedDate) === "yesterday" || relativeDay(a.appliedDate) === "today")
    .forEach((a) => {
      reminders.push({
        icon: Send,
        color: "#8B7CF6",
        text: `${a.company} application submitted ${relativeDay(a.appliedDate)}.`,
        to: "/applications",
      });
    });
  applications
    .filter((a) => a.nextFollowUp && ["today", "tomorrow"].includes(relativeDay(a.nextFollowUp)))
    .forEach((a) => {
      reminders.push({
        icon: CalendarClock,
        color: "#D4A017",
        text: `Follow up with ${a.company} ${relativeDay(a.nextFollowUp)}.`,
        to: "/applications",
      });
    });
  applications
    .filter((a) => a.interviewDate)
    .forEach((a) => {
      const day = relativeDay(a.interviewDate);
      const time = new Date(a.interviewDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      reminders.push({
        icon: Calendar,
        color: "#4FA66B",
        text: `${a.company} interview ${day} at ${time}.`,
        to: "/applications",
      });
    });
  documents
    .filter((d) => relativeDay(d.updatedAt) === "today")
    .forEach((d) => {
      reminders.push({
        icon: FileText,
        color: "#8B7CF6",
        text: d.aiAnalysis
          ? `${d.name} analyzed by Career OS today.`
          : `${d.name} updated today.`,
        to: `/documents/${d.id}`,
      });
    });

  const enriched = jobs.map((job) => ({ ...job, trust: verifyCompany(job).confidenceLevel }));
  const newToday = enriched.filter(
    (j) => j.postedDate && new Date(j.postedDate).toDateString() === new Date().toDateString(),
  );
  const verified = enriched.filter((j) => j.trust === "strong");
  const remoteMatches = enriched.filter((j) => j.workMode === "remote");
  const topMatchOpp = [...enriched]
    .map((o) => ({ ...o, match: computeMatch(o, profile) }))
    .sort((a, b) => b.match - a.match)[0];

  // Every line here is a real, computed fact from the live API results — not
  // filler copy about companies that were never actually fetched.
  const updates = [
    {
      icon: Search,
      color: "#8B7CF6",
      time: "Morning",
      title: newToday.length
        ? `${newToday[0].company} ${newToday[0].role} discovered`
        : loading
          ? "Scanning for new listings…"
          : "No new listings yet today",
      desc: newToday.length > 1
        ? `${newToday.length - 1} more new listing${newToday.length - 1 === 1 ? "" : "s"} also came in today.`
        : "Career OS checks live listings every morning.",
      to: newToday.length ? `/scout/${newToday[0].id}` : "/scout?filter=new",
    },
    {
      icon: ShieldCheck,
      color: "#4FA66B",
      time: "Afternoon",
      title: verified.length ? `${verified[0].company} ${verified[0].role} posted` : "No strongly-verified listings yet",
      desc: verified.length
        ? "Strong verification signals — not a guarantee, but a good sign worth reviewing."
        : "Open an opportunity to see its verification details.",
      to: verified.length ? `/scout/${verified[0].id}` : "/scout",
    },
    {
      icon: FolderOpen,
      color: "#D4A017",
      time: "Evening",
      title: remoteMatches.length
        ? `${remoteMatches.length} new remote opportunit${remoteMatches.length === 1 ? "y matches" : "ies match"} your profile`
        : `Portfolio ${STATUS_COPY[categoryStatus(documents, "Portfolio")] ?? "is missing"}`,
      desc: remoteMatches.length
        ? "Filtered to your remote work-mode preference."
        : categoryStatus(documents, "Portfolio") === "ready"
          ? "Nothing blocking your next application."
          : "Upload or update your portfolio to strengthen your applications.",
      to: remoteMatches.length ? "/scout?filter=verified" : "/documents",
    },
  ];

  return (
    <SkillLayout
      badge="Daily Intelligence"
      title={`${settings.briefTime} Brief`}
      subtitle="Generated from today's live internship listings. No endless tabs—just what matters."
      icon={<Sparkles size={15} />}
    >
      <div className="grid gap-8 lg:grid-cols-[1.35fr_.85fr]">

        {/* LEFT PANEL */}

        <HoverCard className="rounded-[36px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

          <p className="text-xs uppercase tracking-[0.25em] text-[#9A8F83]">
            Today's Summary
          </p>

          <h2 className="mt-3 text-4xl font-bold leading-tight text-[#18181B]">
            {loading
              ? "Fetching today's listings…"
              : newToday.length > 0
                ? `${newToday.length} new opportunit${newToday.length === 1 ? "y deserves" : "ies deserve"} your attention.`
                : "You're all caught up for today."}
          </h2>

          <p className="mt-4 max-w-xl leading-7 text-[#6B7280]">
            Career OS checked your preferences, ran verification checks on new listings, and found
            the most important actions before tomorrow.
          </p>

          {reminders.length > 0 && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {reminders.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link key={i} to={item.to} className="block">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="flex items-start gap-3 rounded-2xl border border-[#ECE8DF] bg-[#FAFAF9] p-4 transition-colors hover:border-[#8B7CF6]/30"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${item.color}20` }}
                      >
                        <Icon size={16} color={item.color} />
                      </div>
                      <p className="text-sm leading-6 text-[#3F3D3A]">{item.text}</p>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Timeline — every item deep-links into the page that explains it */}

          <div className="relative mt-10 space-y-2">

            <div className="absolute left-[19px] top-3 h-[calc(100%-2rem)] w-px bg-[#E8E2FF]" />

            {updates.map((item, index) => {
              const Icon = item.icon;

              return (
                <Link key={index} to={item.to} className="block">
                  <motion.div
                    whileHover={{ x: 3 }}
                    className="relative flex gap-5 rounded-2xl p-3 transition-colors hover:bg-[#FAFAF9]"
                  >
                    <div
                      className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${item.color}20` }}
                    >
                      <Icon size={18} color={item.color} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#9A8F83]">
                        {item.time}
                      </p>
                      <h3 className="font-semibold text-[#18181B]">
                        {item.title}
                      </h3>
                      <p className="mt-1 leading-7 text-[#6B7280]">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              );
            })}

          </div>

          <Link
            to={topMatchOpp ? `/scout/${topMatchOpp.id}` : "/scout"}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#18181B] px-6 py-3 text-white transition hover:bg-black"
          >
            Review Opportunities
            <ArrowRight size={18} />
          </Link>

        </HoverCard>

        {/* RIGHT PANEL */}

        <div className="space-y-6">

          {/* Next Brief */}

          <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4D8]">
                <Clock color="#D4A017" size={24} />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#9A8F83]">
                  Next Brief
                </p>

                <h3 className="text-3xl font-bold text-[#18181B]">
                  {settings.briefTime}
                </h3>
              </div>

            </div>

            <div className="mt-8 rounded-2xl bg-[#F8F6FF] p-5">
              <p className="text-sm leading-7 text-[#6B7280]">
                Every evening Career OS checks live listings, verifies companies,
                and reminds you before important deadlines.
              </p>
            </div>

            <Link
              to="/settings"
              className="mt-6 block w-full rounded-full border border-[#E8E2FF] bg-white py-3 text-center font-medium transition hover:bg-[#F8F6FF]"
            >
              Change Reminder Time
            </Link>

          </HoverCard>

          {/* Quick Snapshot */}

          <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

            <p className="text-xs uppercase tracking-[0.2em] text-[#9A8F83]">
              Quick Snapshot
            </p>

            <div className="mt-6 space-y-5">

              <Link
                to="/scout?filter=new"
                className="flex items-center justify-between rounded-2xl bg-[#F7F5F1] p-4 transition-colors hover:bg-[#F2EFEA]"
              >
                <div>
                  <p className="text-sm text-[#6B7280]">New Matches</p>
                  <h4 className="text-2xl font-bold text-[#18181B]">{loading ? "…" : newToday.length}</h4>
                </div>

                <div className="rounded-xl bg-[#F5F2FF] p-3">
                  <Search className="text-[#8B7CF6]" size={20} />
                </div>
              </Link>

              <Link
                to="/scout?filter=verified"
                className="flex items-center justify-between rounded-2xl bg-[#F7F5F1] p-4 transition-colors hover:bg-[#F2EFEA]"
              >
                <div>
                  <p className="text-sm text-[#6B7280]">Verified</p>
                  <h4 className="text-2xl font-bold text-[#18181B]">{loading ? "…" : verified.length}</h4>
                </div>

                <div className="rounded-xl bg-[#EAF6EC] p-3">
                  <ShieldCheck className="text-[#4FA66B]" size={20} />
                </div>
              </Link>

              <Link
                to="/applications"
                className="flex items-center justify-between rounded-2xl bg-[#F7F5F1] p-4 transition-colors hover:bg-[#F2EFEA]"
              >
                <div>
                  <p className="text-sm text-[#6B7280]">Active Applications</p>
                  <h4 className="text-2xl font-bold text-[#18181B]">
                    {applications.filter((a) => a.status !== "rejected" && a.status !== "offer").length}
                  </h4>
                </div>

                <div className="rounded-xl bg-[#FFF4D8] p-3">
                  <Calendar className="text-[#D4A017]" size={20} />
                </div>
              </Link>

            </div>

          </HoverCard>

        </div>

      </div>
    </SkillLayout>
  );
}
