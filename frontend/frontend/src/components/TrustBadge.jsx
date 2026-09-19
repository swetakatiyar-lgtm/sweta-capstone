import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck, Clock } from "lucide-react";
import { verifyCompany } from "../services/verify";

const LEVEL_COLOR = { strong: "#4FA66B", good: "#4FA66B", limited: "#D4A017", low: "#D64545" };

const STATUS_ICON = { verified: CheckCircle2, warning: AlertTriangle, unavailable: HelpCircle };
const STATUS_COLOR = { verified: "#4FA66B", warning: "#D4A017", unavailable: "#9CA3AF" };

/**
 * The one real Opportunity Verification badge used everywhere (Scout
 * cards, Opportunity Detail). Shows the calculated Verification
 * Confidence, or "Verification Unavailable" when there wasn't enough real
 * evidence to score — never a fabricated number. Clicking it reveals the
 * real per-check breakdown behind it, with the same "not a guarantee"
 * language used everywhere else in the app.
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

  if (trust.confidenceLevel === "unavailable" || trust.verificationConfidence == null) {
    return (
      <span
        className={`flex items-center gap-1.5 rounded-full bg-[#F1EEE8] px-3 py-1 text-xs font-medium text-[#9CA3AF] ${className}`}
      >
        <Clock size={12} />
        Verification Unavailable
      </span>
    );
  }

  const color = LEVEL_COLOR[trust.confidenceLevel] ?? "#9CA3AF";

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
        style={{ background: `${color}18`, color }}
      >
        <ShieldCheck size={12} />
        {trust.verificationConfidence}% Confidence
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-[#ECE8DF] bg-white p-5 text-left shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9A8F83]">
              Verification Confidence — {trust.confidenceLabel}
            </p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {trust.checks.map((c) => {
                const Icon = STATUS_ICON[c.status] ?? HelpCircle;
                const iconColor = STATUS_COLOR[c.status] ?? "#9CA3AF";
                return (
                  <div key={c.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-[#4B5563]">{c.name}</span>
                    <Icon size={15} className="mt-0.5 shrink-0" style={{ color: iconColor }} />
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#6B7280]">
              This score reflects the verification signals Career OS was able to confirm. It does not
              guarantee that the opportunity is genuine.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
