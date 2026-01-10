
import { Stamp, Collection } from '../types';

const DB_NAME = 'StamplicityDB';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('stamps')) {
                db.createObjectStore('stamps', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('collections')) {
                db.createObjectStore('collections', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
}

export async function saveStamp(stamp: Stamp): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('stamps', 'readwrite');
        const store = transaction.objectStore('stamps');
        const request = store.put(stamp);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getAllStamps(): Promise<Stamp[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('stamps', 'readonly');
        const store = transaction.objectStore('stamps');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteStamp(id: number): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('stamps', 'readwrite');
        const store = transaction.objectStore('stamps');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function saveCollections(collections: Collection[]): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('collections', 'readwrite');
        const store = transaction.objectStore('collections');
        store.clear(); // Overwrite with current state
        for (const collection of collections) {
            store.put(collection);
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getAllCollections(): Promise<Collection[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('collections', 'readonly');
        const store = transaction.objectStore('collections');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
