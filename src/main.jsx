import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import posthog from 'posthog-js'
import App from './App.jsx'
import Header from './components/Header.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import './index.css'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
