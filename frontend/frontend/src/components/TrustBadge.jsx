import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, ShieldCheck, Clock } from "lucide-react";
import { verifyCompany } from "../services/verify";

const CHECK_LABELS = {
  officialDomain: "Official Domain",
  httpsSecure: "HTTPS",
  careersPage: "Careers Page",
  suspiciousDomain: "Suspicious Domain",
  urlShortener: "URL Shortener",
  companyMatch: "Company Match",
};

// `suspiciousDomain`/`urlShortener` being true is BAD, so the checkmark
// shown here is inverted — a green check means "not suspicious".
const INVERTED_CHECKS = new Set(["suspiciousDomain", "urlShortener"]);

const LEVEL_COLOR = { high: "#4FA66B", medium: "#D4A017", low: "#D64545" };

/**
 * The one real trust badge used everywhere (Scout cards, Opportunity
 * Detail). Shows the calculated score, or "Verification Pending" when
 * there isn't enough data to score — never a fabricated level. Clicking
 * it reveals the real per-check breakdown behind the number.
 */
export default function TrustBadge({ job, className = "" }) {
  const trust = verifyCompany(job);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (trust.level === "pending") {
    return (
      <span
        className={`flex items-center gap-1.5 rounded-full bg-[#F1EEE8] px-3 py-1 text-xs font-medium text-[#9CA3AF] ${className}`}
      >
        <Clock size={12} />
        Verification Pending
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}
        style={{ background: `${LEVEL_COLOR[trust.level]}18`, color: LEVEL_COLOR[trust.level] }}
      >
        <ShieldCheck size={12} />
        {trust.score} Trust
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-[#ECE8DF] bg-white p-5 text-left shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9A8F83]">Trust Details</p>
            <div className="mt-3 space-y-2">
              {Object.entries(trust.checks).map(([key, value]) => {
                const passed = INVERTED_CHECKS.has(key) ? !value : value;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-[#4B5563]">{CHECK_LABELS[key]}</span>
                    {passed ? (
                      <CheckCircle2 size={15} className="text-[#4FA66B]" />
                    ) : (
                      <XCircle size={15} className="text-[#D64545]" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#6B7280]">{trust.summary}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
