import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Music, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, requestPasswordReset, updatePassword, user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmPassword, setConfirmPassword] = useState('');

  // Enter reset mode automatically if Supabase sent us back with a recovery token
  useEffect(() => {
    if (searchParams.get('type') === 'recovery') {
      setMode('reset');
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode === 'reset' && user?.email) {
      setEmail(user.email);
    }
  }, [mode, user?.email]);

  // Redirect if already logged in
  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (mode === 'reset') {
      const result = resetSchema.safeParse({ password, confirm: confirmPassword });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    } else if (mode === 'forgot') {
      if (!email) {
        setErrors({ email: 'Email is required' });
        return;
      }
    } else {
      // Validate signup/signin
      const result = authSchema.safeParse({
        email,
        password,
        displayName: mode === 'signup' ? displayName : undefined,
      });

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('Welcome back!');
        navigate('/');
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('Account created! You can now sign in.');
        navigate('/');
      } else if (mode === 'forgot') {
        const { error } = await requestPasswordReset(email);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Password reset email sent. Check your inbox.');
        setMode('signin');
      } else if (mode === 'reset') {
        const { error } = await updatePassword(password);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Password updated. You can now sign in.');
        setMode('signin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Background gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 lg:py-16">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-6 left-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-3 rounded-2xl bg-primary/20 glow-primary">
            <Music className="w-8 h-8 lg:w-10 lg:h-10 text-primary" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold gradient-text">HarmonyFeed</h1>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md lg:max-w-lg glass-strong rounded-3xl p-8 lg:p-10"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-2">
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create an account'}
            {mode === 'forgot' && 'Forgot password'}
            {mode === 'reset' && 'Set a new password'}
          </h2>
          <p className="text-muted-foreground text-center mb-6 lg:text-lg">
            {mode === 'signin' && 'Sign in to discover your harmonic matches'}
            {mode === 'signup' && 'Start discovering music through harmony'}
            {mode === 'forgot' && 'Enter your email and we will send a reset link'}
            {mode === 'reset' && 'Choose a new password to secure your account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-muted/50"
                />
                {errors.displayName && (
                  <p className="text-xs text-destructive">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/50"
                disabled={mode === 'reset'}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            {mode === 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-muted/50"
                />
                {errors.confirm && (
                  <p className="text-xs text-destructive">{errors.confirm}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'signin' && 'Signing in...'}
                  {mode === 'signup' && 'Creating account...'}
                  {mode === 'forgot' && 'Sending reset email...'}
                  {mode === 'reset' && 'Updating password...'}
                </>
              ) : (
                <>
                  {mode === 'signin' && 'Sign in'}
                  {mode === 'signup' && 'Create account'}
                  {mode === 'forgot' && 'Send reset link'}
                  {mode === 'reset' && 'Save new password'}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  <span className="mx-2 text-muted-foreground/60">·</span>
                  <button
                    onClick={() => setMode('forgot')}
                    className="text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                  Already have an account?{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              ) : mode === 'forgot' ? (
                <>
                  Remembered your password?{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-medium"
                  >
                    Back to sign in
                  </button>
                </>
              ) : (
                <>
                  Done resetting?{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-medium"
                  >
                    Return to sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-muted-foreground text-center mt-6 max-w-sm"
        >
          By signing up, you agree that harmonic analysis is probabilistic and may not always be accurate.
        </motion.p>
      </div>
    </div>
  );
}
