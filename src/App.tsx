import { useEffect } from 'react'
import { Route, Routes } from 'react-router'
import AppShell from '@/components/layout/AppShell'
import CreditsPage from '@/pages/CreditsPage'
import EventPage from '@/pages/EventPage'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
import PersonPage from '@/pages/PersonPage'
import PlacePage from '@/pages/PlacePage'
import SearchPage from '@/pages/SearchPage'
import StudyPage from '@/pages/StudyPage'
import TopicPage from '@/pages/TopicPage'
import BookPage from '@/pages/BookPage'
import { FONT_SIZES, useSettings } from '@/store/settings'

export default function App() {
  const theme = useSettings((s) => s.theme)
  const fontSize = useSettings((s) => s.fontSize)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--reader-size', FONT_SIZES[fontSize])
  }, [fontSize])

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/person/:id" element={<PersonPage />} />
        <Route path="/place/:id" element={<PlacePage />} />
        <Route path="/topic/:id" element={<TopicPage />} />
        <Route path="/event/:id" element={<EventPage />} />
        <Route path="/study/:id" element={<StudyPage />} />
        <Route path="/book/:osis" element={<BookPage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}
