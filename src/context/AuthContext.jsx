import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { authErrorMessage } from '../lib/authErrors';
import {
  createUserDocument,
  updateUserStatus,
  watchUser,
} from '../services/database';

const AuthContext = createContext(null);
const PROFILE_LOAD_TIMEOUT_MS = 3000;

function verificationActionSettings() {
  return {
    url: `${window.location.origin}/chats`,
    handleCodeInApp: false,
  };
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = () => {};
    let loadTimeout = null;

    const clearLoadTimeout = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }
    };

    const finishLoading = () => {
      clearLoadTimeout();
      setLoading(false);
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      unsubProfile();
      clearLoadTimeout();

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      updateUserStatus(user.uid, true).catch(() => {});

      // Never stick on LoadingScreen if Firestore is slow/broken
      loadTimeout = setTimeout(() => {
        console.warn('[Auth] profile watch timed out; continuing without profile');
        setLoading(false);
      }, PROFILE_LOAD_TIMEOUT_MS);

      unsubProfile = watchUser(
        user.uid,
        (p) => {
          setProfile(p);
          finishLoading();
        },
        (err) => {
          console.error('[Auth] watchUser error:', err);
          setProfile(null);
          finishLoading();
        },
      );
    });

    const onUnload = () => {
      const uid = auth.currentUser?.uid;
      if (uid) updateUserStatus(uid, false).catch(() => {});
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      unsub();
      unsubProfile();
      clearLoadTimeout();
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  const value = useMemo(() => {
    function setupRecaptcha(containerId = 'recaptcha-container') {
      if (window.__nexusRecaptcha) return window.__nexusRecaptcha;
      window.__nexusRecaptcha = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
      return window.__nexusRecaptcha;
    }

    return {
      user: firebaseUser,
      profile,
      loading,
      async signIn(email, password) {
        try {
          const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
          return cred.user;
        } catch (err) {
          throw Object.assign(new Error(authErrorMessage(err)), { code: err.code });
        }
      },
      /**
       * Creates account + profile, then attempts email verification.
       * Returns { user, verificationSent, verificationError? } — account success
       * is never rolled back if only verification fails.
       */
      async register(email, password, name) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await fbUpdateProfile(cred.user, { displayName: name.trim() });
          await createUserDocument({
            uid: cred.user.uid,
            name: name.trim(),
            email: email.trim(),
          });

          try {
            await sendEmailVerification(cred.user, verificationActionSettings());
            return { user: cred.user, verificationSent: true };
          } catch (verifyErr) {
            console.error('[Auth] sendEmailVerification failed:', verifyErr);
            return {
              user: cred.user,
              verificationSent: false,
              verificationError: authErrorMessage(verifyErr),
              verificationCode: verifyErr?.code,
            };
          }
        } catch (err) {
          throw Object.assign(new Error(authErrorMessage(err)), { code: err.code });
        }
      },
      async resetPassword(email) {
        try {
          await sendPasswordResetEmail(auth, email.trim(), verificationActionSettings());
        } catch (err) {
          throw Object.assign(new Error(authErrorMessage(err)), { code: err.code });
        }
      },
      async resendVerification() {
        const user = auth.currentUser;
        if (!user) {
          throw Object.assign(new Error('Sign in first to resend verification.'), {
            code: 'auth/requires-recent-login',
          });
        }
        if (user.emailVerified) {
          throw Object.assign(new Error('Your email is already verified.'), {
            code: 'auth/email-already-verified',
          });
        }
        try {
          await sendEmailVerification(user, verificationActionSettings());
        } catch (err) {
          throw Object.assign(new Error(authErrorMessage(err)), { code: err.code });
        }
      },
      setupRecaptcha,
      async sendPhoneCode(phoneNumber) {
        try {
          const verifier = setupRecaptcha();
          return await signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
        } catch (err) {
          throw Object.assign(
            new Error(
              authErrorMessage(err) ||
                'Phone OTP failed. Enable Phone auth in Firebase and authorize this domain.',
            ),
            { code: err.code },
          );
        }
      },
      async confirmPhoneCode(confirmation, code, name) {
        try {
          const result = await confirmation.confirm(code.trim());
          const displayName =
            result.user.displayName?.trim() || name?.trim() || 'Nexus user';
          if (!result.user.displayName) {
            await fbUpdateProfile(result.user, { displayName });
          }
          await createUserDocument({
            uid: result.user.uid,
            name: displayName,
            phone: result.user.phoneNumber || '',
          });
          return result;
        } catch (err) {
          throw Object.assign(new Error(authErrorMessage(err) || 'Invalid code'), {
            code: err.code,
          });
        }
      },
      async signOut() {
        const uid = auth.currentUser?.uid;
        if (uid) await updateUserStatus(uid, false).catch(() => {});
        if (window.__nexusRecaptcha) {
          try {
            window.__nexusRecaptcha.clear();
          } catch {
            /* ignore */
          }
          window.__nexusRecaptcha = null;
        }
        await fbSignOut(auth);
      },
    };
  }, [firebaseUser, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
