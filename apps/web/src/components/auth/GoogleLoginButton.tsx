'use client';

import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface Props {
  label: 'signin_with' | 'signup_with' | 'continue_with';
  onSuccess: (idToken: string) => void;
  onError?: () => void;
}

export function GoogleLoginButton({ label, onSuccess, onError }: Props) {
  const handleSuccess = (response: CredentialResponse) => {
    if (response.credential) {
      onSuccess(response.credential); // credential is the id_token JWT
    } else {
      onError?.();
    }
  };

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={onError}
        theme="outline"
        shape="rectangular"
        text={label}
        size="large"
        width="360"
        logo_alignment="left"
        useOneTap={false}
      />
    </div>
  );
}
