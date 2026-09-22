import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { defaultActivity, defaultDocuments, defaultProfile, defaultSettings } from '../data/defaultState'
import { loadState, saveState } from '../lib/storage'
import { createApplicationRecord } from '../lib/agent'
import { computeReadiness } from '../lib/readiness'

const AppContext = createContext(null)

const defaultState = {
  profile: defaultProfile,
  settings: defaultSettings,
  documents: defaultDocuments,
  activity: defaultActivity,
  // Cross-page connective tissue: which live job the user is currently
  // working on, which ones they've saved, and a prompt Chat should pick up
  // on next load (e.g. from Ready Kit's "Generate Cover Letter"). The jobs
  // themselves are never stored here — they come from services/jobs.js
  // (live API + session cache), not AppContext, so there's one source of
  // truth for job content and one for the user's actions on it.
  selectedOpportunityId: null,
  savedJobIds: [],
  // Rich application records (see lib/agent.js's createApplicationRecord for
  // the shape) — self-contained snapshots, so they don't depend on a live
  // job still being fetchable to render the tracker.
  applications: [],
  coverLettersGenerated: [], // job ids Ready Kit has drafted a letter for
  pendingChatPrompt: null,
  // Which uploaded document is "open" for Chat context (Document
  // Intelligence's "Improve with Career OS" sets this before navigating).
  selectedDocumentId: null,
  // Job-specific tailored resumes (see services/resumeGenerator.js). These
  // are DERIVATIVES of the real master resume in `documents` — additive
  // only, never replace or overwrite the master resume record.
  // Shape: { id, jobId, company, role, sourceResumeId, matchScore, content,
  //          missingRequirements, createdAt }
  tailoredResumes: [],
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState(defaultState))

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme)
  }, [state.settings.theme])

  // One-time startup repair: a "submitted" application whose real, current
  // document readiness is 0% is an impossible state (e.g. the resume that
  // justified it was later deleted). Downgrade it to `profile_incomplete`
  // so no card can ever render "Applied" alongside "Resume Required".
  useEffect(() => {
    setState((prev) => {
      const readiness = computeReadiness(prev.documents).percent
      if (readiness > 0) return prev

      let repaired = false
      const now = new Date().toISOString()
      const applications = prev.applications.map((a) => {
        if (a.status === 'submitted') {
          repaired = true
          return {
            ...a,
            status: 'profile_incomplete',
            statusHistory: [...(a.statusHistory ?? []), { status: 'profile_incomplete', at: now }],
          }
        }
        return a
      })

      if (!repaired) return prev
      return { ...prev, applications }
    })
    // Runs once on startup, against whatever was loaded from localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addActivity = useCallback((text, tone = 'lavender') => {
    setState((prev) => ({
      ...prev,
      activity: [{ id: Date.now(), time: timeNow(), text, tone }, ...prev.activity].slice(0, 20),
    }))
  }, [])

  const updateProfile = useCallback((next) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...next } }))
  }, [])

  const completeOnboarding = useCallback(
    (data) => {
      setState((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...data, onboarded: true },
      }))
      addActivity('Career profile set up', 'sage')
    },
    [addActivity],
  )

  const addSkill = useCallback((skill) => {
    const clean = skill.trim()
    if (!clean) return
    setState((prev) => {
      const has = prev.profile.skills.some((s) => s.toLowerCase() === clean.toLowerCase())
      if (has) return prev
      return { ...prev, profile: { ...prev.profile, skills: [...prev.profile.skills, clean] } }
    })
  }, [])

  const removeSkill = useCallback((skill) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, skills: prev.profile.skills.filter((s) => s !== skill) },
    }))
  }, [])

  const addLocation = useCallback((location) => {
    const clean = location.trim()
    if (!clean) return
    setState((prev) => {
      const has = prev.profile.preferredLocations.some(
        (l) => l.toLowerCase() === clean.toLowerCase(),
      )
      if (has) return prev
      return {
        ...prev,
        profile: {
          ...prev.profile,
          preferredLocations: [...prev.profile.preferredLocations, clean],
        },
      }
    })
  }, [])

  const removeLocation = useCallback((location) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        preferredLocations: prev.profile.preferredLocations.filter((l) => l !== location),
      },
    }))
  }, [])

  const toggleSaveJob = useCallback((job) => {
    setState((prev) => {
      const saved = prev.savedJobIds.includes(job.id)
      return {
        ...prev,
        savedJobIds: saved
          ? prev.savedJobIds.filter((id) => id !== job.id)
          : [...prev.savedJobIds, job.id],
      }
    })
    addActivity(`${state.savedJobIds.includes(job.id) ? 'Unsaved' : 'Saved'} ${job.company} · ${job.role}`, 'lavender')
  }, [state.savedJobIds, addActivity])

  const isJobSaved = useCallback((id) => state.savedJobIds.includes(id), [state.savedJobIds])

  const updateSettings = useCallback((next) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...next } }))
  }, [])

  const setSelectedOpportunity = useCallback((id) => {
    setState((prev) => (prev.selectedOpportunityId === id ? prev : { ...prev, selectedOpportunityId: id }))
  }, [])

  // The one place an application is ever created — only called after the
  // user has explicitly approved the agent's approval modal. Never invoked
  // automatically.
  const submitApplication = useCallback(
    (job, { tailoredResumeId = null } = {}) => {
      const savedBeforeApplying = state.savedJobIds.includes(job.id)
      const record = createApplicationRecord(job, state.profile, { savedBeforeApplying, tailoredResumeId })
      setState((prev) => ({ ...prev, applications: [record, ...prev.applications] }))
      addActivity(`Applied to ${job.company} · ${job.role}`, 'sage')
      return record
    },
    [state.profile, state.savedJobIds, addActivity],
  )

  const hasApplied = useCallback(
    (jobId) => state.applications.some((a) => a.opportunityId === jobId),
    [state.applications],
  )

  const updateApplicationStatus = useCallback(
    (applicationId, status) => {
      const now = new Date().toISOString()
      setState((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === applicationId
            ? { ...a, status, statusHistory: [...(a.statusHistory ?? []), { status, at: now }] }
            : a,
        ),
      }))
      const app = state.applications.find((a) => a.id === applicationId)
      if (app) addActivity(`${app.company} application — ${status.replace(/_/g, ' ')}`, 'gold')
    },
    [state.applications, addActivity],
  )

  const setApplicationField = useCallback((applicationId, patch) => {
    setState((prev) => ({
      ...prev,
      applications: prev.applications.map((a) => (a.id === applicationId ? { ...a, ...patch } : a)),
    }))
  }, [])

  const scheduleInterview = useCallback(
    (applicationId, interviewDateIso) => {
      setState((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === applicationId ? { ...a, interviewDate: interviewDateIso, status: 'interview_scheduled' } : a,
        ),
      }))
      const app = state.applications.find((a) => a.id === applicationId)
      if (app) addActivity(`Interview scheduled — ${app.company}`, 'gold')
    },
    [state.applications, addActivity],
  )

  const markCoverLetterGenerated = useCallback((jobId) => {
    setState((prev) =>
      prev.coverLettersGenerated.includes(jobId)
        ? prev
        : { ...prev, coverLettersGenerated: [...prev.coverLettersGenerated, jobId] },
    )
  }, [])

  const setPendingChatPrompt = useCallback((prompt) => {
    setState((prev) => ({ ...prev, pendingChatPrompt: prompt }))
  }, [])

  const clearPendingChatPrompt = useCallback(() => {
    setState((prev) => (prev.pendingChatPrompt ? { ...prev, pendingChatPrompt: null } : prev))
  }, [])

  // Real Document Intelligence CRUD. `fileReference` is the id under which
  // the actual bytes live in services/storage.js (IndexedDB) — this
  // metadata object is the only part that goes into localStorage.
  const addDocument = useCallback(
    (doc) => {
      setState((prev) => ({ ...prev, documents: [doc, ...prev.documents] }))
      addActivity(`Uploaded ${doc.name}`, 'lavender')
    },
    [addActivity],
  )

  const updateDocument = useCallback((id, patch) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
      ),
    }))
  }, [])

  const removeDocument = useCallback(
    (id) => {
      const doc = state.documents.find((d) => d.id === id)
      setState((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.id !== id) }))
      if (doc) addActivity(`Deleted ${doc.name}`, 'gold')
    },
    [state.documents, addActivity],
  )

  const setSelectedDocument = useCallback((id) => {
    setState((prev) => (prev.selectedDocumentId === id ? prev : { ...prev, selectedDocumentId: id }))
  }, [])

  // Additive, job-specific derivatives of the real master resume — never
  // touches `documents`/the master resume record itself.
  const addTailoredResume = useCallback(
    (record) => {
      setState((prev) => ({ ...prev, tailoredResumes: [record, ...prev.tailoredResumes] }))
      addActivity(`Tailored resume created for ${record.company} · ${record.role}`, 'lavender')
    },
    [addActivity],
  )

  const removeTailoredResume = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      tailoredResumes: prev.tailoredResumes.filter((r) => r.id !== id),
    }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      addActivity,
      updateProfile,
      completeOnboarding,
      addSkill,
      removeSkill,
      addLocation,
      removeLocation,
      toggleSaveJob,
      isJobSaved,
      updateSettings,
      addDocument,
      updateDocument,
      removeDocument,
      setSelectedDocument,
      setSelectedOpportunity,
      submitApplication,
      hasApplied,
      updateApplicationStatus,
      setApplicationField,
      scheduleInterview,
      markCoverLetterGenerated,
      setPendingChatPrompt,
      clearPendingChatPrompt,
      addTailoredResume,
      removeTailoredResume,
    }),
    [
      state,
      addActivity,
      updateProfile,
      completeOnboarding,
      addSkill,
      removeSkill,
      addLocation,
      removeLocation,
      toggleSaveJob,
      isJobSaved,
      updateSettings,
      addDocument,
      updateDocument,
      removeDocument,
      setSelectedDocument,
      setSelectedOpportunity,
      submitApplication,
      hasApplied,
      updateApplicationStatus,
      setApplicationField,
      scheduleInterview,
      markCoverLetterGenerated,
      setPendingChatPrompt,
      clearPendingChatPrompt,
      addTailoredResume,
      removeTailoredResume,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
