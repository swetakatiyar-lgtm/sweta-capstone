import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Loader2, AlertTriangle, Download, Check, FileText } from "lucide-react";
import { generateTailoredResume } from "../../services/resumeGenerator";
import { downloadResumePDF } from "../../lib/pdfGenerator";
import ResponseRenderer from "../chat/ResponseRenderer";
import useEscapeKey from "../../hooks/useEscapeKey";

/**
 * The Job-Specific Resume Agent's review modal. Generates a NEW, job-
 * specific resume from the real master resume (see services/
 * resumeGenerator.js) — never touches the original document. The user must
 * explicitly click "Use for This Application" before it's linked to an
 * application; otherwise it just sits in `tailoredResumes` as a document
 * the user can review/download/delete.
 */
export default function TailorResumeModal({
  opportunity,
  profile,
  resumeDoc,
  fit,
  jobAnalysis,
  onClose,
  onSaved,
  onUse,
}) {
  const [phase, setPhase] = useState(resumeDoc ? "generating" : "no-resume");
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEscapeKey(onClose);

  useEffect(() => {
    if (!resumeDoc) return;
    let cancelled = false;
    setPhase("generating");
    setError(null);
    generateTailoredResume({ job: opportunity, profile, resumeDoc, fit, jobAnalysis })
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        setPhase("review");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Resume tailoring failed:", err);
        setError(String(err?.message ?? err));
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity.id, resumeDoc?.id, attempt]);

  const filename = `Resume — ${opportunity.company} ${opportunity.role}.pdf`;

  function handleDownload() {
    downloadResumePDF({
      candidateName: profile?.name || "Resume",
      role: opportunity.role,
      company: opportunity.company,
      content,
      filename,
    });
  }

  function handleSave() {
    const record = {
      id: `tailored_${opportunity.id}_${Date.now()}`,
      jobId: opportunity.id,
      company: opportunity.company,
      role: opportunity.role,
      sourceResumeId: resumeDoc.id,
      matchScore: fit?.matchScore ?? null,
      content,
      missingRequirements: fit?.missing ?? [],
      createdAt: new Date().toISOString(),
    };
    onSaved(record);
    return record;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#18181B]/40 px-6 py-10 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-6 top-6 cursor-pointer text-[#9CA3AF] hover:text-[#18181B]"
          >
            <X size={18} />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F2FF]">
            <Sparkles className="text-[#8B7CF6]" size={26} />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-[#18181B]">Tailor My Resume</h2>
          <p className="mt-2 text-[#6B7280]">
            For {opportunity.role} at {opportunity.company} — built from your real master resume.
          </p>

          {phase === "no-resume" && (
            <div className="mt-6 rounded-2xl border border-[#F3C5C5] bg-[#FFF1F1] p-5">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-[#D64545]" size={18} />
                <div>
                  <p className="font-medium text-[#18181B]">No master resume found</p>
                  <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                    Upload and index a resume in Document Intelligence first — Career OS only tailors
                    real resumes, it won't invent one.
                  </p>
                </div>
              </div>
              <Link
                to="/documents"
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#8B7CF6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7866F0]"
              >
                Upload Resume
              </Link>
            </div>
          )}

          {phase === "generating" && (
            <div className="mt-10 flex flex-col items-center py-6 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F2FF]"
              >
                <Loader2 className="text-[#8B7CF6]" size={22} />
              </motion.div>
              <p className="mt-4 text-sm text-[#6B7280]">
                Reading your real resume and this job's real requirements…
              </p>
            </div>
          )}

          {phase === "error" && (
            <div className="mt-6 rounded-2xl border border-[#F3C5C5] bg-[#FFF1F1] p-5">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-[#D64545]" size={18} />
                <div>
                  <p className="font-medium text-[#18181B]">Couldn't generate a tailored resume</p>
                  <p className="mt-1 text-sm leading-6 text-[#6B7280]">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="mt-4 rounded-full border border-[#ECE8DF] bg-white px-5 py-2.5 text-sm font-medium text-[#18181B] transition hover:border-[#8B7CF6]/40"
              >
                Try Again
              </button>
            </div>
          )}

          {phase === "review" && (
            <>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#F7F5F1] p-4">
                <div className="flex items-center gap-2 text-sm text-[#18181B]">
                  <FileText size={16} className="text-[#8B7CF6]" />
                  {filename}
                </div>
                {fit?.matchScore != null && (
                  <span className="text-sm font-semibold text-[#4FA66B]">{fit.matchScore}% fit</span>
                )}
              </div>

              <div className="mt-6 max-h-[40vh] overflow-y-auto rounded-2xl border border-[#ECE8DF] p-5">
                <ResponseRenderer text={content} />
              </div>

              <p className="mt-4 text-xs text-[#9CA3AF]">
                Your original resume in Document Intelligence is unchanged — this is a separate,
                job-specific copy.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-full border border-[#ECE8DF] bg-white px-5 py-2.5 text-sm font-medium text-[#18181B] transition hover:border-[#8B7CF6]/40"
                >
                  <Download size={15} />
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const record = handleSave();
                    onUse?.(record);
                  }}
                  className="flex items-center gap-2 rounded-full bg-[#8B7CF6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7866F0]"
                >
                  <Check size={15} />
                  Use for This Application
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    onClose();
                  }}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-[#6B7280] transition hover:text-[#18181B]"
                >
                  Save for later
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
