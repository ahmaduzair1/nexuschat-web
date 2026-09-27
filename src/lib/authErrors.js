/** Map Firebase Auth error codes to user-friendly messages. */
export function authErrorMessage(err) {
  const code = err?.code || '';
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/invalid-credential': 'Incorrect email or password. Check your credentials and try again.',
    'auth/user-not-found': 'No account found with that email. Create an account first.',
    'auth/wrong-password': 'Incorrect password. Try again or reset your password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/missing-email': 'Please enter your email address.',
    'auth/missing-password': 'Please enter your password.',
    'auth/operation-not-allowed':
      'Email/password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.',
    'auth/requires-recent-login': 'Please sign in again to complete this action.',
  };
  if (map[code]) return map[code];
  if (err?.message && !err.message.startsWith('Firebase:')) return err.message;
  return 'Something went wrong. Please try again.';
}
