/* Excessorize — IndexedDB layer. Local-first (PRD open question #6: local first, sync later).
   Stores: items (closet), looks (saved looks incl. outfit photo blob), kv (prefs). */
(function () {
  'use strict';
  const DB_NAME = 'excessorize';
  const DB_VERSION = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('items')) {
          const s = db.createObjectStore('items', { keyPath: 'id' });
          s.createIndex('category', 'category');
        }
        if (!db.objectStoreNames.contains('looks')) {
          const s = db.createObjectStore('looks', { keyPath: 'id' });
          s.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error);
    }));
  }

  const all = (store) => open().then((db) => new Promise((res, rej) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));

  const get = (store, key) => open().then((db) => new Promise((res, rej) => {
    const r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));

  window.ExDB = {
    items: {
      all: () => all('items'),
      get: (id) => get('items', id),
      put: (item) => tx('items', 'readwrite', (s) => s.put(item)),
      delete: (id) => tx('items', 'readwrite', (s) => s.delete(id)),
      clear: () => tx('items', 'readwrite', (s) => s.clear()),
    },
    looks: {
      all: () => all('looks').then((l) => l.sort((a, b) => b.createdAt - a.createdAt)),
      get: (id) => get('looks', id),
      put: (look) => tx('looks', 'readwrite', (s) => s.put(look)),
      delete: (id) => tx('looks', 'readwrite', (s) => s.delete(id)),
    },
    kv: {
      get: (k) => get('kv', k),
      set: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k)),
    },
    uid: () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
  };
})();
