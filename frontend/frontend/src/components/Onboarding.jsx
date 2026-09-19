import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Plus,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const STEPS = ["name", "role", "skills", "location", "stipend", "finish"];

const POPULAR_SKILLS = [
  "Figma",
  "UI Design",
  "UX Research",
  "Wireframing",
  "Prototyping",
  "Visual Design",
  "Typography",
  "User Testing",
  "Design Systems",
  "Interaction Design",
];

const POPULAR_LOCATIONS = [
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Mumbai",
  "Delhi NCR",
  "Chennai",
  "Gurugram",
  "Noida",
  "Ahmedabad",
  "Kochi",
];

const WORK_MODES = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

const POPULAR_ROLES = [
  "UI/UX Designer",
  "Product Designer",
  "UX Researcher",
  "Graphic Designer",
  "Marketing Intern",
  "Brand Designer",
  "Motion Designer",
  "Frontend Designer",
  "Design Systems",
  "Content Designer",
];

function StepShell({ children, eyebrow, title, subtitle }) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {eyebrow && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#F6F2FF] px-3 py-1 text-sm text-[#6B5AE0]">
          <Sparkles size={14} />
          {eyebrow}
        </div>
      )}
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#18181B] sm:text-5xl">
        {title}
      </h1>
      {subtitle && <p className="mt-4 max-w-lg text-lg leading-7 text-[#6B7280]">{subtitle}</p>}
      <div className="mt-10">{children}</div>
    </motion.div>
  );
}

function TextField({ value, onChange, placeholder, onEnter, type = "text" }) {
  return (
    <input
      autoFocus
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter?.();
      }}
      placeholder={placeholder}
      className="w-full max-w-md rounded-2xl border border-[#ECE8DF] bg-white px-5 py-4 text-lg text-[#18181B] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-4 focus:ring-[#8B7CF6]/10"
    />
  );
}

