import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, MapPin, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import SectionHeading from '../components/ui/SectionHeading'
import { categoryStatus } from '../lib/readiness'

const DOC_STATUS_COPY = {
  ready: { label: 'Ready', color: '#4FA66B' },
  indexing: { label: 'Indexing…', color: '#8B7CF6' },
  'needs-update': { label: 'Needs attention', color: '#D4A017' },
  missing: { label: 'Not uploaded', color: '#9CA3AF' },
}

const POPULAR_SKILLS = [
  'Figma',
  'UX Research',
  'UI Design',
  'Wireframing',
  'Prototyping',
  'Design Systems',
  'Adobe XD',
  'Photoshop',
  'Illustrator',
  'Motion Design',
  'Frontend (React)',
  'HTML/CSS',
  'JavaScript',
  'User Testing',
  'Accessibility',
  'Product Design',
]

const POPULAR_LOCATIONS = [
  'Remote',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Mumbai',
  'Delhi',
  'Noida',
  'Gurgaon',
  'Chennai',
  'Ahmedabad',
  'Kolkata',
]

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-[13px] text-ink-faint">{label}</span>
      {children}
    </div>
  )
}

function findExisting(items, value) {
  return items.find((item) => item.toLowerCase() === value.toLowerCase())
}

/**
 * Apple-setup / Linear-style hybrid picker: tap a popular chip to
 * toggle it straight into AppContext, or expand "+ Other" for a
 * one-off custom value. Every chip — popular or custom — reads its
 * selected state directly from `items` (the real profile array), so
 * there is no local shadow state to fall out of sync.
 */
