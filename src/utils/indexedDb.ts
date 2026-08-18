import { DataSource, FieldMapping } from '../types';

const DB_NAME = 'event-data-ai';
const DB_VERSION = 1;
const SOURCES_STORE = 'sources';
const MAPPINGS_STORE = 'mappings';
const META_STORE = 'meta';
const WORKSPACE_META_KEY = 'workspace';

export interface PersistedWorkspace {
  sources: DataSource[];
  mappings: FieldMapping[];
  isNormalized: boolean;
}

interface WorkspaceMeta {
  key: string;
  isNormalized: boolean;
  updatedAt: string;
}

let databasePromise: Promise<IDBDatabase> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SOURCES_STORE)) {
        db.createObjectStore(SOURCES_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(MAPPINGS_STORE)) {
        db.createObjectStore(MAPPINGS_STORE, { keyPath: 'storageKey' });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error('Unable to open IndexedDB.'));
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade is blocked by another open tab.');
    };
  });

  return databasePromise;
}

export async function loadWorkspaceFromIndexedDb(): Promise<PersistedWorkspace | null> {
  const db = await openDatabase();
  const transaction = db.transaction([SOURCES_STORE, MAPPINGS_STORE, META_STORE], 'readonly');
  const transactionDone = transactionToPromise(transaction);

  const sourcesRequest = transaction.objectStore(SOURCES_STORE).getAll();
  const mappingsRequest = transaction.objectStore(MAPPINGS_STORE).getAll();
  const metaRequest = transaction.objectStore(META_STORE).get(WORKSPACE_META_KEY);

  const [sources, storedMappings, meta] = await Promise.all([
    requestToPromise(sourcesRequest),
    requestToPromise(mappingsRequest),
    requestToPromise(metaRequest),
  ]);

  await transactionDone;

  if (!sources.length) return null;

  const mappings = (storedMappings as Array<FieldMapping & { storageKey?: string }>).map(
    ({ storageKey: _storageKey, ...mapping }) => mapping as FieldMapping
  );

  return {
    sources: sources as DataSource[],
    mappings,
    isNormalized: Boolean((meta as WorkspaceMeta | undefined)?.isNormalized),
  };
}

async function writeWorkspace(workspace: PersistedWorkspace): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction([SOURCES_STORE, MAPPINGS_STORE, META_STORE], 'readwrite');
  const transactionDone = transactionToPromise(transaction);
  const sourcesStore = transaction.objectStore(SOURCES_STORE);
  const mappingsStore = transaction.objectStore(MAPPINGS_STORE);
  const metaStore = transaction.objectStore(META_STORE);

  sourcesStore.clear();
  mappingsStore.clear();

  workspace.sources.forEach((source) => {
    sourcesStore.put(source);
  });

  workspace.mappings.forEach((mapping) => {
    mappingsStore.put({
      ...mapping,
      storageKey: `${mapping.sourceId}::${mapping.sourceField}`,
    });
  });

  const meta: WorkspaceMeta = {
    key: WORKSPACE_META_KEY,
    isNormalized: workspace.isNormalized,
    updatedAt: new Date().toISOString(),
  };
  metaStore.put(meta);

  await transactionDone;
}

export function saveWorkspaceToIndexedDb(workspace: PersistedWorkspace): Promise<void> {
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(() => writeWorkspace(workspace));

  return saveQueue;
}

export async function clearWorkspaceFromIndexedDb(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction([SOURCES_STORE, MAPPINGS_STORE, META_STORE], 'readwrite');
  const transactionDone = transactionToPromise(transaction);

  transaction.objectStore(SOURCES_STORE).clear();
  transaction.objectStore(MAPPINGS_STORE).clear();
  transaction.objectStore(META_STORE).clear();

  await transactionDone;
}
