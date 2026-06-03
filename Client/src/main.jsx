import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { GOOGLE_CLIENT_ID, isGoogleAuthEnabled } from './config/env.js'
import './styles/theme.css'
import './styles/global.css'
import './styles/pages.css'
import './styles/student-ui.css'
import './styles/settings.css'

const googleClientId = GOOGLE_CLIENT_ID

const AppTree = isGoogleAuthEnabled ? (
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {AppTree}
  </React.StrictMode>,
)