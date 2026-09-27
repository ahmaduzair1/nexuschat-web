import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function Register() {
  const { user, loading, register, resendVerification, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [info, setInfo] = useState('');
  const [verificationSent, setVerificationSent] = useState(true);
  const [verificationError, setVerificationError] = useState('');

  if (loading) return <LoadingScreen />;
  if (user && !awaitingVerify && !registered) return <Navigate to="/chats" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setVerificationError('');
    setBusy(true);
    setAwaitingVerify(true);
    try {
      const result = await register(email, password, name);
      setVerificationSent(result.verificationSent);
      if (!result.verificationSent) {
        setVerificationError(
          result.verificationError ||
            'Account created but verification email failed to send.',
        );
      }
      setRegistered(true);
    } catch (err) {
      setAwaitingVerify(false);
      let msg = err.message || 'Registration failed';
      if (err.code === 'auth/operation-not-allowed') {
        msg =
          'Email/Password sign-in is disabled. In Firebase Console → Authentication → Sign-in method, enable Email/Password. See SETUP.md.';
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError('');
    setVerificationError('');
    setBusy(true);
    try {
      await resendVerification();
      setVerificationSent(true);
      setInfo('Verification email sent again. Check inbox and spam.');
    } catch (err) {
      let msg = err.message || 'Could not resend';
      if (err.code === 'auth/operation-not-allowed') {
        msg =
          'Email/Password is not enabled in Firebase Console → Authentication → Sign-in method.';
      }
      setError(msg);
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative z-10 w-full max-w-md rounded-3xl p-8 lg:max-w-lg lg:p-10"
      >
        {registered ? (
          <div className="text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
                verificationSent
                  ? 'border-emerald-primary/30 bg-emerald-subtle'
                  : 'border-gold-accent/40 bg-gold-accent/10'
              }`}
            >
              {verificationSent ? (
                <CheckCircle2 className="text-emerald-primary" size={28} />
              ) : (
                <AlertTriangle className="text-gold-accent" size={28} />
              )}
            </div>
            <h1 className="font-display text-2xl font-bold">
              {verificationSent ? 'Check your email' : 'Account created'}
            </h1>
            {verificationSent ? (
              <p className="mt-3 text-sm text-silver-muted">
                We created your account and sent a verification link to{' '}
                <span className="font-semibold text-silver-text">{email}</span>. Open that email
                and click the link to verify — also check spam/junk if you don&apos;t see it.
              </p>
            ) : (
              <p className="mt-3 text-sm text-silver-muted">
                Your account for{' '}
                <span className="font-semibold text-silver-text">{email}</span> was created, but
                the verification email did not send.
              </p>
            )}

            {verificationError && (
              <div className="mt-4 rounded-2xl border border-gold-accent/30 bg-gold-accent/10 px-4 py-3 text-left text-sm text-gold-accent">
                <p className="font-semibold">Verification email failed</p>
                <p className="mt-1 text-silver-secondary">{verificationError}</p>
                <p className="mt-2 text-xs text-silver-muted">
                  If you see <code className="text-silver-text">auth/operation-not-allowed</code>,
                  enable <strong>Email/Password</strong> in Firebase Console → Authentication →
                  Sign-in method (see SETUP.md).
                </p>
              </div>
            )}

            {info && <p className="mt-3 text-sm text-emerald-glow">{info}</p>}
            {error && <p className="mt-3 text-sm text-error-red">{error}</p>}

            <div className="mt-6 space-y-3">
              <button type="button" disabled={busy} className="btn-primary w-full" onClick={onResend}>
                {busy ? 'Sending…' : 'Resend verification email'}
              </button>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => navigate('/chats')}
              >
                Continue to Nexus
              </button>
              <button
                type="button"
                className="w-full text-sm text-silver-muted hover:text-silver-text"
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
              >
                Back to sign in
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-primary/30 bg-emerald-subtle">
                <MessageCircle className="text-emerald-primary" size={28} />
              </div>
              <h1 className="font-display text-2xl font-bold lg:text-3xl">Join Nexus</h1>
              <p className="mt-1 text-sm text-silver-muted">Create your account</p>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-error-red/30 bg-error-red/10 px-4 py-3 text-sm text-error-red">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-silver-muted">Name</label>
                <input
                  className="input-field"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-silver-muted">Email</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-silver-muted">Password</label>
                <input
                  className="input-field"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Creating…' : 'Create account'}
              </button>
              <p className="text-center text-[11px] text-silver-faint">
                Requires Email/Password enabled in Firebase Console (see SETUP.md).
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-silver-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-primary">
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
