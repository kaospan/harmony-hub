import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleSpotifyCallback } from '@/lib/spotify-auth';
import { toast } from 'sonner';

export default function SpotifyCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(error === 'access_denied' 
        ? 'You declined the Spotify connection request.' 
        : `Spotify authorization failed: ${error}`
      );
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Invalid callback parameters');
      return;
    }

    handleSpotifyCallback(code, state)
      .then(() => {
        setStatus('success');
        toast.success('Spotify connected successfully!');
        setTimeout(() => navigate('/profile'), 1500);
      })
      .catch((err) => {
        console.error('Spotify callback error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to connect Spotify');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 mx-auto border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
            <h1 className="text-xl font-bold">Connecting to Spotify...</h1>
            <p className="text-muted-foreground">Please wait while we complete the connection.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-[#1DB954]/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1DB954]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#1DB954]">Connected!</h1>
            <p className="text-muted-foreground">Redirecting to your profile...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-destructive">Connection Failed</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Return to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
