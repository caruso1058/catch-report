import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

const appApi = window.CatchReportApp;
let auth = null;
let db = null;
let firebase = null;
let provider = null;
let currentUser = null;
let unsubscribe = null;
let cloudReady = false;
let syncTimer = null;
let popupFailed = false;

if (!appApi) {
  throw new Error("Catch Report app API was not ready before Firebase sync loaded.");
}

if (!firebaseEnabled || !firebaseConfig.projectId) {
  appApi.setSyncStatus("Cloud sync is off until Firebase is configured.");
  appApi.setAuthControls({ configured: false, signedIn: false });
} else {
  bootFirebase().catch(() => {
    appApi.setSyncStatus("Cloud sync could not load. Check network and Firebase config.");
    appApi.setAuthControls({ configured: false, signedIn: false });
  });
}

async function bootFirebase() {
  firebase = await loadFirebaseSdk();
  provider = new firebase.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const firebaseApp = firebase.initializeApp(firebaseConfig);
  auth = firebase.getAuth(firebaseApp);
  db = firebase.getFirestore(firebaseApp);
  await firebase.setPersistence(auth, firebase.browserLocalPersistence);

  appApi.setSyncStatus("Cloud sync ready. Sign in to back up catches.");
  appApi.setAuthControls({
    configured: true,
    signedIn: false,
    signIn,
    signOut: () => firebase.signOut(auth),
  });

  firebase.getRedirectResult(auth).catch((error) => {
    appApi.setSyncStatus(authErrorMessage(error));
  });

  window.addEventListener("catchreport:local-change", (event) => {
    if (!currentUser || !cloudReady) return;
    scheduleSync(event.detail.catches);
  });

  firebase.onAuthStateChanged(auth, (user) => {
    currentUser = user;
    cloudReady = false;
    if (unsubscribe) unsubscribe();

    if (!user) {
      appApi.setSyncStatus("Cloud sync ready. Sign in to back up catches.");
      appApi.setAuthControls({
        configured: true,
        signedIn: false,
        signIn,
        signOut: () => firebase.signOut(auth),
      });
      return;
    }

    appApi.setSyncStatus(`Signed in as ${user.email || "you"}. Syncing catches...`);
    appApi.setAuthControls({
      configured: true,
      signedIn: true,
      signIn,
      signOut: () => firebase.signOut(auth),
    });
    subscribeToCatches(user.uid);
  });
}

async function signIn() {
  appApi.setSyncStatus("Opening Google sign-in...");

  try {
    await firebase.signInWithPopup(auth, provider);
  } catch (error) {
    if (shouldTryRedirect(error)) {
      popupFailed = true;
      appApi.setSyncStatus("Popup was blocked. Redirecting to Google sign-in...");
      await firebase.signInWithRedirect(auth, provider);
      return;
    }

    appApi.setSyncStatus(authErrorMessage(error));
  }
}

function shouldTryRedirect(error) {
  return (
    !popupFailed &&
    ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error?.code)
  );
}

function authErrorMessage(error) {
  const code = error?.code || "";

  if (code === "auth/unauthorized-domain") {
    return "Sign-in blocked: add caruso1058.github.io to Firebase Auth authorized domains.";
  }

  if (code === "auth/operation-not-allowed") {
    return "Sign-in blocked: enable Google in Firebase Authentication.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "Sign-in was cancelled before it finished.";
  }

  if (code === "auth/popup-blocked") {
    return "Sign-in popup was blocked. Open in Safari and try again.";
  }

  if (code === "auth/network-request-failed") {
    return "Sign-in failed because the network request did not complete.";
  }

  return `Sign-in failed${code ? ` (${code})` : ""}. Check Firebase Auth setup.`;
}

async function loadFirebaseSdk() {
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
  ]);

  return {
    ...appModule,
    ...authModule,
    ...firestoreModule,
  };
}

function subscribeToCatches(uid) {
  unsubscribe = firebase.onSnapshot(
    firebase.collection(db, "users", uid, "catches"),
    (snapshot) => {
      const cloudCatches = snapshot.docs.map((item) => fromFirestore(item.id, item.data()));
      appApi.mergeCloudCatches(cloudCatches);
      cloudReady = true;
      scheduleSync(appApi.getCatches());
      appApi.setSyncStatus(`Cloud sync on. ${appApi.getCatches().length} catches backed up.`);
    },
    () => {
      appApi.setSyncStatus("Cloud sync error. Check Firebase rules and setup.");
    },
  );
}

function scheduleSync(catches) {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => syncLocalToCloud(catches), 650);
}

async function syncLocalToCloud(catches) {
  if (!currentUser) return;

  const catchesRef = firebase.collection(db, "users", currentUser.uid, "catches");
  const existing = await firebase.getDocs(catchesRef);
  const localIds = new Set(catches.map((entry) => entry.id));

  await Promise.all([
    ...existing.docs
      .filter((item) => !localIds.has(item.id))
      .map((item) => firebase.deleteDoc(firebase.doc(db, "users", currentUser.uid, "catches", item.id))),
    ...catches.map((entry) =>
      firebase.setDoc(firebase.doc(db, "users", currentUser.uid, "catches", entry.id), toFirestore(entry, currentUser.uid), {
        merge: true,
      }),
    ),
  ]);

  appApi.setSyncStatus(`Cloud sync on. ${catches.length} catches backed up.`);
}

function toFirestore(entry, uid) {
  return {
    id: String(entry.id),
    owner: uid,
    areaId: String(entry.areaId || ""),
    areaName: String(entry.areaName || ""),
    waterType: String(entry.waterType || ""),
    fish: String(entry.fish || ""),
    lure: String(entry.lure || ""),
    caughtAt: String(entry.caughtAt || ""),
    locationName: String(entry.locationName || ""),
    lat: Number(entry.lat),
    lng: Number(entry.lng),
    notes: String(entry.notes || ""),
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
  };
}

function fromFirestore(id, data) {
  return {
    id,
    areaId: data.areaId || "",
    areaName: data.areaName || "",
    waterType: data.waterType || "",
    fish: data.fish || "",
    lure: data.lure || "",
    caughtAt: data.caughtAt || "",
    locationName: data.locationName || "",
    lat: Number(data.lat),
    lng: Number(data.lng),
    notes: data.notes || "",
    createdAt: data.createdAt || "",
    updatedAt: data.updatedAt || "",
  };
}
