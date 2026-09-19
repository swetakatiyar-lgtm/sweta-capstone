import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Building2,
  CalendarClock,
  CalendarPlus,
  Mail,
  ChevronDown,
  MessageSquare,
  ExternalLink,
  Check,
  X as XIcon,
} from "lucide-react";
import SkillLayout from "../components/SkillLayout";
import HoverCard from "../components/ui/HoverCard";
import { useApp } from "../context/AppContext";
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS, buildInterviewPrepPrompt } from "../lib/agent";
import { buildGoogleCalendarUrl, daysUntil } from "../lib/calendar";
import { buildFollowUpEmail, buildInterviewConfirmationEmail, buildMailtoLink } from "../lib/email";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
}

// Built only from what actually happened / is actually scheduled — no
// fabricated steps. `statusHistory` records real user-confirmed
// transitions; `savedBeforeApplying` and the two reminder dates are the
// only other real signals we have.
function buildTimeline(application) {
  const events = [];
  if (application.savedBeforeApplying) {
    events.push({ label: "Saved", at: null, done: true });
  }
  (application.statusHistory ?? [{ status: application.status, at: application.appliedDate }]).forEach(
    (h) => {
      events.push({ label: STATUS_LABELS[h.status] ?? h.status, at: h.at, done: true });
    },
  );
  if (application.interviewDate && new Date(application.interviewDate) > new Date()) {
    events.push({ label: "Interview scheduled", at: application.interviewDate, done: false });
  }
  if (
    application.nextFollowUp &&
    new Date(application.nextFollowUp) > new Date() &&
    !["offer", "rejected"].includes(application.status)
  ) {
    events.push({ label: "Follow-up reminder", at: application.nextFollowUp, done: false });
  }
  return events;
}

