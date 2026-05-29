import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

const appApi = window.CatchReportApp;
let auth = null;
let db = null;
let firebase = null;
let currentUser = null;
let unsubscribe = null;
let cloudReady = false;
let syncTimer = null;

if (!appApi) {
  throw new Error("Catch Report app API was not ready before Firebase sync loaded.");
}

if (window.location.protocol === "file:") {
  appApi.setSyncStatus("Firebase sign-in cannot run from a local file. Open the GitHub Pages app to sync catches.");
  appApi.setAuthControls({ configured: false, signedIn: false });
} else if (!firebaseEnabled || !firebaseConfig.projectId) {
  appApi.setSyncStatus("Cloud sync is off until Firebase is configured.");
  appApi.setAuthControls({ configured: false, signedIn: false });
} else {
  bootFirebase().catch((error) => {
    appApi.setSyncStatus(authErrorMessage(error, "Cloud sync could not load"));
    appApi.setAuthControls({ configured: false, signedIn: false });
  });
}

async function bootFirebase() {
  firebase = await loadFirebaseSdk();
  const firebaseApp = firebase.initializeApp(firebaseConfig);
  auth = firebase.getAuth(firebaseApp);
  db = firebase.getFirestore(firebaseApp);
  await firebase.setPersistence(auth, firebase.browserLocalPersistence);

  appApi.setSyncStatus("Cloud sync ready. Sign in to back up catches.");
  appApi.setAuthControls({
    configured: true,
    signedIn: false,
    signIn,
    linkGoogle,
    signOut: () => firebase.signOut(auth),
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
        linkGoogle,
        signOut: () => firebase.signOut(auth),
      });
      return;
    }

    appApi.setSyncStatus(`${authLabel(user)}. Syncing catches...`);
    appApi.setAuthControls({
      configured: true,
      signedIn: true,
      canLinkGoogle: user.isAnonymous,
      signIn,
      linkGoogle,
      signOut: () => firebase.signOut(auth),
    });
    subscribeToCatches(user.uid);
  });
}

async function signIn() {
  appApi.setSyncStatus("Creating private cloud sync session...");

  try {
    await firebase.signInAnonymously(auth);
  } catch (error) {
    console.error("Firebase sign-in failed", error);
    appApi.setSyncStatus(authErrorMessage(error, "Sign-in failed"));
  }
}

async function linkGoogle() {
  appApi.setSyncStatus("Opening Google to link this catch history...");

  try {
    const user = auth.currentUser || (await firebase.signInAnonymously(auth)).user;
    const provider = googleProvider();
    await firebase.linkWithPopup(user, provider);
  } catch (error) {
    console.error("Firebase Google link failed", error);

    if (error?.code === "auth/credential-already-in-use" || error?.code === "auth/email-already-in-use") {
      appApi.setSyncStatus("That Google account already exists. Signing into it and copying local catches...");
      await firebase.signInWithPopup(auth, googleProvider());
      scheduleSync(appApi.getCatches());
      return;
    }

    appApi.setSyncStatus(authErrorMessage(error, "Google link failed"));
  }
}

function googleProvider() {
  const provider = new firebase.GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function authErrorMessage(error, prefix = "Sign-in failed") {
  const code = error?.code || "";
  const detail = authErrorDetail(error);
  const suffix = code ? ` (${[code, detail].filter(Boolean).join(": ")})` : detail ? ` (${detail})` : "";

  if (code === "auth/unauthorized-domain") {
    return `${prefix}: add caruso1058.github.io to Firebase Auth authorized domains${suffix}.`;
  }

  if (code === "auth/operation-not-allowed") {
    return `${prefix}: enable Anonymous and Google in Firebase Authentication > Sign-in method${suffix}.`;
  }

  if (code === "auth/popup-closed-by-user") {
    return `${prefix}: the Google popup was closed before it finished${suffix}.`;
  }

  if (code === "auth/popup-blocked") {
    return `${prefix}: popup was blocked. Open the app in Safari or Chrome and allow the Google popup${suffix}.`;
  }

  if (code === "auth/operation-not-supported-in-this-environment") {
    return `${prefix}: this browser cannot open the Google popup. Open the app in Safari or Chrome and try again${suffix}.`;
  }

  if (code === "auth/network-request-failed") {
    return `${prefix}: network request did not complete${suffix}.`;
  }

  if (code === "auth/internal-error") {
    return `${prefix}: Firebase Auth internal error. This is usually an auth domain, referrer, or Google provider setup issue${suffix}.`;
  }

  return `${prefix}${suffix}. Check Firebase Auth setup.`;
}

function authLabel(user) {
  if (user.email) return `Signed in as ${user.email}`;
  if (user.isAnonymous) return "Signed in with a private Firebase session";
  return "Signed in";
}

function authErrorDetail(error) {
  const tokenMessage = error?.customData?._tokenResponse?.error?.message;
  const serverMessage = error?.customData?._serverResponse?.error?.message;
  const message = tokenMessage || serverMessage || error?.message || "";
  return message
    .replace(/^Firebase:\s*/i, "")
    .replace(/\s*\([^)]*\)\.?\s*$/g, "")
    .trim();
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
