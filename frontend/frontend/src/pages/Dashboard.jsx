import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Search,
  ShieldCheck,
  Clock,
  Briefcase,
  CalendarDays,
  FileText,
  FolderOpen,
  Send,
  FolderCheck,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import HoverCard from "../components/ui/HoverCard";
import { useApp } from "../context/AppContext";
import { computeMatch, preferredRoleList } from "../lib/match";
import { verifyCompany } from "../services/verify";
import { searchJobs } from "../services/jobs";
import { categoryStatus } from "../lib/readiness";
import { getApplicationStatus, APPLICATION_STATUS } from "../lib/applicationState";

const STATUS_LABEL = {
  ready: "Ready",
  indexing: "Indexing…",
  "needs-update": "Update Needed",
  missing: "Missing",
}

const STATUS_COLOR = {
  ready: "#4FA66B",
  indexing: "#8B7CF6",
  "needs-update": "#D4A017",
  missing: "#D64545",
}

export default function Dashboard() {
  const { profile, activity, applications, documents } = useApp();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hour = new Date().getHours();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchJobs({
      query: preferredRoleList(profile).join(" ") || "internship",
      location: profile.preferredLocations?.find((l) => l.toLowerCase() !== "remote") || "",
      remoteOnly: profile.workMode === "remote",
      resultsPerPage: 12,
    })
      .then(({ results }) => {
        if (!cancelled) setJobs(results);
      })
      .catch((err) => {
        console.error("Dashboard live fetch failed:", err);
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : "Good evening";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const enriched = jobs.map((job) => {
    const trust = verifyCompany(job);
    const jobWithTrust = { ...job, trust: trust.confidenceLevel, trustScore: trust.verificationConfidence };
    return { ...jobWithTrust, match: computeMatch(jobWithTrust, profile), trustLevel: trust.confidenceLevel };
  });
  const newTodayCount = jobs.filter(
    (j) => j.postedDate && new Date(j.postedDate).toDateString() === new Date().toDateString(),
  ).length;
  const verifiedCount = enriched.filter((j) => j.trustLevel === "strong").length;
  // "Ready to Apply" means the job's real, document-derived application
  // status is `ready` — i.e. the student's actual uploaded documents meet
  // the requirements to apply, not a trust/verification signal.
  const readyToApplyCount = enriched.filter(
    (j) => getApplicationStatus(j.id, { applications, documents }) === APPLICATION_STATUS.READY,
  ).length;
  const activeApplications = applications.filter(
    (a) => a.status !== "rejected" && a.status !== "offer",
  ).length;
  const appliedToday = applications.filter(
    (a) => new Date(a.appliedDate).toDateString() === new Date().toDateString(),
  ).length;
  // The earliest real upcoming date across every application — a scheduled
  // interview counts as a deadline too, not just a follow-up reminder.
  const now = Date.now();
  const upcomingDates = applications
    .flatMap((a) => [a.nextFollowUp, a.interviewDate].filter(Boolean))
    .filter((iso) => new Date(iso).getTime() >= now)
    .sort((a, b) => new Date(a) - new Date(b));
  const nextDeadline = upcomingDates[0] ?? null;

  const resumeStatus = categoryStatus(documents, "Resume");
  const portfolioStatus = categoryStatus(documents, "Portfolio");
  const resumeDoc = documents.find((d) => d.category === "Resume");
  const resumeUpdatedToday =
    resumeDoc && new Date(resumeDoc.updatedAt).toDateString() === new Date().toDateString();

  // Every card here is a doorway into the connected flow — Dashboard never
  // shows a number without a place for it to lead.
  const stats = [
    { icon: Search, value: loading ? "…" : String(newTodayCount), label: "New Matches", color: "#8B7CF6", to: "/scout?filter=new", hint: "Tap to open Scout" },
    { icon: ShieldCheck, value: loading ? "…" : String(verifiedCount), label: "Verified", color: "#4FA66B", to: "/scout?filter=verified", hint: "Tap to view trusted companies" },
    { icon: Send, value: String(activeApplications), label: "Applications in Progress", color: "#8B7CF6", to: "/applications", hint: "Opens the tracker" },
    { icon: FolderCheck, value: loading ? "…" : String(readyToApplyCount), label: "Ready to Apply", color: "#4FA66B", to: "/ready-kit", hint: "Opens Ready Kit" },
    {
      icon: Clock,
      value: nextDeadline ? new Date(nextDeadline).toLocaleDateString([], { month: "short", day: "numeric" }) : "—",
      label: "Next Deadline",
      color: "#D4A017",
      to: "/applications",
      hint: "Opens the tracker",
    },
  ];

  const displayChips = [
    ...profile.skills.slice(0, 3),
    profile.workMode === "remote" ? "Remote" : profile.workMode,
    `₹${Math.round(profile.minStipend / 1000)}K+`,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-10">

      {/* HERO */}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[40px] border border-[#ECE8DF] bg-gradient-to-br from-white via-[#FCFBF9] to-[#F8F6FF] p-10"
      >
        {/* Decorative blobs */}

        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#EFE8FF] blur-3xl opacity-80" />
        <div className="absolute bottom-0 left-24 h-40 w-40 rounded-full bg-[#FFF4D8] blur-3xl opacity-60" />

        <div className="relative">

          <div className="inline-flex items-center gap-2 rounded-full bg-[#F6F2FF] px-3 py-1 text-sm text-[#6B5AE0]">
            <Sparkles size={15} />
            Career OS
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">

            <div>
              <h1 className="text-6xl font-bold leading-[0.95] tracking-tight text-[#18181B]">
                {greeting},
                <br />
                {profile.name}.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-[#6B7280]">
                {resumeStatus === "missing"
                  ? "Upload your resume to unlock real job matching, evidence-based fit scores, and tailored applications."
                  : loading
                    ? "Fetching live internships that match your profile…"
                    : error
                      ? "Live listings are unavailable right now — open Scout to retry."
                      : `I found ${jobs.length} live opportunities worth checking today.`}
                {appliedToday > 0 && ` ${appliedToday} applied today.`}
                {resumeUpdatedToday && ` Resume updated today.`}
              </p>

              {resumeStatus === "missing" && (
                <Link
                  to="/documents"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#8B7CF6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7866F0]"
                >
                  <FileText size={15} />
                  Upload Resume
                </Link>
              )}
            </div>

            <div className="rounded-3xl border border-[#ECE8DF] bg-white/80 p-5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#F8F6FF] p-3">
                  <CalendarDays className="text-[#8B7CF6]" size={22} />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9A8F83]">
                    Today
                  </p>

                  <p className="font-semibold text-[#18181B]">
                    {today}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </motion.section>

      {error && (
        <HoverCard className="flex items-start gap-3 rounded-[24px] border border-[#F3C5C5] bg-[#FFF1F1] p-5 shadow-sm">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#D64545]" size={18} />
          <div>
            <p className="font-medium text-[#18181B]">Couldn't load live internships</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              {String(error.message ?? error).startsWith("MISSING_API_KEY")
                ? "Add VITE_ADZUNA_APP_ID and VITE_ADZUNA_APP_KEY to your .env file to enable live listings."
                : "Open Scout to retry the search."}
            </p>
          </div>
        </HoverCard>
      )}

      {/* STATS */}

      <section className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.label} to={item.to} className="block h-full">
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="group flex h-full min-h-[272px] flex-col rounded-[28px] border border-[#ECE8DF] bg-white p-6 shadow-sm transition-shadow hover:border-[#8B7CF6]/40 hover:shadow-[0_20px_40px_-20px_rgba(139,124,246,0.35)]"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: `${item.color}20` }}
                >
                  <Icon size={22} color={item.color} />
                </div>

                <h2 className="mt-7 text-4xl font-bold text-[#18181B]">
                  {item.value}
                </h2>

                <p className="mt-2 text-[#6B7280]">
                  {item.label}
                </p>

                <p className="mt-auto min-h-[24px] pt-3 text-xs font-medium text-[#8B7CF6] opacity-0 transition-opacity group-hover:opacity-100">
                  {item.hint} →
                </p>
              </motion.div>
            </Link>
          );
        })}
      </section>

      {/* ACTIVITY + PREFERENCES */}

      <section className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">

        {/* Activity */}

        <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-bold text-[#18181B]">
            Recent AI Activity
          </h2>

          {activity.length === 0 ? (
            <p className="mt-6 text-sm text-[#9CA3AF]">
              Nothing yet — save a job, upload a document, or apply and it'll show up here.
            </p>
          ) : (
            <div className="relative mt-8 space-y-8">

              <div className="absolute left-[5px] top-2 h-full w-px bg-[#E8E2FF]" />

              {activity.slice(0, 4).map((item) => (
                <div key={item.id} className="relative flex gap-4">

                  <div className="z-10 mt-1 h-3 w-3 rounded-full bg-[#8B7CF6]" />

                  <div>
                    <h3 className="font-medium text-[#18181B]">
                      {item.text}
                    </h3>

                    <p className="text-sm text-[#6B7280]">
                      {item.time}
                    </p>
                  </div>

                </div>
              ))}

            </div>
          )}

        </HoverCard>

        {/* Preferences */}

        <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8F6FF]">
              <Briefcase className="text-[#8B7CF6]" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#18181B]">
                Career Preferences
              </h2>

              <p className="text-sm text-[#6B7280]">
                {profile.skills.length} skills · Used by Opportunity Scout
              </p>
            </div>

          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {displayChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-[#F8F6FF] px-4 py-2 text-sm text-[#6B5AE0]"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-8 space-y-3">

            <Link
              to="/documents"
              className="flex items-center justify-between rounded-2xl bg-[#F7F5F1] p-4 transition-colors hover:bg-[#F2EFEA]"
            >
              <div className="flex items-center gap-3">
                <FileText className="text-[#8B7CF6]" size={18} />
                <span>Resume</span>
              </div>

              <span className="text-sm" style={{ color: STATUS_COLOR[resumeStatus] }}>
                {STATUS_LABEL[resumeStatus]}
              </span>
            </Link>

            <Link
              to="/documents"
              className="flex items-center justify-between rounded-2xl bg-[#F7F5F1] p-4 transition-colors hover:bg-[#F2EFEA]"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="text-[#8B7CF6]" size={18} />
                <span>Portfolio</span>
              </div>

              <span className="text-sm" style={{ color: STATUS_COLOR[portfolioStatus] }}>
                {STATUS_LABEL[portfolioStatus]}
              </span>
            </Link>

          </div>

        </HoverCard>

      </section>

    </div>
  );
}
