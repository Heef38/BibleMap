import { useEffect } from 'react'
import { Route, Routes } from 'react-router'
import AppShell from '@/components/layout/AppShell'
import CreditsPage from '@/pages/CreditsPage'
import EventPage from '@/pages/EventPage'
import ChapterPage from '@/pages/ChapterPage'
import StudiesPage from '@/pages/StudiesPage'
import WritingPage from '@/pages/WritingPage'
import WritingsPage from '@/pages/WritingsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PersonPage from '@/pages/PersonPage'
import PlacePage from '@/pages/PlacePage'
import SearchPage from '@/pages/SearchPage'
import StudyPage from '@/pages/StudyPage'
import TopicPage from '@/pages/TopicPage'
import TimelinePage from '@/pages/TimelinePage'
import BiblePage from '@/pages/BiblePage'
import ComparePage from '@/pages/ComparePage'
import BookPage from '@/pages/BookPage'
import AboutPage from '@/pages/AboutPage'
import FeedbackPage from '@/pages/FeedbackPage'
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
        <Route path="/" element={<ChapterPage />} />
        <Route path="/studies" element={<StudiesPage />} />
        <Route path="/writings" element={<WritingsPage />} />
        <Route path="/writing/:id" element={<WritingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/person/:id" element={<PersonPage />} />
        <Route path="/place/:id" element={<PlacePage />} />
        <Route path="/topic/:id" element={<TopicPage />} />
        <Route path="/event/:id" element={<EventPage />} />
        <Route path="/study/:id" element={<StudyPage />} />
        <Route path="/book/:osis" element={<BookPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/bible" element={<BiblePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}
