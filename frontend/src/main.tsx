import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "462475636403-rdjo91e0r1a8ci2gd6j7lq7okoru0p1r.apps.googleusercontent.com"; // Replace with actual client ID

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
