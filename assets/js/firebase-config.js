// Firebase Configuration for UhlManagerMember
const firebaseConfig = {
  apiKey: "AIzaSyBKhTCfgat6Jpjgj2BmV_FH7IhacCLx2Cs",
  authDomain: "uhlmanagermember.firebaseapp.com",
  projectId: "uhlmanagermember",
  storageBucket: "uhlmanagermember.firebasestorage.app",
  messagingSenderId: "328825243897",
  appId: "1:328825243897:web:14a0d8c2829a2d574bba28",
  measurementId: "G-9QYPHK5WKM"
};

// Global Firebase Instance setup (Compat SDK)
let db = null;
let auth = null;
let storage = null;

if (typeof firebase !== "undefined") {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();

        // Enable offline persistence for Firestore
        db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not supported by browser');
            }
        });
        console.log("🔥 Firebase initialized successfully for project:", firebaseConfig.projectId);
    } catch (e) {
        console.error("Firebase init error:", e);
    }
} else {
    console.warn("⚠️ Firebase SDK script tags not loaded. Running in local fallback mode.");
}

window.ClubFirebase = {
    db,
    auth,
    storage,
    config: firebaseConfig,
    isReady: () => !!db
};
