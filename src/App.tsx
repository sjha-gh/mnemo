import { Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "./components/app-layout"
import { LandingPage } from "./pages/landing"
import { DashboardPage } from "./pages/dashboard"
import { SearchPage } from "./pages/search"
import { NoteDetailPage } from "./pages/note-detail"
import { EditorPage } from "./pages/editor"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/new" element={<EditorPage />} />
      <Route path="/note/:id/edit" element={<EditorPage />} />
      <Route element={<AppLayout />}>
        <Route path="/app" element={<DashboardPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/note/:id" element={<NoteDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
