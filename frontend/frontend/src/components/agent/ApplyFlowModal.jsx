import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShieldCheck, Check, ExternalLink, AlertTriangle, Send, Loader2 } from "lucide-react";
import { categoryStatus } from "../../lib/readiness";
import useEscapeKey from "../../hooks/useEscapeKey";

/**
 * The one real apply flow. Every "Apply" action in the app goes through
 * this — it is the only place an application can ever be created, and it
 * never creates one without the user explicitly confirming the official
 * application was actually submitted.
 *
 * States mirror the app-wide enum: profile_incomplete (gate) ->
 * awaiting_permission (permission) -> applying (official application opened;
 * shows "Completing Application…" then the real confirmation question) ->
 * submitted (done). Nothing ever skips a state.
 */
export default function ApplyFlowModal({
  opportunity,
  documents,
  readiness,
  onCancel,
  onConfirmApplied,
  tailoredResume = null,
}) {
  const resumeReady = categoryStatus(documents, "Resume") === "ready";
  const portfolioReady = categoryStatus(documents, "Portfolio") === "ready";
  const missingRequired = !resumeReady;

  const [phase, setPhase] = useState(missingRequired ? "gate" : "permission");
  const [confirmReady, setConfirmReady] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Same rule as the backdrop click below: Escape can't dismiss the modal
  // mid-"applying", since that's the one phase where the user has a real
  // external tab open and a pending decision to make.
  useEscapeKey(onCancel, phase !== "applying");

  function handleApplyNow() {
    // Real navigation — this is the actual official application URL, opened
    // in a new tab. Nothing here marks the application as submitted; that
    // only happens if the user comes back and confirms it below.
    if (opportunity.applyUrl) {
      window.open(opportunity.applyUrl, "_blank", "noopener,noreferrer");
    }
    setPhase("applying");
    setConfirmReady(false);
    timerRef.current = setTimeout(() => setConfirmReady(true), 1100);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#18181B]/40 px-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={phase !== "applying" ? onCancel : undefined}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-2xl"
        >
          {phase !== "applying" && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="absolute right-6 top-6 cursor-pointer text-[#9CA3AF] hover:text-[#18181B]"
            >
              <X size={18} />
            </button>
          )}

          {/* State: Missing Documents */}
          {phase === "gate" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1F1]">
                <AlertTriangle className="text-[#D64545]" size={26} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-[#18181B]">Missing Required Documents</h2>
              <p className="mt-2 text-[#6B7280]">
                Career OS can't apply to <span className="font-medium text-[#18181B]">{opportunity.company}</span>{" "}
                yet — it doesn't have enough of your real documents indexed.
              </p>

              <div className="mt-6 space-y-2.5 rounded-2xl bg-[#F7F5F1] p-5">
                <div className="flex items-center gap-2.5 text-sm">
                  <AlertTriangle size={14} className="shrink-0 text-[#D64545]" />
                  <span className={resumeReady ? "text-[#4FA66B]" : "text-[#18181B]"}>
                    {resumeReady ? "Resume ready" : "Resume required"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <AlertTriangle size={14} className="shrink-0 text-[#D4A017]" />
                  <span className={portfolioReady ? "text-[#4FA66B]" : "text-[#18181B]"}>
                    {portfolioReady ? "Portfolio ready" : "Portfolio recommended"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[#ECE8DF] pt-3 text-sm">
                  <span className="text-[#6B7280]">Current readiness</span>
                  <span className="font-semibold text-[#6B5AE0]">{readiness}%</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/documents"
                  onClick={onCancel}
                  className="flex-1 rounded-full bg-[#8B7CF6] py-3 text-center font-medium text-white shadow-lg shadow-[#8B7CF6]/25 transition hover:bg-[#7866F0]"
                >
                  Upload Resume
                </Link>
                <Link
                  to={`/ready-kit?opportunity=${opportunity.id}`}
                  onClick={onCancel}
                  className="flex-1 rounded-full border border-[#E8E2FF] bg-[#F8F6FF] py-3 text-center font-medium text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
                >
                  Open Ready Kit
                </Link>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="mt-3 w-full cursor-pointer rounded-full py-2 text-sm font-medium text-[#9CA3AF] transition hover:text-[#18181B]"
              >
                Cancel
              </button>
            </>
          )}

          {/* State: Awaiting Permission */}
          {phase === "permission" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F2FF]">
                <ShieldCheck className="text-[#8B7CF6]" size={26} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-[#18181B]">
                Apply to {opportunity.company}?
              </h2>
              <p className="mt-2 text-[#6B7280]">
                Role: <span className="font-medium text-[#18181B]">{opportunity.role}</span>
              </p>

              <div className="mt-6 rounded-2xl bg-[#F7F5F1] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9A8F83]">
                  Career OS will
                </p>
                <ul className="space-y-2.5 text-sm text-[#3F3D3A]">
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#4FA66B]" />
                    {tailoredResume
                      ? `Use your tailored resume for this role`
                      : "Open the official application"}
                  </li>
                  {tailoredResume && (
                    <li className="flex items-start gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-[#4FA66B]" />
                      Open the official application
                    </li>
                  )}
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#4FA66B]" />
                    Track this application
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#4FA66B]" />
                    Create follow-up reminders
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#4FA66B]" />
                    Prepare interview follow-ups
                  </li>
                </ul>
              </div>

              <p className="mt-4 text-xs text-[#9CA3AF]">
                Nothing is marked applied until you confirm you actually submitted it.
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 cursor-pointer rounded-full border border-[#ECE8DF] bg-white py-3 font-medium text-[#6B7280] transition hover:bg-[#F7F5F1]"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApplyNow}
                  className="flex-1 cursor-pointer rounded-full bg-[#8B7CF6] py-3 font-medium text-white shadow-lg shadow-[#8B7CF6]/25 transition hover:bg-[#7866F0]"
                >
                  Open Official Application
                </motion.button>
              </div>
            </>
          )}

          {/* State: applying — official tab opened. First a brief, honestly-
              labeled "Completing Application…" beat, then the one question
              that actually decides whether this becomes a real application. */}
          {phase === "applying" && !confirmReady && (
            <div className="py-6 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F2FF]"
              >
                <Loader2 className="text-[#8B7CF6]" size={24} />
              </motion.div>
              <h2 className="mt-5 text-2xl font-bold text-[#18181B]">Completing Application…</h2>
              <p className="mt-2 text-[#6B7280]">
                Career OS opened {opportunity.company}'s official application in a new tab.
              </p>
            </div>
          )}

          {phase === "applying" && confirmReady && (
            <div className="py-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F2FF]">
                <ExternalLink className="text-[#8B7CF6]" size={24} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-[#18181B]">Waiting for Confirmation</h2>
              <p className="mt-2 text-[#6B7280]">
                Finish the application in the other tab, then come back here.
              </p>

              <div className="mt-8 rounded-2xl bg-[#F7F5F1] p-5 text-left">
                <p className="text-sm font-medium text-[#18181B]">Did you successfully submit your application?</p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 cursor-pointer rounded-full border border-[#ECE8DF] bg-white py-3 font-medium text-[#6B7280] transition hover:bg-[#F7F5F1]"
                >
                  Not Yet
                </button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onConfirmApplied();
                    setPhase("done");
                  }}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#4FA66B] py-3 font-medium text-white shadow-lg shadow-[#4FA66B]/25 transition hover:bg-[#3F8F5A]"
                >
                  <Send size={15} />
                  Yes, Submitted
                </motion.button>
              </div>
            </div>
          )}

          {/* State: Applied */}
          {phase === "done" && (
            <div className="flex flex-col items-center py-4 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF6EC]"
              >
                <Check className="text-[#4FA66B]" size={30} strokeWidth={3} />
              </motion.div>
              <h2 className="mt-5 text-2xl font-bold text-[#18181B]">Applied.</h2>
              <p className="mt-2 max-w-xs text-sm text-[#6B7280]">
                Career OS logged your application to {opportunity.company} and scheduled a follow-up
                reminder.
              </p>
              <button
                type="button"
                onClick={onCancel}
                className="mt-6 cursor-pointer rounded-full bg-[#18181B] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-black"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
