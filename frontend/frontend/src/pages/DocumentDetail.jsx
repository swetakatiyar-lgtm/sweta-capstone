import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  MessageSquare,
  ImageOff,
  Loader2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getFile, removeFile } from "../services/storage";
import { analyzeResume, analyzePortfolio, reviewCaseStudy } from "../services/ai";
import { extractSkillsFromText } from "../lib/skills";
import ResponseRenderer from "../components/chat/ResponseRenderer";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const ANALYZERS = {
  Resume: analyzeResume,
  Portfolio: analyzePortfolio,
  "Case Study": reviewCaseStudy,
};

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, documents, updateDocument, removeDocument, setSelectedDocument, setPendingChatPrompt } =
    useApp();
  const doc = documents.find((d) => d.id === id);

  const [fileUrl, setFileUrl] = useState(null);
  const [fileLoadError, setFileLoadError] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    if (!doc) return;
    let revokedUrl = null;
    getFile(doc.fileReference).then((blob) => {
      if (!blob) {
        setFileLoadError(true);
        return;
      }
      const url = URL.createObjectURL(blob);
      revokedUrl = url;
      setFileUrl(url);
    });
    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [doc?.id, doc?.fileReference]);

  if (!doc) {
    return (
      <div className="pt-8 text-center">
        <p className="text-[#6B7280]">Document not found.</p>
        <Link to="/documents" className="mt-4 inline-block text-[#6B5AE0]">
          Back to Document Intelligence
        </Link>
      </div>
    );
  }

  const isPdf = doc.type === "application/pdf" || doc.name.toLowerCase().endsWith(".pdf");
  const isImage = doc.type.startsWith("image/");

  const runAnalysis = async () => {
    const analyzer = ANALYZERS[doc.category];
    if (!analyzer) return;
    if (!doc.extractedText) {
      setAnalysisError("Career OS couldn't extract text from this file yet, so it can't be analyzed.");
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const summary = await analyzer(doc.extractedText, profile);
      const detectedSkills = extractSkillsFromText(doc.extractedText);
      updateDocument(doc.id, {
        aiAnalysis: { summary, detectedSkills, analyzedAt: new Date().toISOString() },
        status: "ready",
      });
    } catch (err) {
      console.error("Document analysis failed:", err);
      setAnalysisError(String(err?.message ?? err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    await removeFile(doc.fileReference);
    removeDocument(doc.id);
    navigate("/documents");
  };

  const handleDownload = async () => {
    const blob = await getFile(doc.fileReference);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const improveWithCareerOS = () => {
    setSelectedDocument(doc.id);
    const prompt = doc.aiAnalysis
      ? `Help me improve my "${doc.name}" based on this analysis:\n\n${doc.aiAnalysis.summary}`
      : `Help me improve my "${doc.name}".`;
    setPendingChatPrompt(prompt);
    navigate("/chat");
  };

  return (
    <div className="pt-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#6B7280] transition hover:text-[#18181B]"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
        {/* LEFT — document info */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="h-fit rounded-[28px] border border-[#ECE8DF] bg-white p-6 shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F2FF]">
            <FileText className="text-[#8B7CF6]" size={22} />
          </div>
          <h1 className="mt-4 break-words text-lg font-bold text-[#18181B]">{doc.name}</h1>

          <div className="mt-6 flex flex-col divide-y divide-[#ECE8DF] text-sm">
            <div className="flex items-center justify-between py-3">
              <span className="text-[#9A8F83]">Category</span>
              <span className="font-medium text-[#18181B]">{doc.category}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[#9A8F83]">Status</span>
              <span className="font-medium capitalize text-[#18181B]">{doc.status.replace("-", " ")}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[#9A8F83]">Uploaded</span>
              <span className="font-medium text-[#18181B]">
                {new Date(doc.uploadedAt).toLocaleDateString([], { dateStyle: "medium" })}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[#9A8F83]">Last updated</span>
              <span className="font-medium text-[#18181B]">
                {new Date(doc.updatedAt).toLocaleDateString([], { dateStyle: "medium" })}
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F8F6FF] py-2.5 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
            >
              <Download size={15} /> Download
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete document"
              className="rounded-full bg-[#FFF1F1] p-2.5 text-[#D64545] transition hover:bg-[#FFE4E4]"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </motion.div>

        {/* CENTER — preview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center rounded-[28px] border border-[#ECE8DF] bg-[#F7F5F1] p-6 shadow-sm"
        >
          {isPdf && fileUrl && (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  aria-label="Previous page"
                  className="rounded-full p-1.5 text-[#6B7280] transition hover:bg-[#F5F2FF] disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-[#18181B]">
                  Page {pageNumber} / {numPages ?? "…"}
                </span>
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.min(numPages ?? p, p + 1))}
                  disabled={!numPages || pageNumber >= numPages}
                  aria-label="Next page"
                  className="rounded-full p-1.5 text-[#6B7280] transition hover:bg-[#F5F2FF] disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="mx-1 h-4 w-px bg-[#ECE8DF]" />
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                  aria-label="Zoom out"
                  className="rounded-full p-1.5 text-[#6B7280] transition hover:bg-[#F5F2FF]"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs text-[#6B7280]">{Math.round(scale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                  aria-label="Zoom in"
                  className="rounded-full p-1.5 text-[#6B7280] transition hover:bg-[#F5F2FF]"
                >
                  <ZoomIn size={16} />
                </button>
              </div>

              <div className="overflow-auto rounded-2xl border border-[#ECE8DF] bg-white shadow-inner">
                <Document
                  file={fileUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={() => setFileLoadError(true)}
                  loading={
                    <div className="flex h-96 w-72 items-center justify-center">
                      <Loader2 className="animate-spin text-[#8B7CF6]" size={24} />
                    </div>
                  }
                >
                  <Page pageNumber={pageNumber} scale={scale} />
                </Document>
              </div>
            </>
          )}

          {isImage && fileUrl && (
            <img src={fileUrl} alt={doc.name} className="max-h-[600px] rounded-2xl object-contain shadow-sm" />
          )}

          {!isPdf && !isImage && (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-center text-[#9CA3AF]">
              <ImageOff size={28} />
              <p className="max-w-xs text-sm">
                Live preview isn't available for this file type yet — download it to view, or read the
                extracted text in the AI Insights panel.
              </p>
            </div>
          )}

          {fileLoadError && (
            <p className="mt-3 text-sm text-[#D64545]">Couldn't load the file preview.</p>
          )}
        </motion.div>

        {/* RIGHT — AI insights + quick actions */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="h-fit space-y-4 rounded-[28px] border border-[#ECE8DF] bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#8B7CF6]" size={16} />
            <h2 className="font-semibold text-[#18181B]">AI Insights</h2>
          </div>

          {!ANALYZERS[doc.category] ? (
            <p className="text-sm text-[#9CA3AF]">
              AI analysis is available for Resume, Portfolio, and Case Study documents.
            </p>
          ) : !doc.extractedText ? (
            <p className="text-sm text-[#9CA3AF]">
              {doc.status === "indexing"
                ? "Career OS is still indexing this file…"
                : "Text couldn't be extracted from this file, so it can't be analyzed."}
            </p>
          ) : doc.aiAnalysis ? (
            <>
              <div className="max-h-[420px] overflow-y-auto pr-1 text-sm">
                <ResponseRenderer text={doc.aiAnalysis.summary} />
              </div>
              <button
                type="button"
                onClick={runAnalysis}
                disabled={analyzing}
                className="w-full rounded-full border border-[#ECE8DF] py-2.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#F7F5F1] disabled:opacity-50"
              >
                {analyzing ? "Re-analyzing…" : "Re-analyze"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={runAnalysis}
              disabled={analyzing}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#8B7CF6] py-3 text-sm font-medium text-white transition hover:bg-[#7866F0] disabled:opacity-60"
            >
              {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {analyzing ? "Analyzing with Groq…" : `Analyze ${doc.category}`}
            </button>
          )}

          {analysisError && <p className="text-xs text-[#D64545]">{analysisError}</p>}

          {doc.category === "Case Study" && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={improveWithCareerOS}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#18181B] py-3 text-sm font-medium text-white transition hover:bg-black"
            >
              <MessageSquare size={15} />
              Improve with Career OS
            </motion.button>
          )}

          {doc.category !== "Case Study" && doc.aiAnalysis && (
            <button
              type="button"
              onClick={improveWithCareerOS}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E8E2FF] bg-[#F8F6FF] py-2.5 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#EFE8FF]"
            >
              <MessageSquare size={15} />
              Ask Career OS about this
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