function SkillChip({ label, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.97 }}
      animate={{ scale: selected ? 1.03 : 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6] ${
        selected
          ? "border-transparent bg-[#8B7CF6] text-white shadow-lg shadow-[#8B7CF6]/30"
          : "border-[#ECE8DF] bg-white text-[#18181B] hover:border-[#8B7CF6]/40"
      }`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {selected && (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0, width: 0 }}
            animate={{ scale: 1, opacity: 1, width: "auto" }}
            exit={{ scale: 0, opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Check size={15} strokeWidth={2.5} />
          </motion.span>
        )}
      </AnimatePresence>
      {label}
    </motion.button>
  );
}

function SkillPicker({ selected, onAdd, onRemove }) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const customSkills = selected.filter(
    (s) => !POPULAR_SKILLS.some((p) => p.toLowerCase() === s.toLowerCase()),
  );

  useEffect(() => {
    if (otherOpen) inputRef.current?.focus();
  }, [otherOpen]);

  const toggle = (skill) => {
    const isSelected = selected.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (isSelected) onRemove(skill);
    else onAdd(skill);
  };

  const commitCustom = () => {
    const clean = draft.trim();
    if (clean) {
      onAdd(clean);
      setDraft("");
    }
  };

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9A8F83]">
        Popular Skills
      </p>

      <div className="flex flex-wrap gap-3">
        {POPULAR_SKILLS.map((skill) => (
          <SkillChip
            key={skill}
            label={skill}
            selected={selected.some((s) => s.toLowerCase() === skill.toLowerCase())}
            onClick={() => toggle(skill)}
          />
        ))}

        <motion.button
          type="button"
          onClick={() => setOtherOpen(true)}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-2xl border border-dashed border-[#ECE8DF] bg-white px-4 py-3 text-[15px] font-medium text-[#6B7280] transition-colors hover:border-[#8B7CF6]/40 hover:text-[#18181B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6]"
        >
          <Plus size={15} />
          Other
        </motion.button>
      </div>

      <AnimatePresence>
        {otherOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                } else if (e.key === "Backspace" && draft === "" && customSkills.length > 0) {
                  onRemove(customSkills[customSkills.length - 1]);
                }
              }}
              placeholder="Type a skill and press Enter"
              className="w-full max-w-sm rounded-2xl border border-[#ECE8DF] bg-white px-5 py-3 text-[15px] text-[#18181B] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-4 focus:ring-[#8B7CF6]/10"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9A8F83]">
          Selected ({selected.length})
        </p>

        {selected.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Pick a few skills above to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selected.map((skill) => (
                <motion.span
                  key={skill}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 rounded-full bg-[#F6F2FF] px-4 py-2 text-sm font-medium text-[#6B5AE0]"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => onRemove(skill)}
                    aria-label={`Remove ${skill}`}
                    className="text-[#6B5AE0]/60 hover:text-[#6B5AE0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6]"
                  >
                    <X size={13} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function RolePicker({ value, onSelect, onClear }) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const isCustom = value && !POPULAR_ROLES.some((r) => r.toLowerCase() === value.toLowerCase());

  useEffect(() => {
    if (otherOpen) inputRef.current?.focus();
  }, [otherOpen]);

  const pick = (role) => {
    if (value && value.toLowerCase() === role.toLowerCase()) {
      onClear();
    } else {
      onSelect(role);
      setOtherOpen(false);
    }
  };

  const commitCustom = () => {
    const clean = draft.trim();
    if (clean) {
      onSelect(clean);
      setDraft("");
      setOtherOpen(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9A8F83]">
        Popular Roles
      </p>

      <div className="flex flex-wrap gap-3">
        {POPULAR_ROLES.map((role) => (
          <SkillChip
            key={role}
            label={role}
            selected={value?.toLowerCase() === role.toLowerCase()}
            onClick={() => pick(role)}
          />
        ))}

        <motion.button
          type="button"
          onClick={() => setOtherOpen((o) => !o)}
          whileTap={{ scale: 0.97 }}
          aria-pressed={isCustom}
          className={`flex items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6] ${
            isCustom
              ? "border-[#8B7CF6] text-[#6B5AE0]"
              : "border-[#ECE8DF] bg-white text-[#6B7280] hover:border-[#8B7CF6]/40 hover:text-[#18181B]"
          }`}
        >
          <Plus size={15} />
          Other
        </motion.button>
      </div>

      <AnimatePresence>
        {otherOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                }
              }}
              placeholder="Type a role and press Enter"
              className="w-full max-w-sm rounded-2xl border border-[#ECE8DF] bg-white px-5 py-3 text-[15px] text-[#18181B] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-4 focus:ring-[#8B7CF6]/10"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9A8F83]">
          Selected Role
        </p>

        <AnimatePresence mode="wait">
          {value ? (
            <motion.div
              key={value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-3 rounded-2xl bg-[#F6F2FF] px-6 py-4 text-lg font-semibold text-[#6B5AE0]"
            >
              {value}
              <button
                type="button"
                onClick={onClear}
                aria-label={`Remove ${value}`}
                className="text-[#6B5AE0]/60 hover:text-[#6B5AE0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6]"
              >
                <X size={16} />
              </button>
            </motion.div>
          ) : (
            <p className="text-sm text-[#9CA3AF]">Pick a role above to get started.</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LocationChip({ label, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6] ${
        selected
          ? "border-transparent bg-[#8B7CF6] text-white shadow-lg shadow-[#8B7CF6]/30"
          : "border-[#ECE8DF] bg-white text-[#18181B] hover:border-[#8B7CF6] hover:bg-[#F8F6FF] hover:shadow-lg hover:shadow-[#8B7CF6]/15"
      }`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {selected && (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0, width: 0 }}
            animate={{ scale: 1, opacity: 1, width: "auto" }}
            exit={{ scale: 0, opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Check size={15} strokeWidth={2.5} className="text-white" />
          </motion.span>
        )}
      </AnimatePresence>
      {label}
    </motion.button>
  );
}

