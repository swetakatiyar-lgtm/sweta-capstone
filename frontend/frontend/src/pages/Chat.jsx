import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Sparkles, WifiOff, RotateCw, Copy, Check } from "lucide-react";
import { askAI } from "../services/ai";
import { useApp } from "../context/AppContext";
import ResponseRenderer from "../components/chat/ResponseRenderer";
import ChatJobCard from "../components/chat/ChatJobCard";
import ChatDocumentCard from "../components/chat/ChatDocumentCard";
import { detectJobSearchIntent, detectDocumentQueryIntent } from "../lib/chatIntent";
import { searchJobs, getCachedJob } from "../services/jobs";
import { searchDocuments } from "../services/documents";
import { computeMatch } from "../lib/match";
import { verifyCompany } from "../services/verify";

const MIN_SEND_INTERVAL_MS = 500; // debounce rapid submissions / double-click sends

function friendlyErrorText(error) {
  const message = String(error?.message ?? error);

  if (message.startsWith("MISSING_API_KEY")) {
    // Developer-facing message — this shouldn't reach a real deployed user.
    return "Career OS isn't configured yet — VITE_GROQ_API_KEY is missing. Add it to your .env file and restart the dev server.";
  }
  if (message.startsWith("INVALID_API_KEY")) {
    return "There's a problem connecting to your AI assistant right now. Please try again shortly.";
  }
  if (message.startsWith("MODEL_NOT_FOUND")) {
    return "The AI model isn't available right now. Please try again in a moment.";
  }
  if (message.startsWith("QUOTA_EXCEEDED")) {
    return "Career OS has hit its usage limit for now. Please try again shortly.";
  }
  if (message.startsWith("MODEL_OVERLOADED")) {
    return "Career OS is under heavy load right now. Please try again in a moment.";
  }
  return "I couldn't connect right now. Please try again.";
}

