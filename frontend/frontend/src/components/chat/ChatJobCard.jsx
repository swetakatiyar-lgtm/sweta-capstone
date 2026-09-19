import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Wallet, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function ChatJobCard({ job }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-[24px] border border-[#ECE8DF] bg-white p-5 transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(139,124,246,0.4)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F2FF] text-sm font-bold text-[#8B7CF6]">
            {job.companyLogo}
          </span>
          <div>
            <p className="font-semibold text-[#18181B]">{job.role}</p>
            <p className="text-sm text-[#6B7280]">{job.company}</p>
          </div>
        </div>
        <span className="shrink-0 text-lg font-bold text-[#4FA66B]">{job.match}%</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#6B7280]">
        <span className="flex items-center gap-1">
          <MapPin size={12} /> {job.location}
        </span>
        {job.salary && (
          <span className="flex items-center gap-1">
            <Wallet size={12} /> {job.salary}
          </span>
        )}
        <span
          className={`flex items-center gap-1 font-medium ${
            job.trust === "strong" || job.trust === "good"
              ? "text-[#3F8F5A]"
              : job.trust === "limited"
                ? "text-[#8A6A1F]"
                : job.trust === "low"
                  ? "text-[#B54545]"
                  : "text-[#9CA3AF]"
          }`}
        >
          <CheckCircle2 size={12} />
          {job.trustScore != null ? `${job.trustScore}% Confidence` : "Verification Unavailable"}
        </span>
      </div>

      <Link
        to={`/scout/${job.id}`}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-[#18181B] py-2 text-sm font-medium text-white transition hover:bg-black"
      >
        Open Details
        <ArrowUpRight size={14} />
      </Link>
    </motion.div>
  );
}
