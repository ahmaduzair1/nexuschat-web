# Nexus Chat Web — Firebase setup

Project: **nexus-chat-1705c**  
Web app config is in `src/firebase.js`.

## Enable Email/Password (required for verification + reset emails)

If signup fails with `auth/operation-not-allowed`, or verification/reset emails never send, Email/Password is disabled.

### Exact Console clicks

1. Open [Firebase Console](https://console.firebase.google.com/) → project **Nexus Chat** (`nexus-chat-1705c`).
2. Left sidebar → **Build** → **Authentication**.
3. If prompted, click **Get started**.
4. Open the **Sign-in method** tab.
5. Under **Sign-in providers**, click **Email/Password**.
6. Turn **Enable** **ON** (first toggle).
7. Leave **Email link (passwordless sign-in)** **OFF** unless you specifically want magic links (this app uses password + `sendEmailVerification`, not Email Link).
8. Click **Save**.

### Authorized domains

1. Still in **Authentication** → **Settings** (or **Settings** tab).
2. Under **Authorized domains**, ensure these exist:
   - `localhost`
   - your production host (if any)
3. Add a domain with **Add domain** if missing.

### Templates (optional but useful)

1. **Authentication** → **Templates**.
2. Confirm **Email address verification** and **Password reset** templates are active.
3. Optionally customize the sender name / reply-to.

### What the app calls

| Action | Firebase API |
|--------|----------------|
| Register | `createUserWithEmailAndPassword` then `sendEmailVerification` |
| Resend verify | `sendEmailVerification` |
| Forgot password | `sendPasswordResetEmail` |

If Email/Password is disabled:

- `createUserWithEmailAndPassword` → **`auth/operation-not-allowed`**
- `sendEmailVerification` / `sendPasswordResetEmail` can also fail with **`auth/operation-not-allowed`** or related auth errors

Email Link (passwordless) is **not** required for this app.

### After enabling

1. Restart the Vite app (`npm run dev`).
2. Register a new account — you should see “Check your email”.
3. Check inbox **and spam**.
4. If the UI shows “Verification email failed”, read the exact message and fix Console settings above.