// A tiny inline "are you sure" step — this is the actual permission gate
// for anything that leaves Career OS (opening the real Google Calendar or
// the user's real email client). Nothing happens on the first click.
function PermissionChip({ label, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 rounded-full border border-[#E8E2FF] bg-[#F8F6FF] px-3 py-1.5 text-xs font-medium text-[#6B5AE0]"
    >
      {label}
      <button
        type="button"
        onClick={onConfirm}
        className="flex items-center gap-1 rounded-full bg-[#8B7CF6] px-2.5 py-1 text-white transition hover:bg-[#7866F0]"
      >
        <Check size={12} /> Yes
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1 rounded-full border border-[#E8E2FF] bg-white px-2.5 py-1 text-[#6B7280] transition hover:bg-[#F1EEF9]"
      >
        <XIcon size={12} /> Cancel
      </button>
    </motion.div>
  );
}

function ApplicationCard({ application, onUpdateStatus, onScheduleInterview, onPrepInterview, onSetField }) {
  const [expanded, setExpanded] = useState(false);
  const [interviewInput, setInterviewInput] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // null | "calendar" | "followup" | "interviewConfirm"
  const color = STATUS_COLORS[application.status];
  const interviewCountdown = daysUntil(application.interviewDate);

  function confirmCalendar() {
    window.open(buildGoogleCalendarUrl(application), "_blank", "noopener,noreferrer");
    onSetField(application.id, { calendarEventAdded: true });
    setPendingAction(null);
  }

  function confirmEmail(kind) {
    const draft = kind === "followup" ? buildFollowUpEmail(application) : buildInterviewConfirmationEmail(application);
    window.location.href = buildMailtoLink(draft);
    setPendingAction(null);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative pl-12"
    >
      <span
        className="absolute left-[11px] top-2 h-3.5 w-3.5 rounded-full ring-4 ring-[#F6F4EF]"
        style={{ background: color }}
      />

      <HoverCard className="rounded-[28px] border border-[#ECE8DF] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F2FF]">
              <Building2 className="text-[#8B7CF6]" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#18181B]">{application.role}</h3>
              <p className="text-sm text-[#6B7280]">{application.company}</p>
            </div>
          </div>

          <span
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: `${color}20`, color }}
          >
            {STATUS_LABELS[application.status]}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6B7280]">
          <span>Applied {formatDate(application.appliedDate)}</span>
          {application.nextFollowUp && <span>Follow-up {formatDate(application.nextFollowUp)}</span>}
          {application.interviewDate && (
            <span className="font-medium text-[#4FA66B]">
              Interview {new Date(application.interviewDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#6B5AE0]"
        >
          {expanded ? "Hide details" : "Show details"}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown size={14} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-5 space-y-4 border-t border-[#ECE8DF] pt-5">
                {/* Timeline — real, confirmed events only */}
                <div className="space-y-2.5">
                  {buildTimeline(application).map((event, i) => (
                    <div key={`${event.label}-${i}`} className="flex items-center gap-2.5 text-sm">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          event.done ? "bg-[#4FA66B]" : "bg-[#E8E2FF]"
                        }`}
                      />
                      <span className={event.done ? "text-[#18181B]" : "text-[#9CA3AF]"}>{event.label}</span>
                      {event.at && <span className="text-xs text-[#9CA3AF]">{formatDate(event.at)}</span>}
                    </div>
                  ))}
                </div>

                {/* Status control */}
                <div className="flex flex-wrap gap-2">
                  {APPLICATION_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onUpdateStatus(application.id, s)}
                      aria-pressed={application.status === s}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        application.status === s
                          ? "border-transparent text-white"
                          : "border-[#ECE8DF] bg-white text-[#6B7280] hover:border-[#8B7CF6]/40"
                      }`}
                      style={application.status === s ? { background: STATUS_COLORS[s] } : undefined}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>

                {/* Interview scheduling */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#F7F5F1] p-4">
                  <CalendarClock size={16} className="text-[#8B7CF6]" />
                  <input
                    type="datetime-local"
                    value={interviewInput}
                    onChange={(e) => setInterviewInput(e.target.value)}
                    className="rounded-lg border border-[#ECE8DF] bg-white px-3 py-1.5 text-sm text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#8B7CF6]/30"
                  />
                  <button
                    type="button"
                    disabled={!interviewInput}
                    onClick={() => onScheduleInterview(application.id, new Date(interviewInput).toISOString())}
                    className="rounded-full bg-[#18181B] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-40"
                  >
                    Schedule Interview
                  </button>
                  {application.interviewDate && (
                    <button
                      type="button"
                      onClick={() => onPrepInterview(application)}
                      className="flex items-center gap-1.5 rounded-full border border-[#E8E2FF] bg-white px-4 py-1.5 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#F8F6FF]"
                    >
                      <MessageSquare size={14} />
                      Prep with Career OS
                    </button>
                  )}

                  {application.interviewDate && interviewCountdown != null && (
                    <span className="text-xs font-medium text-[#4FA66B]">
                      {interviewCountdown > 0
                        ? `Interview in ${interviewCountdown} day${interviewCountdown === 1 ? "" : "s"}`
                        : interviewCountdown === 0
                          ? "Interview is today"
                          : "Interview date has passed"}
                    </span>
                  )}

                  {application.interviewDate && (
                    <AnimatePresence mode="wait" initial={false}>
                      {pendingAction === "calendar" ? (
                        <PermissionChip
                          key="confirm-calendar"
                          label="Add this interview to Google Calendar?"
                          onConfirm={confirmCalendar}
                          onCancel={() => setPendingAction(null)}
                        />
                      ) : (
                        <button
                          key="calendar-btn"
                          type="button"
                          onClick={() => setPendingAction("calendar")}
                          className="flex items-center gap-1.5 rounded-full border border-[#E8E2FF] bg-white px-4 py-1.5 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#F8F6FF]"
                        >
                          <CalendarPlus size={14} />
                          {application.calendarEventAdded ? "Added to Calendar" : "Add to Google Calendar"}
                        </button>
                      )}
                    </AnimatePresence>
                  )}
                </div>

                {/* Email drafts — generated, never sent automatically. Each
                    one opens the user's own email client via mailto: only
                    after they explicitly confirm. */}
                <div className="flex flex-wrap items-center gap-3">
                  <AnimatePresence mode="wait" initial={false}>
                    {pendingAction === "followup" ? (
                      <PermissionChip
                        key="confirm-followup"
                        label="Open a follow-up email draft in your email client?"
                        onConfirm={() => confirmEmail("followup")}
                        onCancel={() => setPendingAction(null)}
                      />
                    ) : (
                      <button
                        key="followup-btn"
                        type="button"
                        onClick={() => setPendingAction("followup")}
                        className="flex items-center gap-1.5 rounded-full border border-[#E8E2FF] bg-white px-4 py-1.5 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#F8F6FF]"
                      >
                        <Mail size={14} />
                        Draft Follow-up Email
                      </button>
                    )}
                  </AnimatePresence>

                  {application.interviewDate && (
                    <AnimatePresence mode="wait" initial={false}>
                      {pendingAction === "interviewConfirm" ? (
                        <PermissionChip
                          key="confirm-interview-email"
                          label="Open an interview confirmation draft in your email client?"
                          onConfirm={() => confirmEmail("interviewConfirm")}
                          onCancel={() => setPendingAction(null)}
                        />
                      ) : (
                        <button
                          key="interview-email-btn"
                          type="button"
                          onClick={() => setPendingAction("interviewConfirm")}
                          className="flex items-center gap-1.5 rounded-full border border-[#E8E2FF] bg-white px-4 py-1.5 text-sm font-medium text-[#6B5AE0] transition hover:bg-[#F8F6FF]"
                        >
                          <Mail size={14} />
                          Draft Interview Confirmation
                        </button>
                      )}
                    </AnimatePresence>
                  )}
                </div>

                {/* Application summary — the original real draft generated at submission time */}
                {application.emailDraft && (
                  <div className="rounded-2xl border border-[#ECE8DF] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#18181B]">
                      <Mail size={14} className="text-[#8B7CF6]" />
                      {application.emailDraft.subject}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-[#6B7280]">
                      {application.emailDraft.body}
                    </pre>
                  </div>
                )}

                <Link
                  to={`/scout/${application.opportunityId}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6B5AE0]"
                >
                  View opportunity
                  <ExternalLink size={13} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </HoverCard>
    </motion.div>
  );
}

export default function Applications() {
  const { applications, updateApplicationStatus, scheduleInterview, setApplicationField, setPendingChatPrompt } =
    useApp();
  const navigate = useNavigate();

  const sorted = [...applications].sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));
  const active = sorted.filter((a) => a.status !== "rejected" && a.status !== "offer").length;

  const handlePrepInterview = (application) => {
    setPendingChatPrompt(buildInterviewPrepPrompt(application));
    navigate("/chat");
  };

  return (
    <SkillLayout
      badge="Application Tracker"
      title="Your Applications"
      subtitle={
        sorted.length
          ? `${active} active application${active === 1 ? "" : "s"} · ${sorted.length} total.`
          : "Nothing here yet — approve an application from an opportunity to start tracking it."
      }
      icon={<Send size={15} />}
    >
      {sorted.length === 0 ? (
        <HoverCard className="rounded-[32px] border border-dashed border-[#ECE8DF] bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F2FF]">
            <Send className="text-[#8B7CF6]" size={22} />
          </div>
          <h3 className="text-lg font-semibold text-[#18181B]">No applications yet</h3>
          <p className="mt-2 text-sm text-[#6B7280]">
            Open an opportunity in Scout and use "Apply with Career OS" — every application will show
            up here as a timeline you can track.
          </p>
          <Link
            to="/scout"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#18181B] px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            Browse opportunities
          </Link>
        </HoverCard>
      ) : (
        <div className="relative space-y-6">
          <div className="absolute left-[17px] top-2 h-[calc(100%-1rem)] w-px bg-[#ECE8DF]" />
          {sorted.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onUpdateStatus={updateApplicationStatus}
              onScheduleInterview={scheduleInterview}
              onPrepInterview={handlePrepInterview}
              onSetField={setApplicationField}
            />
          ))}
        </div>
      )}
    </SkillLayout>
  );
}
