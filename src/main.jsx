import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import Header from './components/Header.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import './index.css'

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
