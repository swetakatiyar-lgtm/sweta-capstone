import { HashRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Onboarding from './components/Onboarding'
import Dashboard from './pages/Dashboard'
import Scout from './pages/Scout'
import OpportunityDetail from './pages/OpportunityDetail'
import ReadyKit from './pages/ReadyKit'
import Applications from './pages/Applications'
import DailyBrief from './pages/DailyBrief'
import Documents from './pages/Documents'
import DocumentDetail from './pages/DocumentDetail'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import { useApp } from './context/AppContext'

function App() {
  const { profile } = useApp()

  if (!profile.onboarded) {
    return <Onboarding />
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scout" element={<Scout />} />
          <Route path="/scout/:id" element={<OpportunityDetail />} />
          <Route path="/ready-kit" element={<ReadyKit />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/daily-brief" element={<DailyBrief />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
