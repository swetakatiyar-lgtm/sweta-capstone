import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import SkillLayout from "../components/SkillLayout";
import HoverCard from "../components/ui/HoverCard";
import {
  FolderCheck,
  FileText,
  Briefcase,
  Award,
  Mail,
  CheckCircle2,
  Circle,
  MessageSquare,
  Upload,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getCachedJob } from "../services/jobs";
import { computeReadiness, categoryStatus } from "../lib/readiness";

const CATEGORY_ICON = {
  Resume: FileText,
  Portfolio: Briefcase,
  "Case Study": FolderCheck,
  Certificate: Award,
  "Cover Letter": Mail,
};

const STATUS_COPY = {
  ready: { label: "Ready", color: "#4FA66B" },
  indexing: { label: "Indexing…", color: "#8B7CF6" },
  "needs-update": { label: "Needs Attention", color: "#D4A017" },
  missing: { label: "Missing", color: "#9CA3AF" },
};

export default function ReadyKit() {
  const { documents, setSelectedOpportunity, setPendingChatPrompt, markCoverLetterGenerated } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const opportunityId = searchParams.get("opportunity");
  const opportunity = opportunityId ? getCachedJob(opportunityId) : null;

  // Arriving here from "Prepare Documents" on an opportunity keeps that
  // opportunity selected, so Chat still knows it if the user jumps there.
  useEffect(() => {
    if (opportunity) setSelectedOpportunity(opportunity.id);
  }, [opportunity, setSelectedOpportunity]);

  const generateCoverLetter = () => {
    const prompt = opportunity
      ? `Write a cover letter for the ${opportunity.role} role at ${opportunity.company}.`
      : "Write a cover letter for my next internship application.";
    if (opportunity) markCoverLetterGenerated(opportunity.id);
    setPendingChatPrompt(prompt);
    navigate("/chat");
  };

  // Real readiness — computed from actual uploaded documents (Document
  // Intelligence), not a locally-toggled fake checklist.
  const readiness = computeReadiness(documents);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (readiness.percent / 100) * circumference;

  const categories = readiness.breakdown.map((b) => b.category);
  const tasks = categories.map((category) => {
    const status = categoryStatus(documents, category);
    const doc = documents.find((d) => d.category === category);
    return { category, status, doc, Icon: CATEGORY_ICON[category] };
  });

  const firstGap = tasks.find((t) => t.status !== "ready");

  return (
    <SkillLayout
      badge="Application Ready"
      title={opportunity ? `Ready Kit — ${opportunity.company}` : "Ready Kit"}
      subtitle={
        opportunity
          ? `Everything you need before applying to ${opportunity.role}.`
          : "Everything you need before hitting Apply — computed from your real documents."
      }
      icon={<FolderCheck size={15} />}
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">

        {/* Left Column */}

        <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-6">

            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#9A8F83]">
                Application Progress
              </p>

              <h2 className="mt-2 text-3xl font-bold text-[#18181B]">
                {readiness.percent}% Ready
              </h2>

              <p className="mt-2 text-[#6B7280]">
                Complete the remaining items before applying.
              </p>
            </div>

            {/* Progress Ring */}

            <div className="relative h-36 w-36">

              <svg
                viewBox="0 0 140 140"
                className="h-full w-full -rotate-90"
              >
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#F1EEE8"
                  strokeWidth="10"
                  fill="none"
                />

                <motion.circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#8B7CF6"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 0.7 }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[#18181B]">
                  {readiness.percent}%
                </span>

                <span className="text-xs text-[#6B7280]">
                  Ready
                </span>
              </div>

            </div>

          </div>

          {/* Checklist — each row is a real document category, click to open it */}

          <div className="mt-10 space-y-3">

            {tasks.map((task) => {
              const Icon = task.Icon;

              return (
                <Link
                  key={task.category}
                  to={task.doc ? `/documents/${task.doc.id}` : "/documents"}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#F7F5F1] p-4 text-left transition hover:bg-[#F2EFEA]"
                >
                  <div className="flex items-center gap-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                      <Icon size={20} className="text-[#8B7CF6]" />
                    </div>

                    <div>
                      <h3 className="font-medium text-[#18181B]">
                        {task.category}
                      </h3>

                      <p className="text-sm text-[#6B7280]">
                        {task.doc ? task.doc.name : "Not uploaded yet"}
                      </p>
                    </div>

                  </div>

                  {task.status === "ready" ? (
                    <CheckCircle2 className="text-[#4FA66B]" size={22} />
                  ) : task.status === "missing" ? (
                    <Upload className="text-[#C4BFB7]" size={18} />
                  ) : (
                    <Circle className="text-[#C4BFB7]" size={22} />
                  )}
                </Link>
              );
            })}

          </div>

        </HoverCard>

        {/* Right Column */}

        <div className="space-y-6">

          <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

            <p className="text-xs uppercase tracking-[0.2em] text-[#9A8F83]">
              Career OS Insight
            </p>

            <h3 className="mt-3 text-2xl font-bold text-[#18181B]">
              {readiness.percent === 100 ? "You're fully ready." : readiness.percent >= 60 ? "You're almost ready." : "Let's close a few gaps."}
            </h3>

            <p className="mt-4 leading-7 text-[#6B7280]">
              {firstGap
                ? `Next up: upload or update your ${firstGap.category} to boost your readiness.`
                : "Everything is in place — you're ready to apply with confidence."}
            </p>

            <button
              type="button"
              onClick={generateCoverLetter}
              className="mt-8 flex items-center gap-2 rounded-full bg-[#8B7CF6] px-5 py-3 text-white transition hover:bg-[#7866F0]"
            >
              <MessageSquare size={17} />
              Generate Cover Letter
            </button>

          </HoverCard>

          <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">

            <p className="text-xs uppercase tracking-[0.2em] text-[#9A8F83]">
              Documents
            </p>

            <div className="mt-5 space-y-4">

              {tasks.map((task) => {
                const status = STATUS_COPY[task.status];
                const Icon = task.Icon;
                return (
                  <div
                    key={task.category}
                    className="flex items-center justify-between rounded-2xl p-4"
                    style={{ background: `${status.color}12` }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon style={{ color: status.color }} size={20} />
                      <span className="font-medium">{task.category}</span>
                    </div>

                    <span className="text-sm" style={{ color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                );
              })}

            </div>

          </HoverCard>

        </div>

      </div>
    </SkillLayout>
  );
}
