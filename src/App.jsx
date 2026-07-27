import { Routes, Route } from 'react-router-dom'
import Feed from './pages/Feed.jsx'
import PollPage from './pages/PollPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Feed />} />
      <Route path="/poll/:id" element={<PollPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  )
}