export default function Chat() {
  const {
    profile,
    applications,
    documents,
    tailoredResumes,
    selectedOpportunityId,
    selectedDocumentId,
    pendingChatPrompt,
    clearPendingChatPrompt,
  } = useApp();
  const cachedSelectedOpportunity = selectedOpportunityId ? getCachedJob(selectedOpportunityId) : null;
  const selectedOpportunityTrust = cachedSelectedOpportunity ? verifyCompany(cachedSelectedOpportunity) : null;
  // The AI must ground "is this safe?" answers in the real verification
  // result — never invent one — so the opportunity handed to askAI always
  // carries the actually-computed trust level, score and summary.
  const selectedOpportunity = cachedSelectedOpportunity
    ? {
        ...cachedSelectedOpportunity,
        trust: selectedOpportunityTrust.confidenceLevel,
        trustScore: selectedOpportunityTrust.verificationConfidence,
        trustSummary: selectedOpportunityTrust.summary,
      }
    : null;
  const selectedDocument = documents.find((d) => d.id === selectedDocumentId) ?? null;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  const [messages, setMessages] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const bottomRef = useRef(null);
  const isSendingRef = useRef(false);
  const lastSendAtRef = useRef(0);
  const lastPromptRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // A page like Ready Kit can hand Chat a prompt to run immediately (e.g.
  // "Generate Cover Letter") — pick it up once, then clear it so it doesn't
  // resend on every remount.
  useEffect(() => {
    if (pendingChatPrompt) {
      const prompt = pendingChatPrompt;
      clearPendingChatPrompt();
      handleSend(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatPrompt]);

  const suggestions = selectedOpportunity
    ? [
        `Write a cover letter for ${selectedOpportunity.company}`,
        `Prep me for the ${selectedOpportunity.role} interview`,
        "Review my resume for this role",
        "Find more opportunities like this",
      ]
    : ["Find UI/UX internships", "Review my resume", "Explain this JD", "Prepare interview questions"];

  async function handleSend(customPrompt) {
    const prompt = (customPrompt ?? input).trim();

    // Ignore empty prompts, prevent double-click sends, and debounce rapid submissions.
    if (!prompt || loading || isSendingRef.current) return;
    const now = Date.now();
    if (now - lastSendAtRef.current < MIN_SEND_INTERVAL_MS) return;
    // Don't resend the exact same message back-to-back.
    if (prompt === lastPromptRef.current) {
      return;
    }

    isSendingRef.current = true;
    lastSendAtRef.current = now;
    lastPromptRef.current = prompt;

    const history = messages.map(({ role, text }) => ({ role, text }));

    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);
    setOffline(false);

    // "Which document mentions Figma?" — search real indexed documents
    // instead of letting the LLM guess.
    const docIntent = detectDocumentQueryIntent(prompt);
    if (docIntent) {
      const results = searchDocuments(documents, docIntent.query);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "documents",
          text: results.length
            ? `Found ${results.length} document${results.length === 1 ? "" : "s"} mentioning "${docIntent.query}":`
            : documents.length
              ? `None of your ${documents.length} uploaded document${documents.length === 1 ? "" : "s"} mention "${docIntent.query}".`
              : `You haven't uploaded any documents yet — add one in Document Intelligence first.`,
          docs: results,
        },
      ]);
      isSendingRef.current = false;
      setLoading(false);
      return;
    }

    // "Find UI/UX internships in Bangalore" — call the real job service and
    // show clickable cards instead of asking the LLM to invent companies.
    const jobIntent = detectJobSearchIntent(prompt);
    if (jobIntent) {
      try {
        const { results } = await searchJobs({
          query: jobIntent.query,
          location: jobIntent.location,
          remoteOnly: profile.workMode === "remote" && !jobIntent.location,
          resultsPerPage: 6,
        });
        const ranked = results
          .map((job) => {
            const trust = verifyCompany(job);
            const jobWithTrust = { ...job, trust: trust.confidenceLevel, trustScore: trust.verificationConfidence };
            return { ...jobWithTrust, match: computeMatch(jobWithTrust, profile) };
          })
          .sort((a, b) => b.match - a.match);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            type: "jobs",
            text: ranked.length
              ? `Found ${ranked.length} live internship${ranked.length === 1 ? "" : "s"} for "${jobIntent.query}"${jobIntent.location ? ` in ${jobIntent.location}` : ""}, ranked against your profile:`
              : `No live internships matched "${jobIntent.query}"${jobIntent.location ? ` in ${jobIntent.location}` : ""} right now.`,
            jobs: ranked,
          },
        ]);
      } catch (error) {
        console.error("Chat job search failed:", error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: friendlyErrorText(error), isError: true },
        ]);
      }
      isSendingRef.current = false;
      setLoading(false);
      return;
    }

    try {
      const reply = await askAI(prompt, {
        profile,
        history,
        opportunity: selectedOpportunity,
        applications,
        document: selectedDocument,
        documents,
        tailoredResumes,
      });
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (error) {
      const message = String(error?.message ?? error);

      if (/network|fetch failed|Failed to fetch/i.test(message) || error instanceof TypeError) {
        // Network failure gets a reconnect banner, not a chat bubble.
        setOffline(true);
      } else {
        const text = friendlyErrorText(error);
        setMessages((prev) => {
          // Prevent duplicate error bubbles if the same failure repeats.
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last?.isError && last.text === text) return prev;
          return [...prev, { role: "assistant", text, isError: true }];
        });
      }
    }

    isSendingRef.current = false;
    setLoading(false);
  }

  function copyMessage(index, text) {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1600);
      })
      .catch((err) => console.error("Copy failed:", err));
  }

  function retryLastMessage() {
    setOffline(false);
    if (lastPromptRef.current) {
      const prompt = lastPromptRef.current;
      lastPromptRef.current = null; // allow resending the same prompt
      handleSend(prompt);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-110px)] max-w-5xl flex-col">

      {messages.length === 0 && (
        <div className="mb-10 text-center">

          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7CF6] to-[#A796FF] shadow-xl">
            <Sparkles className="text-white" size={34} />
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-[#18181B]">
            Career OS
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-lg text-[#6B7280]">
            Your AI career companion for internships, resumes, portfolios and applications.
          </p>

          {selectedOpportunity && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-[#E8E2FF] bg-[#F8F6FF] px-4 py-2 text-sm text-[#6B5AE0]"
            >
              <Sparkles size={13} />
              Already knows: {selectedOpportunity.company} · {selectedOpportunity.role}
            </motion.div>
          )}

          {selectedDocument && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-[#E8E2FF] bg-[#F8F6FF] px-4 py-2 text-sm text-[#6B5AE0]"
            >
              <Sparkles size={13} />
              Document loaded: {selectedDocument.name}
            </motion.div>
          )}

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <button
                key={item}
                onClick={() => handleSend(item)}
                className="rounded-2xl border border-[#ECE8DF] bg-white p-5 text-left transition hover:-translate-y-1 hover:border-[#8B7CF6] hover:shadow-lg"
              >
                <p className="font-medium text-[#18181B]">{item}</p>
                <p className="mt-1 text-sm text-[#7A7A7A]">
                  Ask Career OS to help with this.
                </p>
              </button>
            ))}
          </div>

        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2">

        <div className="space-y-8">

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              {msg.role === "user" ? (
                <div className="max-w-md rounded-3xl bg-gradient-to-r from-[#8B7CF6] to-[#7C6CF2] px-5 py-4 text-white shadow-lg">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-3xl">

                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFE8FF]">
                        <Sparkles size={15} className="text-[#8B7CF6]" />
                      </div>

                      <span className="font-semibold text-[#18181B]">
                        Career OS
                      </span>
                    </div>

                    {!msg.isError && (
                      <button
                        type="button"
                        onClick={() => copyMessage(i, msg.text)}
                        aria-label="Copy response"
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[#9CA3AF] transition hover:bg-[#F4F1EC] hover:text-[#6B7280]"
                      >
                        {copiedIndex === i ? (
                          <>
                            <Check size={13} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {msg.type === "jobs" ? (
                    <>
                      <p className="mb-4 text-[16px] leading-7 text-[#3F3D3A]">{msg.text}</p>
                      {msg.jobs.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {msg.jobs.map((job) => (
                            <ChatJobCard key={job.id} job={job} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : msg.type === "documents" ? (
                    <>
                      <p className="mb-4 text-[16px] leading-7 text-[#3F3D3A]">{msg.text}</p>
                      {msg.docs.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {msg.docs.map((result) => (
                            <ChatDocumentCard key={result.document.id} result={result} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <ResponseRenderer text={msg.text} />
                  )}

                </div>
              )}

            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">

              <motion.div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFE8FF]"
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles size={15} className="text-[#8B7CF6]" />
              </motion.div>

              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8B7CF6]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8B7CF6] [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8B7CF6] [animation-delay:300ms]" />
              </div>

              <span className="text-sm text-[#6B7280]">
                Career OS is thinking...
              </span>

            </div>
          )}

          <div ref={bottomRef} />

        </div>

      </div>

      {offline && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#F3C5C5] bg-[#FFF1F1] px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-[#B54545]">
            <WifiOff size={16} />
            Connection lost — check your internet and try again.
          </div>
          <button
            type="button"
            onClick={retryLastMessage}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#B54545] shadow-sm transition hover:bg-[#FFF6F6]"
          >
            <RotateCw size={13} />
            Retry
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-[#ECE8DF] pt-5">

        <div className="rounded-[28px] border border-[#ECE8DF] bg-white px-5 py-4 shadow-sm">

          <div className="flex items-end gap-3">

            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Career OS anything..."
              className="max-h-40 flex-1 resize-none bg-transparent text-[#18181B] placeholder:text-[#9CA3AF] outline-none"
            />

            <button className="text-[#9CA3AF] transition hover:text-[#6B5AE0]">
              <Mic size={20} />
            </button>

            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#8B7CF6] to-[#7C6CF2] text-white shadow-md transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send size={18} />
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
