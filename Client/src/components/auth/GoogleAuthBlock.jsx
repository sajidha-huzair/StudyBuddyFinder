import React, { useRef, useEffect, useState } from 'react';
import { useGoogleOAuth } from '@react-oauth/google';
import { isGoogleAuthEnabled } from '../../config/env';

let googleIdentityInitialized = false;

const GoogleAuthBlock = ({ mode = 'signin', onSuccess }) => {
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const [btnWidth, setBtnWidth] = useState(360);

  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!wrapRef.current) return;
    setBtnWidth(Math.min(400, Math.max(240, wrapRef.current.offsetWidth)));
  }, []);

  useEffect(() => {
    if (!scriptLoadedSuccessfully || !clientId || !btnRef.current) return undefined;

    const google = window.google?.accounts?.id;
    if (!google) return undefined;

    if (!googleIdentityInitialized) {
      google.initialize({
        client_id: clientId,
        callback: (credentialResponse) => {
          if (credentialResponse?.credential) {
            onSuccessRef.current(credentialResponse.credential);
          }
        },
      });
      googleIdentityInitialized = true;
    }

    btnRef.current.innerHTML = '';
    google.renderButton(btnRef.current, {
      theme: 'outline',
      size: 'large',
      width: btnWidth,
      text: mode === 'signup' ? 'signup_with' : 'continue_with',
    });

    return undefined;
  }, [scriptLoadedSuccessfully, clientId, btnWidth, mode]);

  if (!isGoogleAuthEnabled) return null;

  return (
    <div className="google-auth-block">
      <div ref={wrapRef} className="google-btn-wrap">
        <div ref={btnRef} className="google-btn-mount" />
      </div>
      {import.meta.env.DEV && (
        <p className="text-muted google-dev-hint" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Google button requires <code>http://localhost:3000</code> in Google Cloud → Credentials → Authorized JavaScript origins.
        </p>
      )}
      <div className="auth-divider">
        <span>{mode === 'signup' ? 'or sign up with email' : 'or sign in with email'}</span>
      </div>
    </div>
  );
};

export default GoogleAuthBlock;
