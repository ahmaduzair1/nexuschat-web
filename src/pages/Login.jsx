import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function Login() {
  const { user, loading, signIn, sendPhoneCode, confirmPhoneCode, resetPassword, resendVerification } =
    useAuth();
  const navigate = useNavigate();
  const blockRedirectRef = useRef(false);
  const [mode, setMode] = useState('email'); // email | phone
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showUnverified, setShowUnverified] = useState(false);
  const [showReset, setShowReset] = useState(false);

  if (loading) return <LoadingScreen />;
  if (user && !showUnverified && !blockRedirectRef.current) {
    return <Navigate to="/chats" replace />;
  }

  async function onEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    blockRedirectRef.current = true;
    try {
      const signedIn = await signIn(email, password);
      if (signedIn && !signedIn.emailVerified) {
        setShowUnverified(true);
        setInfo('Your email is not verified yet. Check your inbox, or resend the verification email.');
        return;
      }
      blockRedirectRef.current = false;
      navigate('/chats');
    } catch (err) {
      blockRedirectRef.current = false;
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email above, then click Forgot password.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      setShowReset(false);
      setInfo('Password reset email sent. Check your inbox (and spam folder).');
    } catch (err) {
      setError(err.message || 'Could not send reset email');
    } finally {
      setBusy(false);
    }
  }

  async function onResendVerification() {
    setError('');
    setBusy(true);
    try {
      await resendVerification();
      setInfo('Verification email sent again. Check your inbox and spam folder.');
    } catch (err) {
      setError(err.message || 'Could not resend verification');
    } finally {
      setBusy(false);
    }
  }

  async function onSendOtp(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const conf = await sendPhoneCode(phone);
      setConfirmation(conf);
    } catch (err) {
      setError(
        err.message ||
          'Phone OTP failed. Enable Phone auth in Firebase and authorize this domain.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmOtp(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await confirmPhoneCode(confirmation, otp, name);
      navigate('/chats');
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 15% 20%, rgba(0,200,150,0.18), transparent), radial-gradient(ellipse 50% 40% at 85% 80%, rgba(255,215,0,0.06), transparent), linear-gradient(160deg, #0A0E1A 0%, #141926 45%, #0A0E1A 100%)',
        }}
      />
      <div id="recaptcha-container" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative z-10 w-full max-w-md rounded-3xl p-8 lg:max-w-lg lg:p-10"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-primary/30 bg-emerald-subtle shadow-emerald">
            <MessageCircle className="text-emerald-primary" size={28} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-silver-text lg:text-4xl">
            Nexus
          </h1>
          <p className="mt-1 text-sm text-silver-muted">Premium messaging · navy & emerald</p>
        </div>

        <div className="mb-6 flex rounded-2xl bg-graphite-light p-1">
          {['email', 'phone'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError('');
                setInfo('');
              }}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition ${
                mode === m
                  ? 'bg-emerald-primary text-navy-bg'
                  : 'text-silver-muted hover:text-silver-text'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-error-red/30 bg-error-red/10 px-4 py-3 text-sm text-error-red">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-2xl border border-emerald-primary/30 bg-emerald-subtle/60 px-4 py-3 text-sm text-emerald-glow">
            {info}
            {showUnverified && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onResendVerification}
                  className="rounded-xl bg-emerald-primary px-3 py-1.5 text-xs font-semibold text-navy-bg"
                >
                  Resend verification
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => navigate('/chats')}
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-silver-text"
                >
                  Continue anyway
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'email' ? (
          showReset ? (
            <form onSubmit={onForgotPassword} className="space-y-4">
              <p className="text-sm text-silver-muted">
                Enter your account email and we&apos;ll send a password reset link.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-silver-muted">Email</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                className="btn-ghost w-full text-sm"
                onClick={() => setShowReset(false)}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={onEmailSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-silver-muted">Email</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-silver-muted">Password</label>
                <div className="relative">
                  <input
                    className="input-field pr-12"
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-muted"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-xl px-2 py-1 text-sm font-semibold text-emerald-primary underline-offset-2 hover:text-emerald-glow hover:underline"
                  onClick={() => {
                    setShowReset(true);
                    setError('');
                    setInfo('');
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )
        ) : !confirmation ? (
          <form onSubmit={onSendOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-silver-muted">
                Phone (E.164)
              </label>
              <input
                className="input-field"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+923001234567"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-silver-muted">
                Display name (new users)
              </label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
            <p className="text-center text-xs text-silver-faint">
              Requires Phone provider + authorized domain in Firebase Console.
            </p>
          </form>
        ) : (
          <form onSubmit={onConfirmOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-silver-muted">
                Verification code
              </label>
              <input
                className="input-field tracking-[0.3em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Verifying…' : 'Verify & continue'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-silver-muted">
          New here?{' '}
          <Link to="/register" className="font-semibold text-emerald-primary hover:text-emerald-glow">
            Create account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
