import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CodexArchive } from '../types/codex';
import {
  compactArchiveForStorage,
  createEmptyArchive,
  validateAndNormalizeArchive,
} from '../utils/codexLogic';
import { devLogger } from '../../dev/logger';

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Explicitly enable browserLocalPersistence so user logins are remembered across reloads and site updates
void setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore in environments where persistence is already locked
});

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory (never in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;
let rememberedLoginHint: string | null = null;

const LOCAL_STORAGE_KEY = 'codex_noctis_local_vault_v1';
const IDB_NAME = 'codex_noctis_vault_db';
const IDB_STORE = 'archives';
const IDB_KEY = 'primary_archive';
const IDB_AUTH_KEY = 'active_oauth_session';
// Google OAuth access tokens are valid for 3600s; we consider them fresh for 54 minutes
const TOKEN_TTL_MS = 54 * 60 * 1000;

interface StoredOAuthSession {
  uid: string;
  email: string | null;
  accessToken: string;
  expiresAt: number;
}

function openVaultIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveIndexedDbOAuthSession(
  session: StoredOAuthSession | null
): Promise<void> {
  const db = await openVaultIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      if (session) {
        store.put(session, IDB_AUTH_KEY);
      } else {
        store.delete(IDB_AUTH_KEY);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function loadIndexedDbOAuthSession(
  expectedUid: string
): Promise<string | null> {
  const db = await openVaultIndexedDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_AUTH_KEY);
      req.onsuccess = () => {
        db.close();
        const data = req.result as StoredOAuthSession | undefined;
        if (
          data &&
          data.uid === expectedUid &&
          typeof data.accessToken === 'string' &&
          data.accessToken.length > 0 &&
          typeof data.expiresAt === 'number' &&
          Date.now() < data.expiresAt
        ) {
          resolve(data.accessToken);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      rememberedLoginHint = user.email || null;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        return;
      }

      // Restore unexpired token from IndexedDB vault if the user is still authenticated in Firebase
      const restoredToken = await loadIndexedDbOAuthSession(user.uid);
      if (restoredToken) {
        cachedAccessToken = restoredToken;
        if (onAuthSuccess) onAuthSuccess(user, restoredToken);
        return;
      }

      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure(user);
      }
    } else {
      cachedAccessToken = null;
      rememberedLoginHint = null;
      void saveIndexedDbOAuthSession(null);
      if (onAuthFailure) onAuthFailure(null);
    }
  });
};

export const googleSignIn = async (
  loginHintEmail?: string | null
): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const hint = loginHintEmail || rememberedLoginHint || auth.currentUser?.email;
    if (hint) {
      provider.setCustomParameters({
        login_hint: hint,
      });
    } else {
      provider.setCustomParameters({
        prompt: 'select_account',
      });
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token.');
    }
    cachedAccessToken = credential.accessToken;
    rememberedLoginHint = result.user.email || null;

    await saveIndexedDbOAuthSession({
      uid: result.user.uid,
      email: result.user.email,
      accessToken: cachedAccessToken,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    devLogger.error('googleSignIn', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (auth.currentUser) {
    const restored = await loadIndexedDbOAuthSession(auth.currentUser.uid);
    if (restored) {
      cachedAccessToken = restored;
      return restored;
    }
  }
  return null;
};

export const logout = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
  rememberedLoginHint = null;
  await saveIndexedDbOAuthSession(null);
};

export interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

/**
 * Searches Google Drive for the app's archive file by name.
 */
export async function findDriveArchiveFile(
  fileName: string
): Promise<DriveFileMetadata | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const safeName = fileName.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name = '${safeName}' and trashed = false and mimeType = 'application/json'`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime,size)&pageSize=5`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    void saveIndexedDbOAuthSession(null);
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive search failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { files?: DriveFileMetadata[] };
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Downloads and parses the CodexArchive JSON file from Google Drive.
 */
export async function downloadDriveArchive(
  fileId: string
): Promise<CodexArchive> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    void saveIndexedDbOAuthSession(null);
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    throw new Error(`Failed to download archive from Drive (${res.status})`);
  }

  const raw = await res.json();
  return validateAndNormalizeArchive(raw);
}

/**
 * Creates or updates the CodexArchive JSON file in the user's Google Drive.
 */
export async function uploadDriveArchive(
  archive: CodexArchive,
  fileName: string,
  existingFileId?: string | null
): Promise<DriveFileMetadata> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Codex Noctis Original Character and Location Archive',
  };

  const payload: CodexArchive = {
    ...compactArchiveForStorage(archive, false),
    updatedAt: new Date().toISOString(),
  };

  const boundary = '-------CodexNoctisDriveBoundary7MA4YWxkTrZu0gW';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    closeDelimiter;

  const targetFileId = existingFileId || (await findDriveArchiveFile(fileName))?.id;

  const endpoint = targetFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(targetFileId)}?uploadType=multipart&fields=id,name,modifiedTime,size`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size';

  const method = targetFileId ? 'PATCH' : 'POST';

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`,
    },
    body: multipartBody,
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    void saveIndexedDbOAuthSession(null);
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload archive to Google Drive (${res.status}): ${errText}`);
  }

  return (await res.json()) as DriveFileMetadata;
}

/**
 * Deletes the archive file from Google Drive. Must only be called after explicit user confirmation.
 */
export async function deleteDriveArchiveFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    void saveIndexedDbOAuthSession(null);
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete file from Google Drive (${res.status})`);
  }
}

async function saveIndexedDbVaultArchive(archive: CodexArchive): Promise<void> {
  const db = await openVaultIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(archive, IDB_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function loadIndexedDbVaultArchive(): Promise<CodexArchive | null> {
  const db = await openVaultIndexedDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        db.close();
        if (req.result && typeof req.result === 'object') {
          resolve(validateAndNormalizeArchive(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export function loadLocalVaultArchive(): CodexArchive {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return createEmptyArchive();
    }
    return validateAndNormalizeArchive(JSON.parse(raw));
  } catch (err) {
    devLogger.warn('loadLocalVaultArchive', 'Falling back to empty archive', err);
    return createEmptyArchive();
  }
}

export function saveLocalVaultArchive(archive: CodexArchive): void {
  const compacted = compactArchiveForStorage(archive, false);
  // Always persist the full archive (including all portraits, backgrounds, and gallery photos) to IndexedDB
  void saveIndexedDbVaultArchive(compacted);

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(compacted));
  } catch {
    // If localStorage hits the browser's 5MB quota, store a lightweight metadata snapshot in localStorage
    // while IndexedDB and Google Drive retain all full-resolution images.
    try {
      const metadataOnly = compactArchiveForStorage(archive, true);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(metadataOnly));
    } catch {
      // Ignore if localStorage is completely full
    }
  }
}
