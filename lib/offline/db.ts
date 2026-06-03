"use client";

// Minimal IndexedDB wrapper for storing downloaded trips so they can be
// viewed with no network. No external deps.
import type { TripBundle } from "./types";

const DB_NAME = "getgoin-offline";
const STORE = "trips";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "trip.id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export async function saveTripOffline(bundle: TripBundle): Promise<void> {
  await tx("readwrite", (s) => s.put(bundle));
}

export async function getTripOffline(tripId: string): Promise<TripBundle | null> {
  try {
    const result = await tx<TripBundle | undefined>("readonly", (s) => s.get(tripId));
    return result ?? null;
  } catch {
    return null;
  }
}

export async function listTripsOffline(): Promise<TripBundle[]> {
  try {
    const result = await tx<TripBundle[]>("readonly", (s) => s.getAll());
    return (result ?? []).sort((a, b) => (a.saved_at < b.saved_at ? 1 : -1));
  } catch {
    return [];
  }
}

export async function removeTripOffline(tripId: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(tripId));
}

export function offlineSupported(): boolean {
  return typeof indexedDB !== "undefined";
}
