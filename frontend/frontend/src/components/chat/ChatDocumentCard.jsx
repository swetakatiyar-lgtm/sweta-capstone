import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, ArrowUpRight } from "lucide-react";

export default function ChatDocumentCard({ result }) {
  const { document, matchedIn, snippet } = result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-[24px] border border-[#ECE8DF] bg-white p-5 transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(139,124,246,0.4)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F2FF] text-[#8B7CF6]">
          <FileText size={17} />
        </span>
        <div>
          <p className="font-semibold text-[#18181B]">{document.name}</p>
          <p className="text-xs text-[#6B7280]">
            {document.category} · matched in {matchedIn.join(", ")}
          </p>
        </div>
      </div>

      {snippet && (
        <p className="mt-3 rounded-xl bg-[#F7F5F1] p-3 text-xs italic leading-5 text-[#4B5563]">
          "{snippet}"
        </p>
      )}

      <Link
        to={`/documents/${document.id}`}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-[#18181B] py-2 text-sm font-medium text-white transition hover:bg-black"
      >
        Open Document
        <ArrowUpRight size={14} />
      </Link>
    </motion.div>
  );
}
