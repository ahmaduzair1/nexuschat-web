import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Web app config for nexus-chat-1705c.
 * App: "Nexus Chat Web" (1:916385935730:web:ee42b310f9636632086deb)
 * Do not use the Android appId here — Auth on localhost can fail with wrong platform IDs.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyB_-EXUwFGpP3yi2ZG8VDTfJKIAZalZ_kI',
  authDomain: 'nexus-chat-1705c.firebaseapp.com',
  projectId: 'nexus-chat-1705c',
  storageBucket: 'nexus-chat-1705c.firebasestorage.app',
  messagingSenderId: '916385935730',
  appId: '1:916385935730:web:ee42b310f9636632086deb',
  measurementId: 'G-BYRZ9NXJKX',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
