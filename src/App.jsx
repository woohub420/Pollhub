import { Routes, Route } from 'react-router-dom'
import Feed from './pages/Feed.jsx'
import PollPage from './pages/PollPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'
import NotificationSettingsPage from './pages/NotificationSettingsPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import CategoryPage from './pages/CategoryPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Feed />} />
      <Route path="/poll/:id" element={<PollPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/u/:username" element={<UserProfilePage />} />
      <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/c/:slug" element={<CategoryPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}
