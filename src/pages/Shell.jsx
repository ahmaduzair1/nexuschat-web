import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import DesktopNav from '../components/DesktopNav';
import LoadingScreen from '../components/LoadingScreen';

export default function Shell() {
  const { user, loading, resendVerification } = useAuth();
  const location = useLocation();
  const [bannerMsg, setBannerMsg] = useState('');
  const [bannerBusy, setBannerBusy] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const hideMobileNav =
    location.pathname.startsWith('/chats/') && location.pathname !== '/chats';
  const needsVerify = user.email && !user.emailVerified;

  async function onResend() {
    setBannerBusy(true);
    setBannerMsg('');
    try {
      await resendVerification();
      setBannerMsg('Verification email sent — check inbox and spam.');
    } catch (err) {
      setBannerMsg(err.message || 'Could not resend');
    } finally {
      setBannerBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-full w-full flex-col bg-navy-bg/60">
      {needsVerify && (
        <div className="z-50 flex flex-wrap items-center justify-center gap-3 border-b border-gold-accent/20 bg-gold-accent/10 px-4 py-2 text-center text-sm text-silver-text">
          <span>Check your inbox to verify your email{bannerMsg ? ` · ${bannerMsg}` : ''}.</span>
          <button
            type="button"
            disabled={bannerBusy}
            onClick={onResend}
            className="rounded-lg bg-emerald-primary px-3 py-1 text-xs font-semibold text-navy-bg disabled:opacity-50"
          >
            {bannerBusy ? 'Sending…' : 'Resend verification'}
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <DesktopNav />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
          {!hideMobileNav && <BottomNav />}
        </div>
      </div>
    </div>
  );
}
