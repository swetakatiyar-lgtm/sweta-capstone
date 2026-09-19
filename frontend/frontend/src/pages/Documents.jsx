import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderClosed,
  FileText,
  Search,
  Upload,
  Trash2,
  Download,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import SkillLayout from "../components/SkillLayout";
import HoverCard from "../components/ui/HoverCard";
import { useApp } from "../context/AppContext";
import { putFile, getFile, removeFile } from "../services/storage";
import { extractText } from "../services/parser";
import { searchDocuments } from "../services/documents";
import { computeReadiness } from "../lib/readiness";
import { downloadResumePDF } from "../lib/pdfGenerator";

const CATEGORY_COLOR = {
  Resume: "#4FA66B",
  Portfolio: "#8B7CF6",
  "Case Study": "#D4A017",
  Certificate: "#3B82C4",
  "Cover Letter": "#B5548C",
  Other: "#6B7280",
};

const STATUS_COPY = {
  ready: { label: "Indexed", color: "#4FA66B" },
  indexing: { label: "Indexing…", color: "#8B7CF6" },
  "needs-update": { label: "Needs Attention", color: "#D4A017" },
  error: { label: "Couldn't Index", color: "#D64545" },
};

const REQUIRED_SLOTS = [
  { category: "Resume", label: "Resume", hint: "Your core resume — the source for every tailored version." },
  { category: "Portfolio", label: "Portfolio", hint: "Work samples, case studies of past projects, or a portfolio PDF." },
  { category: "Case Study", label: "Case Study", hint: "A deep dive into one project — problem, approach, outcome." },
  { category: "Cover Letter", label: "Cover Letter", hint: "A general cover letter template you can tailor per application." },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export default function Documents() {
  const {
    profile,
    documents,
    addDocument,
    updateDocument,
    removeDocument,
    tailoredResumes,
    removeTailoredResume,
  } = useApp();
  const [search, setSearch] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [draggingSlot, setDraggingSlot] = useState(null);
  const slotInputRefs = useRef({});

  const readiness = computeReadiness(documents);

  const results = search.trim() ? searchDocuments(documents, search) : null;
  const visibleDocs = results ? results.map((r) => r.document) : documents;

  // The document type is determined ONLY by which slot the user uploaded
  // through — never by inspecting the filename. Re-uploading into a slot
  // that already has a document replaces that document in place.
  const handleSlotUpload = useCallback(
    async (file, category) => {
      if (!file) return;
      if (!ACCEPTED_TYPES.includes(file.type) && !/\.(pdf|docx|png|jpe?g)$/i.test(file.name)) {
        setUploadError(`"${file.name}" isn't a supported file type (PDF, DOCX, PNG, JPG).`);
        return;
      }
      setUploadError(null);
      setUploadingSlot(category);

      const existing = documents.find((d) => d.category === category);
      const id = existing?.id ?? `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();

      await putFile(id, file);

      const metadata = {
        id,
        name: file.name,
        type: file.type || "application/octet-stream",
        category,
        uploadedAt: existing?.uploadedAt ?? now,
        updatedAt: now,
        size: file.size,
        status: "indexing",
        extractedText: "",
        aiAnalysis: null,
        fileReference: id,
      };

      if (existing) {
        updateDocument(id, metadata);
      } else {
        addDocument(metadata);
      }

      extractText(file)
        .then(({ text, supported }) => {
          updateDocument(id, {
            extractedText: text,
            status: supported && text ? "ready" : "needs-update",
          });
        })
        .catch((err) => {
          // A genuinely corrupt/unreadable file — without this, the
          // document would sit on "Indexing…" forever with no way for
          // the user to know it failed.
          console.error("Document text extraction failed:", err);
          updateDocument(id, { status: "error" });
        });

      setUploadingSlot(null);
    },
    [addDocument, updateDocument, documents],
  );

  const handleSlotDrop = (e, category) => {
    e.preventDefault();
    setDraggingSlot(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSlotUpload(file, category);
  };

  // Non-destructive reassignment for legacy/misclassified documents (e.g.
  // "Other") — always an explicit user action, never automatic, and only
  // offered when the target slot is currently empty.
  const handleReassign = (doc, category) => {
    updateDocument(doc.id, { category, updatedAt: new Date().toISOString() });
  };

  const handleDelete = async (doc) => {
    await removeFile(doc.fileReference);
    removeDocument(doc.id);
  };

  const handleDownload = async (doc) => {
    const blob = await getFile(doc.fileReference);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTailored = (record) => {
    downloadResumePDF({
      candidateName: profile?.name || "Resume",
      role: record.role,
      company: record.company,
      content: record.content,
      filename: `Resume — ${record.company} ${record.role}.pdf`,
    });
  };

  return (
    <SkillLayout
      badge="Document Intelligence"
      title="Document Intelligence"
      subtitle="Career OS understands your documents, keeps them organized, and prepares them for every application."
      icon={<FolderClosed size={15} />}
    >
      <div className="space-y-8">

        {/* Readiness */}
        <HoverCard className="rounded-[32px] border border-[#ECE8DF] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#9A8F83]">Application Readiness</p>
              <h2 className="mt-2 text-4xl font-bold text-[#18181B]">{readiness.percent}%</h2>
              <p className="mt-2 text-sm text-[#6B7280]">Computed live from your uploaded documents.</p>
            </div>
            <div className="flex flex-1 min-w-[200px] flex-wrap gap-4">
              {readiness.breakdown.map((b) => (
                <div key={b.category} className="min-w-[100px] flex-1">
                  <div className="mb-1 flex justify-between text-xs text-[#9A8F83]">
                    <span>{b.category}</span>
                    <span className="font-medium" style={{ color: CATEGORY_COLOR[b.category] }}>
                      {Math.round(b.fraction * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#F1EEE8]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.fraction * 100}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: CATEGORY_COLOR[b.category] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HoverCard>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full rounded-full border border-[#ECE8DF] bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#8B7CF6] focus:ring-4 focus:ring-[#EFE8FF]"
          />
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#F3C5C5] bg-[#FFF1F1] p-4 text-sm text-[#B54545]">
            <AlertTriangle size={16} />
            {uploadError}
          </div>
        )}

        {/* Four dedicated upload slots — the SLOT clicked/dropped-on determines
            the document's category. The filename is never inspected. */}
        <div>
          <h2 className="text-lg font-semibold text-[#18181B]">Required Documents</h2>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Upload into the section that matches the document — that's what determines its type.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REQUIRED_SLOTS.map((slot) => {
              const doc = documents.find((d) => d.category === slot.category);
              const status = doc ? (STATUS_COPY[doc.status] ?? STATUS_COPY.error) : null;
              const color = CATEGORY_COLOR[slot.category];
              const isDragging = draggingSlot === slot.category;
              const isUploading = uploadingSlot === slot.category;

              return (
                <HoverCard
                  key={slot.category}
                  className={`rounded-[28px] border-2 border-dashed bg-white p-6 shadow-sm transition ${
                    isDragging ? "border-[#8B7CF6] bg-[#F8F6FF]" : "border-[#ECE8DF]"
                  }`}
                >
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingSlot(slot.category);
                    }}
                    onDragLeave={() => setDraggingSlot(null)}
                    onDrop={(e) => handleSlotDrop(e, slot.category)}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{ background: `${color}18` }}
                      >
                        <FileText size={20} color={color} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#18181B]">{slot.label}</h3>
                        <p className="text-xs text-[#9CA3AF]">{slot.hint}</p>
                      </div>
                    </div>

                    {doc ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FAF9F6] p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#18181B]">{doc.name}</p>
                          <span
                            className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ background: `${status.color}18`, color: status.color }}
                          >
                            {doc.status === "indexing" ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : doc.status === "ready" ? (
                              <CheckCircle2 size={11} />
                            ) : null}
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#6B5AE0] shadow-sm transition hover:bg-[#F8F6FF]"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => slotInputRefs.current[slot.category]?.click()}
                            className="rounded-full bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black"
                          >
                            {isUploading ? <Loader2 size={13} className="animate-spin" /> : "Replace"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF9F6] p-4">
                        <p className="text-sm text-[#9CA3AF]">No {slot.label.toLowerCase()} uploaded yet.</p>
                        <button
                          type="button"
                          onClick={() => slotInputRefs.current[slot.category]?.click()}
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#18181B] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-black"
                        >
                          {isUploading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Upload size={13} />
                          )}
                          Upload {slot.label}
                        </button>
                      </div>
                    )}

                    <input
                      ref={(el) => {
                        slotInputRefs.current[slot.category] = el;
                      }}
                      type="file"
                      accept=".pdf,.docx,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlotUpload(file, slot.category);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </HoverCard>
              );
            })}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-[#18181B]">All Documents</h2>

        {/* Document List */}
        {visibleDocs.length === 0 ? (
          <HoverCard className="rounded-[28px] border border-dashed border-[#ECE8DF] bg-white p-12 text-center shadow-sm">
            <p className="text-[#6B7280]">
              {search.trim()
                ? "No documents match that search."
                : "No documents yet — upload your resume to get started."}
            </p>
          </HoverCard>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {visibleDocs.map((doc) => {
                const status = STATUS_COPY[doc.status] ?? STATUS_COPY.error;
                const color = CATEGORY_COLOR[doc.category] ?? CATEGORY_COLOR.Other;

                return (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Link to={`/documents/${doc.id}`} className="block">
                      <motion.div
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer rounded-[28px] border border-[#ECE8DF] bg-white p-6 shadow-sm transition-shadow hover:border-[#8B7CF6]/50 hover:shadow-[0_16px_32px_-18px_rgba(139,124,246,0.4)]"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-5">
                            <div
                              className="flex h-14 w-14 items-center justify-center rounded-2xl"
                              style={{ background: `${color}18` }}
                            >
                              <FileText size={24} color={color} />
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-[#18181B]">{doc.name}</h3>
                                {doc.category === "Resume" && (
                                  <span
                                    title="Your original source document — Career OS never modifies it. Job-specific copies appear below under Tailored Application Documents."
                                    className="rounded-full bg-[#F1EEE8] px-2.5 py-0.5 text-xs font-medium text-[#9A8F83]"
                                  >
                                    Master
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#6B7280]">
                                <span>{doc.category}</span>
                                <span>•</span>
                                <span>{formatBytes(doc.size)}</span>
                                <span>•</span>
                                <span>
                                  Updated {new Date(doc.updatedAt).toLocaleDateString([], { dateStyle: "medium" })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3" onClick={(e) => e.preventDefault()}>
                            <span
                              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                              style={{ background: `${status.color}18`, color: status.color }}
                            >
                              {doc.status === "indexing" ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : doc.status === "ready" ? (
                                <CheckCircle2 size={13} />
                              ) : null}
                              {status.label}
                            </span>

                            {doc.category === "Other" && (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleReassign(doc, e.target.value);
                                }}
                                className="rounded-full border border-[#ECE8DF] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7280] outline-none transition hover:border-[#8B7CF6]"
                              >
                                <option value="">Use as…</option>
                                {REQUIRED_SLOTS.filter((s) => !documents.some((d) => d.category === s.category)).map(
                                  (s) => (
                                    <option key={s.category} value={s.category}>
                                      {s.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              aria-label={`Download ${doc.name}`}
                              className="rounded-full bg-[#F8F6FF] p-3 text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
                            >
                              <Download size={18} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(doc)}
                              aria-label={`Delete ${doc.name}`}
                              className="rounded-full bg-[#FFF1F1] p-3 text-[#D64545] transition hover:bg-[#FFE4E4]"
                            >
                              <Trash2 size={18} />
                            </button>

                            <span className="hidden items-center gap-1.5 text-sm font-medium text-[#8B7CF6] sm:flex">
                              Open
                              <ArrowUpRight size={15} />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Tailored Application Documents — additive only. Job-specific
            derivatives created by the Resume Agent from Opportunity Detail;
            the master resume above is never modified by these. */}
        {tailoredResumes.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#18181B]">
              <Sparkles size={17} className="text-[#8B7CF6]" />
              Tailored Application Documents
            </h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              Job-specific resume versions generated from your master resume — it stays unchanged above.
            </p>

            <div className="mt-4 space-y-3">
              {tailoredResumes.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#ECE8DF] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F2FF]">
                      <FileText size={19} className="text-[#8B7CF6]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#18181B]">
                        Resume — {record.company} {record.role}
                      </h3>
                      <p className="text-sm text-[#6B7280]">
                        {record.matchScore != null ? `${record.matchScore}% fit • ` : ""}
                        {new Date(record.createdAt).toLocaleDateString([], { dateStyle: "medium" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {record.jobId && (
                      <Link
                        to={`/scout/${record.jobId}`}
                        className="rounded-full bg-[#F8F6FF] px-4 py-2 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
                      >
                        Open Opportunity
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadTailored(record)}
                      aria-label={`Download tailored resume for ${record.company}`}
                      className="rounded-full bg-[#F8F6FF] p-3 text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTailoredResume(record.id)}
                      aria-label={`Delete tailored resume for ${record.company}`}
                      className="rounded-full bg-[#FFF1F1] p-3 text-[#D64545] transition hover:bg-[#FFE4E4]"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </SkillLayout>
  );
}
