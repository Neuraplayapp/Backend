import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'HappyBuilderDB';
const STORE_NAME = 'chunks';
let db: IDBPDatabase;

async function initDB() {
    if (db) return db;
    db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    });
    return db;
}

export async function saveChunk(key: string, data: any) {
    const db = await initDB();
    await db.put(STORE_NAME, data, key);
}

export async function loadChunk(key: string): Promise<any | null> {
    const db = await initDB();
    const data = await db.get(STORE_NAME, key);
    return data || null;
} 