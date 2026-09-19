import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Compass,
  MapPin,
  Wallet,
  Clock,
  ArrowUpRight,
  Heart,
  CheckCircle2,
  X,
  Check,
  Search,
  AlertTriangle,
} from "lucide-react";
import SkillLayout from "../components/SkillLayout";
import HoverCard from "../components/ui/HoverCard";
import { useApp } from "../context/AppContext";
import { computeMatch, matchReasons } from "../lib/match";
import { verifyCompany } from "../services/verify";
import TrustBadge from "../components/TrustBadge";
import CompanyLogo from "../components/CompanyLogo";
import { searchJobs } from "../services/jobs";
import { computeReadiness, categoryLabel } from "../lib/readiness";
import ApplyFlowModal from "../components/agent/ApplyFlowModal";
import { getApplicationStatus, canShowTimeline, APPLICATION_STATUS } from "../lib/applicationState";
import { STATUS_LABELS, STATUS_COLORS } from "../lib/agent";

const FILTER_LABELS = {
  new: "New Today",
  verified: "Verified",
  applied: "Applications",
  saved: "Saved",
};

function friendlyJobsError(error) {
  const message = String(error?.message ?? error);
  if (message.startsWith("MISSING_API_KEY")) {
    return "Live listings aren't configured yet — add VITE_ADZUNA_APP_ID and VITE_ADZUNA_APP_KEY to your .env file.";
  }
  if (message.startsWith("INVALID_API_KEY")) {
    return "The job provider rejected our credentials. Check your Adzuna app id/key.";
  }
  if (message.startsWith("NETWORK_ERROR")) {
    return "Couldn't reach the job provider — check your internet connection.";
  }
  return "Couldn't load live internships right now. Please try again.";
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[32px] border border-[#ECE8DF] bg-white p-7">
      <div className="flex gap-5">
        <div className="h-16 w-16 rounded-2xl bg-[#F1EEE8]" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-1/3 rounded bg-[#F1EEE8]" />
          <div className="h-4 w-1/4 rounded bg-[#F1EEE8]" />
          <div className="h-3 w-2/3 rounded bg-[#F1EEE8]" />
        </div>
      </div>
    </div>
  );
}

export default function Scout() {
  const { profile, documents, applications, isJobSaved, toggleSaveJob, submitApplication } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter");
  const sort = searchParams.get("sort");

  const [query, setQuery] = useState(profile.preferredRole || "internship");
  const [locationQuery, setLocationQuery] = useState(
    profile.preferredLocations?.find((l) => l.toLowerCase() !== "remote") || "",
  );
  const [workMode, setWorkMode] = useState(
    ["remote", "hybrid", "onsite"].includes(profile.workMode) ? profile.workMode : "all",
  );
  const [postedToday, setPostedToday] = useState(false);
  const [minStipend, setMinStipend] = useState(0);

  // Debounced copies actually drive the API call — typing shouldn't fire a
  // live request (and burn Adzuna's rate limit) on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [debouncedLocation, setDebouncedLocation] = useState(locationQuery);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationQuery), 500);
    return () => clearTimeout(t);
  }, [locationQuery]);

  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);

  const sentinelRef = useRef(null);
  const requestIdRef = useRef(0);

  const readiness = computeReadiness(documents).percent;

  const runSearch = useCallback(
    async (targetPage, { append } = { append: false }) => {
      const requestId = ++requestIdRef.current;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }

      try {
        const { results, hasMore: more } = await searchJobs({
          query: debouncedQuery,
          location: debouncedLocation,
          workMode,
          postedToday,
          minStipend,
          page: targetPage,
          resultsPerPage: 20,
        });

        if (requestId !== requestIdRef.current) return; // a newer search superseded this one

        setJobs((prev) => (append ? [...prev, ...results] : results));
        setHasMore(more);
        setPage(targetPage);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error("Job search failed:", err);
        setError(err);
        setHasMore(false); // stop the infinite-scroll sentinel from retrying in a loop
        if (!append) setJobs([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, debouncedLocation, workMode, postedToday, minStipend],
  );

  // Fresh search whenever a filter changes (query/location only after their debounce settles).
  useEffect(() => {
    runSearch(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, debouncedLocation, workMode, postedToday, minStipend]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          runSearch(page + 1, { append: true });
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, runSearch]);

  const enriched = jobs.map((job) => {
    const trust = verifyCompany(job);
    const jobWithTrust = { ...job, trust: trust.confidenceLevel };
    return {
      ...jobWithTrust,
      match: computeMatch(jobWithTrust, profile),
      reasons: matchReasons(jobWithTrust, profile),
      trustScore: trust.verificationConfidence,
      saved: isJobSaved(job.id),
      // The one place a card's application state is decided — never a local
      // flag, always this single, document-aware source of truth.
      appStatus: getApplicationStatus(job.id, { applications, documents }),
      isNew: job.postedDate && new Date(job.postedDate).toDateString() === new Date().toDateString(),
    };
  });

  let filtered = enriched;
  if (filter === "new") filtered = filtered.filter((j) => j.isNew);
  if (filter === "verified") filtered = filtered.filter((j) => j.trust === "strong");
  if (filter === "applied") filtered = filtered.filter((j) => canShowTimeline(j.appStatus));
  if (filter === "saved") filtered = filtered.filter((j) => j.saved);

  filtered = [...filtered].sort((a, b) =>
    sort === "deadline"
      ? new Date(b.postedDate ?? 0) - new Date(a.postedDate ?? 0)
      : b.match - a.match,
  );

  const filterChips = [
    ...profile.skills.slice(0, 2),
    profile.workMode === "remote" ? "Remote" : profile.workMode,
    `₹${Math.round(profile.minStipend / 1000)}K+`,
    profile.preferredRole,
  ].filter(Boolean);

  return (
    <SkillLayout
      badge="Opportunity Scout"
      title="Live Internship Discovery"
      subtitle={
        loading
          ? "Fetching live internships…"
          : `${filtered.length} live internship${filtered.length === 1 ? "" : "s"} ranked against your profile.`
      }
      icon={<Compass size={15} />}
    >
      {/* Active filter, arrived here from a Dashboard/Daily Brief card */}
      {(filter || sort) && (
        <div className="mb-6 flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-full bg-[#18181B] px-4 py-2 text-sm font-medium text-white">
            {filter ? FILTER_LABELS[filter] ?? filter : "Sorted by newest"}
            <button
              type="button"
              onClick={() => setSearchParams({})}
              aria-label="Clear filter"
              className="text-white/70 hover:text-white"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Search + filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-[#ECE8DF] bg-white px-4 py-2.5">
          <Search size={15} className="text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Role or keywords…"
            className="w-full bg-transparent text-sm text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none"
          />
        </div>

        <input
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          placeholder="Location…"
          className="w-40 rounded-full border border-[#ECE8DF] bg-white px-4 py-2.5 text-sm text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none"
        />

        {["all", "remote", "hybrid", "onsite"].map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setWorkMode(mode)}
            aria-pressed={workMode === mode}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium capitalize transition ${
              workMode === mode
                ? "border-[#8B7CF6] bg-[#F5F2FF] text-[#6B5AE0]"
                : "border-[#ECE8DF] bg-white text-[#6B7280]"
            }`}
          >
            {mode === "all" ? "Any mode" : mode}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setPostedToday((v) => !v)}
          aria-pressed={postedToday}
          className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
            postedToday
              ? "border-[#8B7CF6] bg-[#F5F2FF] text-[#6B5AE0]"
              : "border-[#ECE8DF] bg-white text-[#6B7280]"
          }`}
        >
          Posted Today
        </button>

        <select
          value={minStipend}
          onChange={(e) => setMinStipend(Number(e.target.value))}
          className="rounded-full border border-[#ECE8DF] bg-white px-4 py-2.5 text-sm text-[#6B7280] focus:outline-none"
        >
          <option value={0}>Any stipend</option>
          <option value={15000}>₹15,000+</option>
          <option value={30000}>₹30,000+</option>
          <option value={50000}>₹50,000+</option>
        </select>
      </div>

      {/* Preference chips — informational, not filters */}
      <div className="mb-8 flex flex-wrap gap-3">
        {filterChips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-[#E8E2FF] bg-[#F8F6FF] px-4 py-2 text-sm text-[#6B5AE0]"
          >
            {chip}
          </span>
        ))}
      </div>

      {error && (
        <HoverCard className="mb-6 flex items-start gap-3 rounded-[24px] border border-[#F3C5C5] bg-[#FFF1F1] p-5 shadow-sm">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#D64545]" size={18} />
          <div>
            <p className="font-medium text-[#18181B]">Couldn't load live internships</p>
            <p className="mt-1 text-sm text-[#6B7280]">{friendlyJobsError(error)}</p>
          </div>
        </HoverCard>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 && !error ? (
        <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-10 text-center shadow-sm">
          <p className="text-[#6B7280]">No live internships match this search right now.</p>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="mt-4 rounded-full border border-[#E8E2FF] bg-[#F8F6FF] px-5 py-2.5 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
          >
            Clear filter
          </button>
        </HoverCard>
      ) : (
        <div className="space-y-6">
          {filtered.map((job) => (
            <HoverCard
              key={job.id}
              className="rounded-[32px] border border-[#ECE8DF] bg-white p-7 shadow-sm transition-shadow hover:border-[#8B7CF6]/30 hover:shadow-[0_20px_40px_-24px_rgba(139,124,246,0.35)]"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-5">
                  <CompanyLogo company={job.company} size={64} />

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-[#18181B]">{job.role}</h2>

                      {job.match >= 90 && (
                        <span className="rounded-full bg-[#F8F6FF] px-3 py-1 text-xs font-medium text-[#6B5AE0]">
                          Top Match
                        </span>
                      )}
                      {job.isNew && (
                        <span className="rounded-full bg-[#FFF4D8] px-3 py-1 text-xs font-medium text-[#8A6A1F]">
                          Posted today
                        </span>
                      )}
                      <TrustBadge job={job} />
                    </div>

                    <p className="mt-1 text-[#6B7280]">{job.company}</p>

                    <div className="mt-5 flex flex-wrap gap-6 text-sm text-[#6B7280]">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        {job.location}
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-2">
                          <Wallet size={16} />
                          {job.salary}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        {job.postedDate ? new Date(job.postedDate).toLocaleDateString([], { dateStyle: "medium" }) : "Recently"}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-1.5">
                      {job.reasons.slice(0, 3).map((reason) => (
                        <div key={reason} className="flex items-center gap-2 text-sm text-[#4B5563]">
                          <CheckCircle2 size={14} className="text-[#4FA66B] shrink-0" />
                          {reason}
                        </div>
                      ))}
                    </div>

                    <Link to="/ready-kit" className="mt-5 block max-w-[280px]">
                      <div className="mb-1.5 flex justify-between text-xs text-[#9A8F83]">
                        <span>Application Readiness</span>
                        <span className="font-medium text-[#6B5AE0]">{readiness}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F1EEE8]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#8B7CF6] to-[#6FD6A7]"
                          initial={{ width: 0 }}
                          animate={{ width: `${readiness}%` }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#9CA3AF]">
                        <span>{categoryLabel(documents, "Resume")}</span>
                        <span>{categoryLabel(documents, "Portfolio")}</span>
                        <span>{categoryLabel(documents, "Case Study")}</span>
                      </div>
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-5">
                  <div className="text-right">
                    <div className="text-4xl font-bold text-[#4FA66B]">{job.match}%</div>
                    <p className="text-sm text-[#6B7280]">Match</p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSaveJob(job)}
                      aria-pressed={job.saved}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                        job.saved
                          ? "border-[#8B7CF6] bg-[#F5F2FF] text-[#6B5AE0]"
                          : "border-[#E8E2FF] bg-[#F8F6FF] text-[#6B5AE0] hover:bg-[#EFE8FF]"
                      }`}
                    >
                      <Heart size={15} fill={job.saved ? "#8B7CF6" : "none"} />
                      {job.saved ? "Saved" : "Save"}
                    </button>

                    <Link
                      to={`/scout/${job.id}`}
                      className="flex items-center gap-2 rounded-full border border-[#ECE8DF] bg-white px-4 py-2.5 text-sm font-medium text-[#18181B] transition hover:border-[#8B7CF6]/40"
                    >
                      Open Details
                      <ArrowUpRight size={16} />
                    </Link>

                    {canShowTimeline(job.appStatus) ? (
                      <>
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white"
                          style={{ background: STATUS_COLORS[job.appStatus] }}
                        >
                          <Check size={15} />
                          {job.appStatus === "submitted" ? "Applied" : STATUS_LABELS[job.appStatus]}
                        </motion.span>
                        <Link
                          to="/applications"
                          className="flex items-center gap-2 rounded-full border border-[#ECE8DF] bg-white px-4 py-2.5 text-sm font-medium text-[#18181B] transition hover:border-[#8B7CF6]/40"
                        >
                          View Timeline
                        </Link>
                      </>
                    ) : job.appStatus === APPLICATION_STATUS.READY ? (
                      <motion.button
                        type="button"
                        onClick={() => setApplyTarget(job)}
                        whileHover={{ scale: 1.03, boxShadow: "0 12px 30px -8px rgba(139,124,246,0.55)" }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="flex cursor-pointer items-center gap-2 rounded-full bg-[#8B7CF6] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#8B7CF6]/25 transition-colors hover:bg-[#7866F0]"
                      >
                        Apply with Career OS
                      </motion.button>
                    ) : (
                      <Link
                        to="/ready-kit"
                        className="group flex items-center gap-2 rounded-full border-2 border-[#D64545]/60 bg-[#FFF1F1] px-4 py-2.5 text-sm font-medium text-[#B54545] transition hover:bg-[#FFE5E5]"
                      >
                        <motion.span
                          className="flex items-center gap-2"
                          whileHover={{ x: [0, -3, 3, -3, 0] }}
                          transition={{ duration: 0.35 }}
                        >
                          <AlertTriangle size={14} />
                          Complete Profile
                        </motion.span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </HoverCard>
          ))}

          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B7CF6] border-t-transparent" />
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {!hasMore && filtered.length > 0 && (
            <p className="py-4 text-center text-sm text-[#9CA3AF]">You've reached the end of live results.</p>
          )}
        </div>
      )}

      {applyTarget && (
        <ApplyFlowModal
          opportunity={applyTarget}
          documents={documents}
          readiness={readiness}
          onCancel={() => setApplyTarget(null)}
          onConfirmApplied={() => submitApplication(applyTarget)}
        />
      )}
    </SkillLayout>
  );
}
