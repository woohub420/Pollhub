import { Routes, Route } from 'react-router-dom'
import Feed from './pages/Feed.jsx'
import PollPage from './pages/PollPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Feed />} />
      <Route path="/poll/:id" element={<PollPage />} />
    </Routes>
  )
}
