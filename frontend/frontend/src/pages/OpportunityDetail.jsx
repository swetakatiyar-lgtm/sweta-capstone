import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SkillLayout from "../components/SkillLayout";
import {
  Building2,
  MapPin,
  Wallet,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ShieldCheck,
  FolderCheck,
  Check,
  Circle,
  Bot,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { computeMatch, matchReasons, skillAlignment } from "../lib/match";
import { verifyCompany } from "../services/verify";
import { getCachedJob } from "../services/jobs";
import { askAI } from "../services/ai";
import { categoryStatus, computeReadiness } from "../lib/readiness";
import ApplyFlowModal from "../components/agent/ApplyFlowModal";
import { getApplicationStatus, canShowTimeline, APPLICATION_STATUS } from "../lib/applicationState";
import TrustBadge from "../components/TrustBadge";
import CompanyLogo from "../components/CompanyLogo";

function ChecklistRow({ done, label }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {done ? (
        <Check size={16} className="shrink-0 text-[#4FA66B]" />
      ) : (
        <Circle size={16} className="shrink-0 text-[#C4BFB7]" />
      )}
      <span className={done ? "text-[#18181B]" : "text-[#9CA3AF]"}>{label}</span>
    </div>
  );
}

export default function OpportunityDetail() {
  const { id } = useParams();
  const {
    profile,
    applications,
    documents,
    coverLettersGenerated,
    submitApplication,
    setSelectedOpportunity,
  } = useApp();
  const opp = getCachedJob(id);
  const [showApproval, setShowApproval] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState(false);

  // Let Ready Kit and Chat know which opportunity is "open" — this is
  // what makes "write a cover letter" in Chat work without re-explaining.
  useEffect(() => {
    if (opp) setSelectedOpportunity(opp.id);
  }, [opp, setSelectedOpportunity]);

  useEffect(() => {
    if (!opp) return;
    let cancelled = false;
    setAiSummaryLoading(true);
    setAiSummaryError(false);
    askAI(
      `In exactly one or two sentences, explain how well this internship matches the student, referencing their real skills and preferences by name. Internship: ${opp.role} at ${opp.company}, in ${opp.location}. Do not use markdown, just plain sentences.`,
      { profile, opportunity: opp },
    )
      .then((text) => {
        if (!cancelled) setAiSummary(text);
      })
      .catch((err) => {
        console.error("AI summary failed:", err);
        if (!cancelled) setAiSummaryError(true);
      })
      .finally(() => {
        if (!cancelled) setAiSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opp?.id]);

  if (!opp) {
    return (
      <SkillLayout badge="Opportunity Review" title="Not found" icon={<Building2 size={15} />}>
        <p className="text-[#6B7280]">
          This listing isn't in this session's cache — open it again from Scout, Chat, or the
          Dashboard so Career OS can fetch it live.
        </p>
        <Link to="/scout" className="mt-4 inline-block text-[#6B5AE0]">
          Back to Scout
        </Link>
      </SkillLayout>
    );
  }

  const trust = verifyCompany(opp);
  const oppWithTrust = { ...opp, trust: trust.level };
  const match = computeMatch(oppWithTrust, profile);
  const reasons = matchReasons(oppWithTrust, profile);
  const { matched, missing } = skillAlignment(opp, profile);
  // The one source of truth for this job's application state — never a
  // local flag, so a card can never show "Applied" unless a real, valid
  // tracked application record actually exists.
  const appStatus = getApplicationStatus(opp.id, { applications, documents });
  const applied = canShowTimeline(appStatus);
  const application = applications.find((a) => a.opportunityId === opp.id);

  // Real Agent Ready checklist — driven by actual uploaded/indexed
  // documents (Document Intelligence), not the old self-reported profile flags.
  const checklist = [
    { label: "Resume", done: categoryStatus(documents, "Resume") === "ready" },
    { label: "Portfolio", done: categoryStatus(documents, "Portfolio") === "ready" },
    { label: "Cover Letter Generated", done: coverLettersGenerated.includes(opp.id) },
    { label: "Company Verified", done: trust.level === "high" },
  ];
  const readyToApply = appStatus === APPLICATION_STATUS.READY;
  const readiness = computeReadiness(documents).percent;

  return (
    <SkillLayout
      badge="Opportunity Review"
      title={`${opp.company} ${opp.role}`}
      subtitle="Live listing from Adzuna, analyzed against your stored profile."
      icon={<Building2 size={15} />}
    >
      <div className="grid lg:grid-cols-[1.6fr_.9fr] gap-8">

        {/* Main Content */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-[32px] bg-white border border-[#ECE8DF] p-8 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="mb-5">
                <CompanyLogo company={opp.company} size={64} />
              </div>

              <h2 className="text-4xl font-bold text-[#18181B]">
                {opp.role}
              </h2>

              <p className="mt-2 text-[#6B7280] text-lg">
                {opp.company} • {opp.employmentType}
              </p>
            </div>

            <div className="text-right">
              <div className="text-5xl font-bold text-[#4FA66B]">{match}%</div>
              <p className="text-sm text-[#6B7280]">Match</p>
              <div className="mt-2 flex justify-end">
                <TrustBadge job={opp} />
              </div>
            </div>
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-4">

            <Info icon={<MapPin size={18}/>} label="Location" value={opp.location}/>

            <Info icon={<Wallet size={18}/>} label="Stipend" value={opp.salary || "Not disclosed"}/>

            <Info
              icon={<Clock size={18}/>}
              label="Posted"
              value={opp.postedDate ? new Date(opp.postedDate).toLocaleDateString([], { dateStyle: "medium" }) : "Recently"}
            />

          </div>

          <div className="mt-10">
            <h3 className="text-xl font-semibold text-[#18181B]">
              Why this matches you
            </h3>

            <div className="mt-5 space-y-4">
              {reasons.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle className="text-[#4FA66B] mt-1 shrink-0" size={18}/>
                  <p className="text-[#4B5563] leading-7">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <h3 className="text-xl font-semibold text-[#18181B] mb-5">
              Skills detected in this listing
            </h3>

            {matched.length + missing.length === 0 ? (
              <p className="text-sm text-[#9CA3AF]">
                The listing didn't mention any skills we recognize — read the full description below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {matched.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[#F5F2FF] px-4 py-2 text-sm text-[#6B5AE0]"
                  >
                    {skill}
                  </span>
                ))}
                {missing.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-dashed border-[#E8E2FF] px-4 py-2 text-sm text-[#9CA3AF]"
                  >
                    {skill} (missing)
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10">
            <h3 className="text-xl font-semibold text-[#18181B] mb-3">Full description</h3>
            <p className="whitespace-pre-line text-sm leading-7 text-[#4B5563]">{opp.description}</p>
          </div>

          <div className="mt-10">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-[#18181B] mb-1">
              <ShieldCheck size={19} className="text-[#8B7CF6]" />
              Trust Analysis
            </h3>
            <p className="mb-5 text-sm text-[#9CA3AF]">
              Real analysis of this listing's application link, wording, and contact details — not a
              fake badge.
            </p>

            {trust.level === "pending" ? (
              <div className="flex items-start gap-3 rounded-2xl bg-[#F7F5F1] p-5">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                <p className="text-sm leading-6 text-[#6B7280]">{trust.summary}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {[
                    { label: "Official domain", pass: trust.checks.officialDomain },
                    { label: "HTTPS secure", pass: trust.checks.httpsSecure },
                    { label: "Recognized careers/ATS platform", pass: trust.checks.careersPage },
                    { label: "No suspicious domain patterns", pass: !trust.checks.suspiciousDomain },
                    { label: "Not a URL shortener", pass: !trust.checks.urlShortener },
                    { label: "Company name matches domain", pass: trust.checks.companyMatch },
                    { label: "No scam indicators in listing text", pass: !trust.scamLanguageDetected },
                  ].map((row) => {
                    const Icon = row.pass ? CheckCircle2 : XCircle;
                    const color = row.pass ? "#4FA66B" : "#D64545";
                    return (
                      <div key={row.label} className="flex items-start gap-3 rounded-2xl bg-[#F7F5F1] p-4">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: `${color}18` }}
                        >
                          <Icon size={15} color={color} />
                        </div>
                        <p className="pt-1 text-sm leading-6 text-[#18181B]">{row.label}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#F8F6FF] p-5">
                  <Sparkles size={17} className="mt-0.5 shrink-0 text-[#8B7CF6]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#9A8F83]">
                      AI explanation
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-[#18181B]">{trust.summary}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to={`/ready-kit?opportunity=${opp.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#E8E2FF] bg-[#F8F6FF] px-6 py-3 font-medium text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
            >
              <FolderCheck size={17} />
              Prepare Documents
            </Link>

            <a
              href={opp.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#ECE8DF] bg-white px-6 py-3 font-medium text-[#18181B] transition hover:border-[#8B7CF6]/40"
            >
              Official Listing
              <ExternalLink size={15} />
            </a>

            {applied && (
              <Link
                to="/applications"
                className="inline-flex items-center gap-2 rounded-full bg-[#EAF6EC] px-6 py-3 font-medium text-[#3F8F5A] transition hover:bg-[#DFF1E3]"
              >
                <Check size={18} />
                Applied — View Tracker
              </Link>
            )}
          </div>
        </motion.div>

        {/* Right column: AI Summary + Agent Ready */}
        <div className="space-y-6">
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-[32px] bg-white border border-[#ECE8DF] p-8 shadow-sm"
          >
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#9A8F83]">
              <Sparkles size={12} />
              Career OS AI Summary
            </p>

            {aiSummaryLoading ? (
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-[#F1EEE8]" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-[#F1EEE8]" />
              </div>
            ) : aiSummaryError ? (
              <p className="mt-4 text-sm text-[#9CA3AF]">
                Couldn't generate an AI summary right now — the match reasons above are still real
                and computed from your profile.
              </p>
            ) : (
              <p className="mt-4 text-[#18181B] leading-7">{aiSummary}</p>
            )}

            <div className="mt-8 rounded-2xl bg-[#F8F6FF] p-5">
              <p className="text-sm text-[#6B7280]">
                Estimated application time
              </p>

              <h4 className="mt-2 text-3xl font-bold">18 min</h4>
            </div>
          </motion.div>

          {/* Agent Ready card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-[32px] border border-[#E8E2FF] bg-gradient-to-br from-white to-[#F8F6FF] p-8 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8B7CF6]">
                <Bot className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#9A8F83]">Career OS Agent</p>
                <h3 className="text-lg font-bold text-[#18181B]">
                  {applied ? "Applied" : readyToApply ? "Ready to Apply" : "Profile Incomplete"}
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {checklist.map((item) => (
                <ChecklistRow key={item.label} label={item.label} done={item.done} />
              ))}
            </div>

            {applied ? (
              <>
                <div className="mt-6 rounded-2xl bg-[#EAF6EC] p-4 text-sm text-[#3F8F5A]">
                  Applied {new Date(application.appliedDate).toLocaleDateString([], { dateStyle: "medium" })}.
                  Next follow-up {new Date(application.nextFollowUp).toLocaleDateString([], { dateStyle: "medium" })}.
                </div>
                <Link
                  to="/applications"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#ECE8DF] bg-white py-3 font-medium text-[#18181B] transition hover:border-[#8B7CF6]/40"
                >
                  View Timeline
                </Link>
              </>
            ) : readyToApply ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02, boxShadow: "0 12px 30px -8px rgba(139,124,246,0.55)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowApproval(true)}
                className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#8B7CF6] py-3.5 font-medium text-white shadow-lg shadow-[#8B7CF6]/25 transition hover:bg-[#7866F0]"
              >
                Apply with Career OS
                <ArrowUpRight size={18} />
              </motion.button>
            ) : (
              <Link
                to="/ready-kit"
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#D64545]/60 bg-[#FFF1F1] py-3.5 font-medium text-[#B54545] transition hover:bg-[#FFE5E5]"
              >
                <motion.span
                  className="flex items-center gap-2"
                  whileHover={{ x: [0, -3, 3, -3, 0] }}
                  transition={{ duration: 0.35 }}
                >
                  <AlertTriangle size={16} />
                  Complete Profile
                </motion.span>
              </Link>
            )}

            {!applied && !readyToApply && (
              <p className="mt-3 text-center text-xs text-[#9CA3AF]">
                A ready Resume unlocks applying — the rest of the checklist above is optional polish.
              </p>
            )}
          </motion.div>
        </div>

      </div>

      {showApproval && (
        <ApplyFlowModal
          opportunity={opp}
          documents={documents}
          readiness={readiness}
          onCancel={() => setShowApproval(false)}
          onConfirmApplied={() => submitApplication(opp)}
        />
      )}
    </SkillLayout>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#F7F5F1] p-4">
      <div className="flex items-center gap-2 text-[#6B7280] text-sm">
        {icon}
        {label}
      </div>

      <p className="mt-2 font-semibold text-[#18181B]">
        {value}
      </p>
    </div>
  );
}