function LocationPicker({ selected, onAdd, onRemove, workMode, onWorkModeSelect }) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const customLocations = selected.filter(
    (s) => !POPULAR_LOCATIONS.some((p) => p.toLowerCase() === s.toLowerCase()),
  );

  useEffect(() => {
    if (otherOpen) inputRef.current?.focus();
  }, [otherOpen]);

  const toggle = (location) => {
    const isSelected = selected.some((s) => s.toLowerCase() === location.toLowerCase());
    if (isSelected) onRemove(location);
    else onAdd(location);
  };

  const commitCustom = () => {
    const clean = draft.trim();
    if (clean) {
      onAdd(clean);
      setDraft("");
    }
  };

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9A8F83]">
        Popular Locations
      </p>

      <div className="flex flex-wrap gap-3">
        {POPULAR_LOCATIONS.map((location) => (
          <LocationChip
            key={location}
            label={location}
            selected={selected.some((s) => s.toLowerCase() === location.toLowerCase())}
            onClick={() => toggle(location)}
          />
        ))}

        <motion.button
          type="button"
          onClick={() => setOtherOpen(true)}
          whileHover={{ y: -3, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="flex items-center gap-2 rounded-2xl border border-dashed border-[#ECE8DF] bg-white px-4 py-3 text-[15px] font-medium text-[#6B7280] transition-colors hover:border-[#8B7CF6] hover:text-[#18181B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6]"
        >
          <Plus size={15} />
          Other
        </motion.button>
      </div>

      <AnimatePresence>
        {otherOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                } else if (e.key === "Backspace" && draft === "" && customLocations.length > 0) {
                  onRemove(customLocations[customLocations.length - 1]);
                }
              }}
              placeholder="Type a location and press Enter"
              className="w-full max-w-sm rounded-2xl border border-[#ECE8DF] bg-white px-5 py-3 text-[15px] text-[#18181B] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-4 focus:ring-[#8B7CF6]/10"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9A8F83]">
          Work Mode
        </p>
        <div className="flex flex-wrap gap-3">
          {WORK_MODES.map((mode) => (
            <LocationChip
              key={mode.id}
              label={mode.label}
              selected={workMode === mode.id}
              onClick={() => onWorkModeSelect(workMode === mode.id ? "" : mode.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9A8F83]">
          Selected Locations ({selected.length})
        </p>

        {selected.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Pick a few locations above to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selected.map((location) => (
                <motion.span
                  key={location}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 rounded-full bg-[#F6F2FF] px-4 py-2 text-sm font-medium text-[#6B5AE0]"
                >
                  {location}
                  <button
                    type="button"
                    onClick={() => onRemove(location)}
                    aria-label={`Remove ${location}`}
                    className="text-[#6B5AE0]/60 hover:text-[#6B5AE0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7CF6]"
                  >
                    <X size={13} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { completeOnboarding } = useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    name: "",
    preferredRole: "",
    skills: [],
    preferredLocations: [],
    workMode: "",
    minStipend: 20000,
  });

  const step = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const canAdvance = {
    name: form.name.trim().length > 0,
    role: form.preferredRole.trim().length > 0,
    skills: form.skills.length > 0,
    location: form.preferredLocations.length > 0,
    stipend: form.minStipend > 0,
    finish: true,
  }[step];

  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const finish = () => {
    completeOnboarding({
      name: form.name.trim(),
      preferredRole: form.preferredRole.trim(),
      skills: form.skills,
      preferredLocations: form.preferredLocations,
      minStipend: form.minStipend,
      ...(form.workMode ? { workMode: form.workMode } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8F7F4] px-6">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#EFE8FF] blur-3xl opacity-70" />
      <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-[#FFF4D8] blur-3xl opacity-50" />

      <div className="relative w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-12 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ECE8DF]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#8B7CF6] to-[#A796FF]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-sm font-medium text-[#9A8F83]">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === "name" && (
            <StepShell
              eyebrow="Welcome to Career OS"
              title="What should we call you?"
              subtitle="Career OS remembers this so it never has to ask again."
            >
              <TextField
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Your name"
                onEnter={() => canAdvance && next()}
              />
            </StepShell>
          )}

          {step === "role" && (
            <StepShell
              eyebrow="Direction"
              title="What internship role are you aiming for?"
              subtitle="This tunes every match Career OS finds for you."
            >
              <RolePicker
                value={form.preferredRole}
                onSelect={(role) => setForm((f) => ({ ...f, preferredRole: role }))}
                onClear={() => setForm((f) => ({ ...f, preferredRole: "" }))}
              />
            </StepShell>
          )}

          {step === "skills" && (
            <StepShell
              eyebrow="Strengths"
              title="What are your skills?"
              subtitle="Pick a few — Career OS uses these to score how well an opportunity fits you."
            >
              <SkillPicker
                selected={form.skills}
                onAdd={(s) =>
                  setForm((f) =>
                    f.skills.some((x) => x.toLowerCase() === s.toLowerCase())
                      ? f
                      : { ...f, skills: [...f.skills, s] },
                  )
                }
                onRemove={(s) =>
                  setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))
                }
              />
            </StepShell>
          )}

          {step === "location" && (
            <StepShell
              eyebrow="Location"
              title="Where do you want to work?"
              subtitle="Pick a few cities, and a work mode if you have one in mind."
            >
              <LocationPicker
                selected={form.preferredLocations}
                onAdd={(l) =>
                  setForm((f) =>
                    f.preferredLocations.some((x) => x.toLowerCase() === l.toLowerCase())
                      ? f
                      : { ...f, preferredLocations: [...f.preferredLocations, l] },
                  )
                }
                onRemove={(l) =>
                  setForm((f) => ({
                    ...f,
                    preferredLocations: f.preferredLocations.filter((x) => x !== l),
                  }))
                }
                workMode={form.workMode}
                onWorkModeSelect={(mode) => setForm((f) => ({ ...f, workMode: mode }))}
              />
            </StepShell>
          )}

          {step === "stipend" && (
            <StepShell
              eyebrow="Compensation"
              title="What's your minimum stipend?"
              subtitle="Career OS filters out anything below this."
            >
              <div className="flex max-w-md items-center gap-3 rounded-2xl border border-[#ECE8DF] bg-white px-5 py-4 focus-within:border-[#8B7CF6] focus-within:ring-4 focus-within:ring-[#8B7CF6]/10">
                <span className="text-lg text-[#6B7280]">₹</span>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  step={1000}
                  value={form.minStipend}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minStipend: Number(e.target.value) || 0 }))
                  }
                  className="w-full bg-transparent text-lg text-[#18181B] outline-none"
                />
                <span className="text-sm text-[#9CA3AF]">/ month</span>
              </div>
            </StepShell>
          )}

          {step === "finish" && (
            <StepShell
              eyebrow="All set"
              title={`Welcome aboard, ${form.name || "there"}.`}
              subtitle="Career OS now knows your skills, preferences and goals — it'll use them everywhere, automatically."
            >
              <div className="max-w-md space-y-3">
                {[
                  ["Role", form.preferredRole],
                  ["Skills", form.skills.join(", ") || "—"],
                  ["Locations", form.preferredLocations.join(", ") || "—"],
                  ["Min. stipend", `₹${form.minStipend.toLocaleString("en-IN")}/mo`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl bg-white border border-[#ECE8DF] px-5 py-3"
                  >
                    <span className="text-sm text-[#6B7280]">{label}</span>
                    <span className="font-medium text-[#18181B]">{value}</span>
                  </div>
                ))}
              </div>
            </StepShell>
          )}
        </AnimatePresence>

        {/* Nav */}
        <div className="mt-12 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 rounded-full px-5 py-3 text-[#6B7280] transition hover:text-[#18181B] disabled:opacity-0"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step === "finish" ? (
            <button
              type="button"
              onClick={finish}
              className="flex items-center gap-2 rounded-full bg-[#8B7CF6] px-7 py-3 font-medium text-white shadow-lg shadow-[#8B7CF6]/25 transition hover:bg-[#7866F0]"
            >
              Enter Career OS
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance}
              className="flex items-center gap-2 rounded-full bg-[#18181B] px-7 py-3 font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-30"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