function SmartSelectChips({ label, popularOptions, items, onAdd, onRemove, icon: Icon, testIdPrefix }) {
  const [showOther, setShowOther] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const canAddCustom = customValue.trim().length > 0
  const customItems = items.filter(
    (item) => !popularOptions.some((option) => option.toLowerCase() === item.toLowerCase()),
  )

  function toggleOption(option) {
    const existing = findExisting(items, option)
    if (existing) {
      onRemove(existing)
    } else {
      onAdd(option)
    }
  }

  function handleAddCustom() {
    const clean = customValue.trim()
    if (!clean) return
    if (findExisting(items, clean)) {
      setCustomValue('')
      setShowOther(false)
      return
    }
    onAdd(clean)
    setCustomValue('')
    setShowOther(false)
  }

  function handleCustomKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCustom()
    }
    if (e.key === 'Escape') {
      setShowOther(false)
      setCustomValue('')
    }
  }

  return (
    <div className="py-4">
      <p className="text-[13px] text-ink-faint">{label}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {popularOptions.map((option) => {
          const selected = Boolean(findExisting(items, option))
          return (
            <motion.button
              key={option}
              type="button"
              data-testid={testIdPrefix ? `${testIdPrefix}-chip-${option}` : undefined}
              onClick={() => toggleOption(option)}
              initial={false}
              animate={{
                backgroundColor: selected ? '#8B7CF6' : '#FFFFFF',
                color: selected ? '#FFFFFF' : '#18181B',
                borderColor: selected ? '#8B7CF6' : '#E5E1D8',
                scale: selected ? 1.03 : 1,
              }}
              whileHover={{ y: -2, borderColor: '#8B7CF6' }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender"
            >
              {selected && <Check size={12} />}
              {Icon && !selected && <Icon size={12} className="text-ink-faint" />}
              {option}
              {selected && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${option}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(findExisting(items, option) ?? option)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onRemove(findExisting(items, option) ?? option)
                    }
                  }}
                  className="ml-0.5 cursor-pointer opacity-80 hover:opacity-100"
                >
                  <X size={12} />
                </span>
              )}
            </motion.button>
          )
        })}

        <motion.button
          type="button"
          data-testid={testIdPrefix ? `${testIdPrefix}-other-toggle` : undefined}
          onClick={() => setShowOther((v) => !v)}
          whileHover={{ y: -2, borderColor: '#8B7CF6' }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
          aria-pressed={showOther}
          className={`flex cursor-pointer items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender ${
            showOther
              ? 'border-lavender bg-lavender-soft text-[#5b4bd6]'
              : 'border-hairline bg-surface text-ink'
          }`}
        >
          <Plus size={12} />
          Other
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {customItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint/70">
              Added by you
            </p>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {customItems.map((item) => (
                  <motion.span
                    key={item}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5 rounded-full bg-[#8B7CF6] px-3.5 py-1.5 text-[13px] font-medium text-white"
                  >
                    <Check size={12} />
                    {Icon && <Icon size={12} />}
                    {item}
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      aria-label={`Remove ${item}`}
                      className="cursor-pointer opacity-80 transition hover:scale-110 hover:opacity-100 active:scale-90"
                    >
                      <X size={12} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-hairline bg-[#FBFAF7] p-4">
              <p className="text-[12px] font-medium text-ink-faint">
                Custom {label.toLowerCase().replace(/s$/, '')}
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  data-testid={testIdPrefix ? `${testIdPrefix}-custom-input` : undefined}
                  type="text"
                  autoFocus
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleCustomKeyDown}
                  placeholder={testIdPrefix === 'location' ? 'e.g. Kanpur' : 'e.g. Blender'}
                  className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-2 focus-visible:outline-lavender"
                />
                <button
                  type="button"
                  data-testid={testIdPrefix ? `${testIdPrefix}-custom-add` : undefined}
                  disabled={!canAddCustom}
                  onClick={handleAddCustom}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                    canAddCustom
                      ? 'bg-[#18181B] text-white hover:-translate-y-0.5 hover:bg-black active:scale-[0.98]'
                      : 'cursor-not-allowed bg-[#18181B]/25 text-white/70'
                  }`}
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Settings() {
  const {
    profile,
    settings,
    documents,
    updateProfile,
    updateSettings,
    addSkill,
    removeSkill,
    addLocation,
    removeLocation,
  } = useApp()
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [role, setRole] = useState(profile.role)
  const [saved, setSaved] = useState(false)

  const [preferredRole, setPreferredRole] = useState(profile.preferredRole)
  const [minStipend, setMinStipend] = useState(profile.minStipend)
  const [careerSaved, setCareerSaved] = useState(false)
  const [careerError, setCareerError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    setName(profile.name)
    setEmail(profile.email)
    setRole(profile.role)
    setPreferredRole(profile.preferredRole)
    setMinStipend(profile.minStipend)
  }, [profile])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast((cur) => (cur === message ? '' : cur)), 2400)
  }

  const handleSaveProfile = () => {
    updateProfile({ name, email, role })
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const handleSaveCareerProfile = () => {
    const cleanRole = preferredRole.trim()
    const stipend = Number(minStipend)

    if (!cleanRole) {
      setCareerError('Preferred role is required.')
      return
    }
    if (Number.isNaN(stipend) || stipend < 0) {
      setCareerError('Minimum stipend must be a valid non-negative number.')
      return
    }
    if (profile.skills.length === 0) {
      setCareerError('Add at least one skill before saving.')
      return
    }
    if (profile.preferredLocations.length === 0) {
      setCareerError('Add at least one preferred location before saving.')
      return
    }

    setCareerError('')
    updateProfile({ preferredRole: cleanRole, minStipend: stipend })
    setCareerSaved(true)
    setTimeout(() => setCareerSaved(false), 1600)
    showToast('Career profile updated successfully.')
  }

  return (
    <div className="pt-8">
      <SectionHeading eyebrow="Account" title="Settings" />

      <div className="grid max-w-[640px] gap-6">
        <section className="rounded-[32px] border border-hairline/70 bg-surface p-8">
          <h2 className="text-[15px] font-semibold text-ink">Profile</h2>
          <div className="mt-4 flex flex-col divide-y divide-hairline/70">
            <div className="flex items-center justify-between py-4">
              <label htmlFor="name" className="text-[13px] text-ink-faint">
                Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-1/2 rounded-lg border border-transparent bg-transparent text-right text-[15px] font-medium text-ink focus:border-hairline focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between py-4">
              <label htmlFor="email" className="text-[13px] text-ink-faint">
                Email
              </label>
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-1/2 rounded-lg border border-transparent bg-transparent text-right text-[15px] font-medium text-ink focus:border-hairline focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between py-4">
              <label htmlFor="role" className="text-[13px] text-ink-faint">
                Role
              </label>
              <input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-1/2 rounded-lg border border-transparent bg-transparent text-right text-[15px] font-medium text-ink focus:border-hairline focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="mt-4 flex items-center gap-2 rounded-[18px] bg-solid-ink px-5 py-2.5 text-[13px] font-medium text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-lavender"
          >
            {saved && <Check size={14} />}
            {saved ? 'Saved' : 'Save Profile'}
          </button>
        </section>

        <section className="rounded-[32px] border border-hairline/70 bg-surface p-8">
          <h2 className="text-[15px] font-semibold text-ink">Career profile</h2>
          <p className="mt-1 text-[13px] text-ink-faint">
            Career OS uses this everywhere — Scout, Dashboard and Chat — automatically.
          </p>

          <div className="mt-2 flex flex-col divide-y divide-hairline/70">
            <div className="flex items-center justify-between py-4">
              <label htmlFor="preferredRole" className="text-[13px] text-ink-faint">
                Preferred role
              </label>
              <input
                id="preferredRole"
                value={preferredRole}
                onChange={(e) => setPreferredRole(e.target.value)}
                className="w-1/2 rounded-lg border border-transparent bg-transparent text-right text-[15px] font-medium text-ink focus:border-hairline focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between py-4">
              <label htmlFor="minStipend" className="text-[13px] text-ink-faint">
                Minimum stipend (₹/mo)
              </label>
              <input
                id="minStipend"
                type="number"
                min={0}
                step={1000}
                value={minStipend}
                onChange={(e) => setMinStipend(e.target.value)}
                className="w-1/2 rounded-lg border border-transparent bg-transparent text-right text-[15px] font-medium text-ink focus:border-hairline focus:outline-none"
              />
            </div>

            <Row label="Work mode">
              <div className="flex gap-2">
                {['remote', 'hybrid', 'onsite'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateProfile({ workMode: mode })}
                    aria-pressed={profile.workMode === mode}
                    className={`rounded-full px-3 py-1.5 text-[13px] capitalize transition-colors focus-visible:outline-2 focus-visible:outline-lavender ${
                      profile.workMode === mode
                        ? 'bg-solid-ink text-white'
                        : 'border border-hairline text-ink-soft'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </Row>

            {/* Real, read-only — reflects the actual uploaded documents in
                Document Intelligence. This used to be a manual dropdown the
                user could set to "Ready" with no file behind it; status now
                only ever comes from a real upload. */}
            <Row label="Resume status">
              <Link
                to="/documents"
                className="flex items-center gap-1.5 text-[13px] font-medium transition hover:underline"
                style={{ color: DOC_STATUS_COPY[categoryStatus(documents, 'Resume')].color }}
              >
                {DOC_STATUS_COPY[categoryStatus(documents, 'Resume')].label}
              </Link>
            </Row>

            <Row label="Portfolio status">
              <Link
                to="/documents"
                className="flex items-center gap-1.5 text-[13px] font-medium transition hover:underline"
                style={{ color: DOC_STATUS_COPY[categoryStatus(documents, 'Portfolio')].color }}
              >
                {DOC_STATUS_COPY[categoryStatus(documents, 'Portfolio')].label}
              </Link>
            </Row>

            <SmartSelectChips
              label="Skills"
              popularOptions={POPULAR_SKILLS}
              items={profile.skills}
              onAdd={addSkill}
              onRemove={removeSkill}
              testIdPrefix="skill"
            />

            <SmartSelectChips
              label="Preferred locations"
              popularOptions={POPULAR_LOCATIONS}
              items={profile.preferredLocations}
              onAdd={addLocation}
              onRemove={removeLocation}
              icon={MapPin}
              testIdPrefix="location"
            />
          </div>

          {careerError && (
            <p className="mt-3 text-[13px] font-medium text-[#D4183D]">{careerError}</p>
          )}

          <button
            type="button"
            onClick={handleSaveCareerProfile}
            className="mt-4 flex cursor-pointer items-center gap-2 rounded-[18px] bg-solid-ink px-5 py-2.5 text-[13px] font-medium text-white transition-transform hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-lavender"
          >
            {careerSaved && <Check size={14} />}
            {careerSaved ? 'Saved' : 'Save Career Profile'}
          </button>
        </section>

        <section className="rounded-[32px] border border-hairline/70 bg-surface p-8">
          <h2 className="text-[15px] font-semibold text-ink">Preferences</h2>
          <div className="mt-2 flex flex-col divide-y divide-hairline/70">
            <Row label="Theme">
              <div className="flex gap-2">
                {['light', 'dark'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateSettings({ theme: t })}
                    aria-pressed={settings.theme === t}
                    className={`rounded-full px-3 py-1.5 text-[13px] capitalize transition-colors focus-visible:outline-2 focus-visible:outline-lavender ${
                      settings.theme === t
                        ? 'bg-solid-ink text-white'
                        : 'border border-hairline text-ink-soft'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Notifications">
              <button
                type="button"
                onClick={() => updateSettings({ notifications: !settings.notifications })}
                aria-pressed={settings.notifications}
                className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender ${
                  settings.notifications ? 'bg-sage' : 'bg-hairline'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${
                    settings.notifications ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </Row>
            <Row label="Daily Brief time">
              <input
                type="time"
                value={settings.briefTime}
                onChange={(e) => updateSettings({ briefTime: e.target.value })}
                className="rounded-lg border border-hairline bg-surface px-2 py-1 text-[13px] text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-lavender"
              />
            </Row>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#18181B] px-5 py-3 text-[13px] font-medium text-white shadow-lg"
          >
            <Check size={14} className="text-[#8B7CF6]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
