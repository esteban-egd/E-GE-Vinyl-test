"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name4 in all)
    __defProp(target, name4, { get: all[name4], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../StreamingCore-Client/src/adapters/shared/adapterRegistry.ts
var createBoundGuard;
var init_adapterRegistry = __esm({
  "../../StreamingCore-Client/src/adapters/shared/adapterRegistry.ts"() {
    "use strict";
    createBoundGuard = () => {
      let bound = false;
      return {
        bind: () => {
          if (bound) return false;
          bound = true;
          return true;
        },
        dispose: () => {
          if (!bound) return false;
          bound = false;
          return true;
        },
        isBound: () => bound
      };
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/keyValueStorage/index.ts
var keyValueStorage_exports = {};
__export(keyValueStorage_exports, {
  createStorage: () => createStorage,
  deleteItem: () => deleteItem,
  deleteStorage: () => deleteStorage,
  disposeKeyValueStorageAdapter: () => disposeKeyValueStorageAdapter,
  getItem: () => getItem,
  initKeyValueStorageAdapter: () => initKeyValueStorageAdapter,
  setItem: () => setItem
});
var import_electron_store, import_electron2, stores, guard, filenamePrefix, filenameForStorage, DELETED, mirrors, pending, flushTimer, getStore, getMirror, flush, schedule, createStorage, setItem, getItem, deleteItem, deleteStorage, initKeyValueStorageAdapter, disposeKeyValueStorageAdapter;
var init_keyValueStorage = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/keyValueStorage/index.ts"() {
    "use strict";
    import_electron_store = null;
    import_electron2 = require("electron");
    init_adapterRegistry();
    stores = /* @__PURE__ */ new Map();
    guard = createBoundGuard();
    filenamePrefix = "";
    filenameForStorage = (storage) => filenamePrefix ? `${filenamePrefix}_${storage}` : storage;
    DELETED = Symbol("deleted");
    mirrors = /* @__PURE__ */ new Map();
    pending = /* @__PURE__ */ new Map();
    getStore = (storage) => {
      let store = stores.get(storage);
      if (!store) {
        store = new import_electron_store.default({ name: filenameForStorage(storage), clearInvalidConfig: true });
        stores.set(storage, store);
        mirrors.set(storage, new Map(Object.entries(store.store ?? {})));
      }
      return store;
    };
    getMirror = (storage) => {
      getStore(storage);
      return mirrors.get(storage);
    };
    flush = () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = void 0;
      }
      if (pending.size === 0) return;
      for (const [storage, changes] of pending) {
        try {
          const store = getStore(storage);
          const next = { ...store.store ?? {} };
          for (const [key, value] of changes) {
            if (value === DELETED) delete next[key];
            else next[key] = value;
          }
          store.store = next;
        } catch (err) {
          mirrors.delete(storage);
          console.error("[keyValueStorage] flush failed", storage, err);
        }
      }
      pending.clear();
    };
    schedule = (storage, key, value) => {
      let changes = pending.get(storage);
      if (!changes) {
        changes = /* @__PURE__ */ new Map();
        pending.set(storage, changes);
      }
      changes.set(key, value);
      if (!flushTimer) {
        flushTimer = setTimeout(flush, 0);
        flushTimer.unref?.();
      }
    };
    createStorage = (name4) => {
      getStore(name4);
    };
    setItem = (storage, key, value) => {
      const mirror = getMirror(storage);
      if (mirror.has(key) && mirror.get(key) === value) return;
      mirror.set(key, value);
      schedule(storage, key, value);
    };
    getItem = (storage, key, type) => {
      const value = getMirror(storage).get(key);
      if (value === void 0 || value === null) return void 0;
      switch (type) {
        case "boolean":
          if (typeof value === "boolean") return value;
          if (typeof value === "string") return value === "true";
          return Boolean(value);
        case "number": {
          if (typeof value === "number") return value;
          const num = Number(value);
          return isNaN(num) ? void 0 : num;
        }
        case "string":
          return String(value);
      }
    };
    deleteItem = (storage, key) => {
      const mirror = getMirror(storage);
      if (!mirror.has(key)) return;
      mirror.delete(key);
      schedule(storage, key, DELETED);
    };
    deleteStorage = (storage) => {
      const changes = pending.get(storage);
      if (changes) changes.clear();
      pending.delete(storage);
      const store = stores.get(storage);
      if (store) {
        store.clear();
        stores.delete(storage);
      }
      mirrors.delete(storage);
    };
    initKeyValueStorageAdapter = async (ctx) => {
      if (!guard.bind()) return;
      import_electron_store = __toESM(await import("electron-store"));
      filenamePrefix = ctx?.legacyFilenamePrefix ?? "";
      import_electron2.app?.on?.("before-quit", flush);
      import_electron2.app?.on?.("will-quit", flush);
      import_electron2.ipcMain.handle("service:kv:create", (_event, storage) => createStorage(storage));
      import_electron2.ipcMain.handle("service:kv:set", (_event, req) => setItem(req.storage, req.key, req.value));
      import_electron2.ipcMain.handle("service:kv:get", (_event, req) => getItem(req.storage, req.key, req.type));
      import_electron2.ipcMain.handle("service:kv:delete", (_event, req) => deleteItem(req.storage, req.key));
      import_electron2.ipcMain.handle("service:kv:deleteStorage", (_event, storage) => deleteStorage(storage));
    };
    disposeKeyValueStorageAdapter = () => {
      if (!guard.dispose()) return;
      flush();
      import_electron2.app?.removeListener?.("before-quit", flush);
      import_electron2.app?.removeListener?.("will-quit", flush);
      import_electron2.ipcMain.removeHandler("service:kv:create");
      import_electron2.ipcMain.removeHandler("service:kv:set");
      import_electron2.ipcMain.removeHandler("service:kv:get");
      import_electron2.ipcMain.removeHandler("service:kv:delete");
      import_electron2.ipcMain.removeHandler("service:kv:deleteStorage");
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/nosqlStorage/index.ts
var nosqlStorage_exports = {};
__export(nosqlStorage_exports, {
  bulkRemove: () => bulkRemove,
  bulkSet: () => bulkSet,
  clear: () => clear,
  createCollection: () => createCollection,
  disposeNosqlStorageAdapter: () => disposeNosqlStorageAdapter,
  getById: () => getById,
  getByIds: () => getByIds,
  getCount: () => getCount,
  initNosqlStorageAdapter: () => initNosqlStorageAdapter,
  query: () => query,
  remove: () => remove,
  set: () => set
});
var import_electron3, import_fs, import_path, cache, guard2, filenamePrefix2, databaseDirName, getBasePath, getCollectionPath, ensureDirectory, loadCollection, saveCollection, matchesFilters, createCollection, set, bulkSet, getById, getByIds, remove, bulkRemove, clear, query, getCount, initNosqlStorageAdapter, disposeNosqlStorageAdapter;
var init_nosqlStorage = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/nosqlStorage/index.ts"() {
    "use strict";
    import_electron3 = require("electron");
    import_fs = __toESM(require("fs"));
    import_path = __toESM(require("path"));
    init_adapterRegistry();
    cache = /* @__PURE__ */ new Map();
    guard2 = createBoundGuard();
    filenamePrefix2 = "";
    databaseDirName = (database) => filenamePrefix2 ? `${filenamePrefix2}_${database}` : database;
    getBasePath = () => import_path.default.join(import_electron3.app.getPath("userData"), "nosql");
    getCollectionPath = (database, collection) => import_path.default.join(getBasePath(), databaseDirName(database), `${collection}.json`);
    ensureDirectory = (database) => {
      const dirPath = import_path.default.join(getBasePath(), databaseDirName(database));
      if (!import_fs.default.existsSync(dirPath)) {
        import_fs.default.mkdirSync(dirPath, { recursive: true });
      }
    };
    loadCollection = (database, collection) => {
      const dbCache = cache.get(database);
      if (dbCache?.has(collection)) {
        return dbCache.get(collection);
      }
      const filePath = getCollectionPath(database, collection);
      let records = /* @__PURE__ */ new Map();
      if (import_fs.default.existsSync(filePath)) {
        try {
          const data = JSON.parse(import_fs.default.readFileSync(filePath, "utf-8"));
          records = new Map(Object.entries(data));
        } catch (err) {
          console.warn(`[NoSQL Native] Failed to load collection ${database}/${collection}:`, err);
        }
      }
      if (!cache.has(database)) {
        cache.set(database, /* @__PURE__ */ new Map());
      }
      cache.get(database).set(collection, records);
      return records;
    };
    saveCollection = (database, collection) => {
      const records = cache.get(database)?.get(collection);
      if (!records) return;
      ensureDirectory(database);
      const filePath = getCollectionPath(database, collection);
      try {
        import_fs.default.writeFileSync(filePath, JSON.stringify(Object.fromEntries(records), null, 2));
      } catch (err) {
        console.error(`[NoSQL Native] Failed to save collection ${database}/${collection}:`, err);
      }
    };
    matchesFilters = (record, filters) => {
      for (const filter of filters) {
        const value = record[filter.field];
        const filterValue = filter.value;
        const operator = filter.operator || "eq";
        if (Array.isArray(filterValue)) {
          if (!filterValue.includes(value)) {
            return false;
          }
          continue;
        }
        switch (operator) {
          case "eq":
            if (value !== filterValue) return false;
            break;
          case "gt":
            if (typeof value !== "number" || typeof filterValue !== "number" || value <= filterValue) return false;
            break;
          case "gte":
            if (typeof value !== "number" || typeof filterValue !== "number" || value < filterValue) return false;
            break;
          case "lt":
            if (typeof value !== "number" || typeof filterValue !== "number" || value >= filterValue) return false;
            break;
          case "lte":
            if (typeof value !== "number" || typeof filterValue !== "number" || value > filterValue) return false;
            break;
        }
      }
      return true;
    };
    createCollection = (database, collection) => {
      loadCollection(database, collection);
    };
    set = (database, collection, id, record) => {
      const records = loadCollection(database, collection);
      records.set(id, { ...record, id });
      saveCollection(database, collection);
    };
    bulkSet = (database, collection, items) => {
      const records = loadCollection(database, collection);
      for (const item of items) {
        if (item.id) {
          records.set(item.id, item);
        }
      }
      saveCollection(database, collection);
    };
    getById = (database, collection, id) => {
      const records = loadCollection(database, collection);
      return records.get(id) || null;
    };
    getByIds = (database, collection, ids) => {
      const records = loadCollection(database, collection);
      return ids.map((id) => records.get(id) || null);
    };
    remove = (database, collection, id) => {
      const records = loadCollection(database, collection);
      records.delete(id);
      saveCollection(database, collection);
    };
    bulkRemove = (database, collection, ids, filters) => {
      const records = loadCollection(database, collection);
      if (ids) {
        for (const id of ids) {
          records.delete(id);
        }
      } else if (filters) {
        const toDelete = [];
        for (const [id, record] of records) {
          if (matchesFilters(record, filters)) {
            toDelete.push(id);
          }
        }
        for (const id of toDelete) {
          records.delete(id);
        }
      }
      saveCollection(database, collection);
    };
    clear = (database, collection) => {
      const records = loadCollection(database, collection);
      records.clear();
      saveCollection(database, collection);
    };
    query = (request) => {
      const records = loadCollection(request.database, request.collection);
      let results = Array.from(records.values());
      if (request.filters && request.filters.length > 0) {
        results = results.filter((record) => matchesFilters(record, request.filters));
      }
      if (request.sortBy) {
        const sortOrder = request.sortOrder === "desc" ? -1 : 1;
        const sortKey = request.sortBy;
        results.sort((a, b) => {
          const aVal = a[sortKey];
          const bVal = b[sortKey];
          if (aVal === bVal) return 0;
          if (aVal === void 0 || aVal === null) return 1;
          if (bVal === void 0 || bVal === null) return -1;
          return aVal < bVal ? -sortOrder : sortOrder;
        });
      }
      if (request.offset) {
        results = results.slice(request.offset);
      }
      if (request.limit) {
        results = results.slice(0, request.limit);
      }
      return results;
    };
    getCount = (database, collection, filters) => {
      const records = loadCollection(database, collection);
      if (!filters || filters.length === 0) {
        return records.size;
      }
      let count = 0;
      for (const record of records.values()) {
        if (matchesFilters(record, filters)) {
          count++;
        }
      }
      return count;
    };
    initNosqlStorageAdapter = async (ctx) => {
      if (!guard2.bind()) return;
      filenamePrefix2 = ctx?.legacyFilenamePrefix ?? "";
      import_electron3.ipcMain.handle("service:nosql:createCollection", (_event, { database, collection }) => createCollection(database, collection));
      import_electron3.ipcMain.handle("service:nosql:set", (_event, { database, collection, id, record }) => set(database, collection, id, record));
      import_electron3.ipcMain.handle("service:nosql:bulkSet", (_event, { database, collection, records }) => bulkSet(database, collection, records));
      import_electron3.ipcMain.handle("service:nosql:getById", (_event, { database, collection, id }) => getById(database, collection, id));
      import_electron3.ipcMain.handle("service:nosql:getByIds", (_event, { database, collection, ids }) => getByIds(database, collection, ids));
      import_electron3.ipcMain.handle("service:nosql:remove", (_event, { database, collection, id }) => remove(database, collection, id));
      import_electron3.ipcMain.handle("service:nosql:bulkRemove", (_event, { database, collection, ids, filters }) => bulkRemove(database, collection, ids, filters));
      import_electron3.ipcMain.handle("service:nosql:clear", (_event, { database, collection }) => clear(database, collection));
      import_electron3.ipcMain.handle("service:nosql:query", (_event, request) => query(request));
      import_electron3.ipcMain.handle("service:nosql:count", (_event, { database, collection, filters }) => getCount(database, collection, filters));
    };
    disposeNosqlStorageAdapter = () => {
      if (!guard2.dispose()) return;
      import_electron3.ipcMain.removeHandler("service:nosql:createCollection");
      import_electron3.ipcMain.removeHandler("service:nosql:set");
      import_electron3.ipcMain.removeHandler("service:nosql:bulkSet");
      import_electron3.ipcMain.removeHandler("service:nosql:getById");
      import_electron3.ipcMain.removeHandler("service:nosql:getByIds");
      import_electron3.ipcMain.removeHandler("service:nosql:remove");
      import_electron3.ipcMain.removeHandler("service:nosql:bulkRemove");
      import_electron3.ipcMain.removeHandler("service:nosql:clear");
      import_electron3.ipcMain.removeHandler("service:nosql:query");
      import_electron3.ipcMain.removeHandler("service:nosql:count");
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/sqlStorage/index.ts
var sqlStorage_exports = {};
__export(sqlStorage_exports, {
  closeAllSqlDatabases: () => closeAllSqlDatabases,
  closeSqlDatabase: () => closeSqlDatabase,
  disposeSqlStorageAdapter: () => disposeSqlStorageAdapter,
  executeSql: () => executeSql,
  initSqlStorageAdapter: () => initSqlStorageAdapter,
  openSqlDatabase: () => openSqlDatabase
});
var import_node_sqlite, import_electron4, import_path2, import_fs2, databases, guard3, filenamePrefix3, databaseFileName, isReaderStatement, ensureDatabaseDirectory, openSqlDatabase, executeSql, closeSqlDatabase, closeAllSqlDatabases, initSqlStorageAdapter, disposeSqlStorageAdapter;
var init_sqlStorage = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/sqlStorage/index.ts"() {
    "use strict";
    import_node_sqlite = require("node:sqlite");
    import_electron4 = require("electron");
    import_path2 = __toESM(require("path"));
    import_fs2 = __toESM(require("fs"));
    init_adapterRegistry();
    databases = /* @__PURE__ */ new Map();
    guard3 = createBoundGuard();
    filenamePrefix3 = "";
    databaseFileName = (database) => filenamePrefix3 ? `${filenamePrefix3}_${database}` : database;
    isReaderStatement = (sql) => {
      const upper = sql.trimStart().toUpperCase();
      return upper.startsWith("SELECT") || upper.startsWith("PRAGMA") || upper.startsWith("WITH") || upper.startsWith("EXPLAIN");
    };
    ensureDatabaseDirectory = () => {
      const dbDir = import_path2.default.join(import_electron4.app.getPath("userData"), "sql-data");
      if (!import_fs2.default.existsSync(dbDir)) {
        import_fs2.default.mkdirSync(dbDir, { recursive: true });
      }
      return dbDir;
    };
    openSqlDatabase = (name4) => {
      if (databases.has(name4)) return;
      const dbDir = ensureDatabaseDirectory();
      const dbPath = import_path2.default.join(dbDir, `${databaseFileName(name4)}.db`);
      try {
        const db = new import_node_sqlite.DatabaseSync(dbPath, {
          enableForeignKeyConstraints: true
        });
        databases.set(name4, db);
      } catch (err) {
        console.error(`[SQL Native] Failed to open database ${name4}:`, err);
        throw err;
      }
    };
    executeSql = (database, commands, _options) => {
      const db = databases.get(database);
      if (!db) {
        throw new Error(`Database ${database} is not open`);
      }
      if (!commands?.length) {
        return { rowsAffected: 0, rows: [] };
      }
      let totalRowsAffected = 0;
      let lastRows = [];
      for (const command of commands) {
        try {
          const sql = command.sql.trim();
          const stmt = db.prepare(sql);
          const params = command.params ?? [];
          if (isReaderStatement(sql)) {
            lastRows = params.length > 0 ? stmt.all(...params) : stmt.all();
          } else {
            const result = params.length > 0 ? stmt.run(...params) : stmt.run();
            totalRowsAffected += Number(result.changes);
            lastRows = [];
          }
        } catch (err) {
          console.error("[SQL Native] SQL error:", err, command.sql);
          throw err;
        }
      }
      return { rowsAffected: totalRowsAffected, rows: lastRows };
    };
    closeSqlDatabase = (name4) => {
      const db = databases.get(name4);
      if (db) {
        try {
          db.close();
          databases.delete(name4);
        } catch (err) {
          console.error(`[SQL Native] Failed to close database ${name4}:`, err);
          throw err;
        }
      }
    };
    closeAllSqlDatabases = () => {
      for (const [name4, db] of databases) {
        try {
          db.close();
        } catch (err) {
          console.error(`[SQL Native] Failed to close database ${name4}:`, err);
        }
      }
      databases.clear();
    };
    initSqlStorageAdapter = async (ctx) => {
      if (!guard3.bind()) return;
      filenamePrefix3 = ctx?.legacyFilenamePrefix ?? "";
      import_electron4.ipcMain.handle("service:sql:open", (_event, database) => openSqlDatabase(database));
      import_electron4.ipcMain.handle("service:sql:execute", (_event, { database, commands, options }) => executeSql(database, commands, options));
      import_electron4.ipcMain.handle("service:sql:close", (_event, database) => closeSqlDatabase(database));
    };
    disposeSqlStorageAdapter = () => {
      if (!guard3.dispose()) return;
      import_electron4.ipcMain.removeHandler("service:sql:open");
      import_electron4.ipcMain.removeHandler("service:sql:execute");
      import_electron4.ipcMain.removeHandler("service:sql:close");
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/crypto/index.ts
var crypto_exports = {};
__export(crypto_exports, {
  decryptAES256: () => decryptAES256,
  disposeCryptoAdapter: () => disposeCryptoAdapter,
  encryptAES256: () => encryptAES256,
  hash: () => hash,
  hashBuffer: () => hashBuffer,
  initCryptoAdapter: () => initCryptoAdapter,
  pbkdf2: () => pbkdf2,
  randomBytes: () => randomBytes,
  randomBytesHex: () => randomBytesHex,
  xxhashData: () => xxhashData
});
var import_crypto, import_electron5, import_hash_wasm, guard4, deriveAESKeyIV, hash, hashBuffer, xxhashData, randomBytes, randomBytesHex, decryptAES256, encryptAES256, pbkdf2, initCryptoAdapter, disposeCryptoAdapter;
var init_crypto = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/crypto/index.ts"() {
    "use strict";
    import_crypto = __toESM(require("crypto"));
    import_electron5 = require("electron");
    import_hash_wasm = require("hash-wasm");
    init_adapterRegistry();
    guard4 = createBoundGuard();
    deriveAESKeyIV = (keyString, ivString) => {
      const key = import_crypto.default.createHash("sha256").update(keyString).digest();
      const hexBytes = Buffer.from(ivString, "hex");
      const iv = Buffer.alloc(16, 0);
      hexBytes.copy(iv);
      return { key, iv };
    };
    hash = (data, algorithm) => import_crypto.default.createHash(algorithm).update(data).digest("hex");
    hashBuffer = (data, algorithm) => import_crypto.default.createHash(algorithm).update(data).digest("hex");
    xxhashData = async (data, algorithm) => {
      switch (algorithm) {
        case "32":
          return (0, import_hash_wasm.xxhash32)(data);
        case "64":
          return (0, import_hash_wasm.xxhash64)(data);
        case "128":
          return (0, import_hash_wasm.xxhash128)(data);
        default:
          throw new Error(`Unknown xxhash algorithm: ${algorithm}`);
      }
    };
    randomBytes = (size) => import_crypto.default.randomBytes(size);
    randomBytesHex = (size) => import_crypto.default.randomBytes(size).toString("hex");
    decryptAES256 = (encryptedData, keyString, ivString) => {
      const { key, iv } = deriveAESKeyIV(keyString, ivString);
      const decipher = import_crypto.default.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encryptedData, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    };
    encryptAES256 = (data, keyString, ivString) => {
      const { key, iv } = deriveAESKeyIV(keyString, ivString);
      const cipher = import_crypto.default.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(data, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    };
    pbkdf2 = (password, salt, iterations, keylen, digest = "sha256") => new Promise((resolve, reject) => {
      import_crypto.default.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString("hex"));
      });
    });
    initCryptoAdapter = async () => {
      if (!guard4.bind()) return;
      import_electron5.ipcMain.handle(
        "service:crypto:hash",
        (_event, req) => hash(req.data, req.algorithm)
      );
      import_electron5.ipcMain.handle(
        "service:crypto:xxhash",
        async (_event, req) => xxhashData(req.data, req.algorithm)
      );
      import_electron5.ipcMain.handle("service:crypto:randomBytes", (_event, size) => randomBytes(size));
      import_electron5.ipcMain.handle(
        "service:crypto:decryptAES256",
        (_event, req) => decryptAES256(req.data, req.keyString, req.ivString)
      );
    };
    disposeCryptoAdapter = () => {
      if (!guard4.dispose()) return;
      import_electron5.ipcMain.removeHandler("service:crypto:hash");
      import_electron5.ipcMain.removeHandler("service:crypto:xxhash");
      import_electron5.ipcMain.removeHandler("service:crypto:randomBytes");
      import_electron5.ipcMain.removeHandler("service:crypto:decryptAES256");
    };
  }
});

// ../../StreamingCore-Client/node_modules/miniget/dist/index.js
var require_dist = __commonJS({
  "../../StreamingCore-Client/node_modules/miniget/dist/index.js"(exports2, module2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    var http_1 = __importDefault(require("http"));
    var https_1 = __importDefault(require("https"));
    var stream_1 = require("stream");
    var httpLibs = { "http:": http_1.default, "https:": https_1.default };
    var redirectStatusCodes = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
    var retryStatusCodes = /* @__PURE__ */ new Set([429, 503]);
    var requestEvents = ["connect", "continue", "information", "socket", "timeout", "upgrade"];
    var responseEvents = ["aborted"];
    Miniget.MinigetError = class MinigetError extends Error {
      constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
      }
    };
    Miniget.defaultOptions = {
      maxRedirects: 10,
      maxRetries: 2,
      maxReconnects: 0,
      backoff: { inc: 100, max: 1e4 }
    };
    function Miniget(url, options = {}) {
      var _a;
      const opts = Object.assign({}, Miniget.defaultOptions, options);
      const stream = new stream_1.PassThrough({ highWaterMark: opts.highWaterMark });
      stream.destroyed = stream.aborted = false;
      let activeRequest;
      let activeResponse;
      let activeDecodedStream;
      let redirects = 0;
      let retries = 0;
      let retryTimeout;
      let reconnects = 0;
      let contentLength;
      let acceptRanges = false;
      let rangeStart = 0, rangeEnd;
      let downloaded = 0;
      if ((_a = opts.headers) === null || _a === void 0 ? void 0 : _a.Range) {
        let r = /bytes=(\d+)-(\d+)?/.exec(`${opts.headers.Range}`);
        if (r) {
          rangeStart = parseInt(r[1], 10);
          rangeEnd = parseInt(r[2], 10);
        }
      }
      if (opts.acceptEncoding) {
        opts.headers = Object.assign({
          "Accept-Encoding": Object.keys(opts.acceptEncoding).join(", ")
        }, opts.headers);
      }
      const downloadHasStarted = () => activeDecodedStream && downloaded > 0;
      const downloadComplete = () => !acceptRanges || downloaded === contentLength;
      const reconnect = (err) => {
        activeDecodedStream = null;
        retries = 0;
        let inc = opts.backoff.inc;
        let ms = Math.min(inc, opts.backoff.max);
        retryTimeout = setTimeout(doDownload, ms);
        stream.emit("reconnect", reconnects, err);
      };
      const reconnectIfEndedEarly = (err) => {
        if (options.method !== "HEAD" && !downloadComplete() && reconnects++ < opts.maxReconnects) {
          reconnect(err);
          return true;
        }
        return false;
      };
      const retryRequest = (retryOptions) => {
        if (stream.destroyed) {
          return false;
        }
        if (downloadHasStarted()) {
          return reconnectIfEndedEarly(retryOptions.err);
        } else if ((!retryOptions.err || retryOptions.err.message === "ENOTFOUND") && retries++ < opts.maxRetries) {
          let ms = retryOptions.retryAfter || Math.min(retries * opts.backoff.inc, opts.backoff.max);
          retryTimeout = setTimeout(doDownload, ms);
          stream.emit("retry", retries, retryOptions.err);
          return true;
        }
        return false;
      };
      const forwardEvents = (ee, events) => {
        for (let event of events) {
          ee.on(event, stream.emit.bind(stream, event));
        }
      };
      const doDownload = () => {
        let parsed = {}, httpLib;
        try {
          let urlObj = typeof url === "string" ? new URL(url) : url;
          parsed = Object.assign({}, {
            host: urlObj.host,
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search + urlObj.hash,
            port: urlObj.port,
            protocol: urlObj.protocol
          });
          if (urlObj.username) {
            parsed.auth = `${urlObj.username}:${urlObj.password}`;
          }
          httpLib = httpLibs[String(parsed.protocol)];
        } catch (err) {
        }
        if (!httpLib) {
          stream.emit("error", new Miniget.MinigetError(`Invalid URL: ${url}`));
          return;
        }
        Object.assign(parsed, opts);
        if (acceptRanges && downloaded > 0) {
          let start = downloaded + rangeStart;
          let end = rangeEnd || "";
          parsed.headers = Object.assign({}, parsed.headers, {
            Range: `bytes=${start}-${end}`
          });
        }
        if (opts.transform) {
          try {
            parsed = opts.transform(parsed);
          } catch (err) {
            stream.emit("error", err);
            return;
          }
          if (!parsed || parsed.protocol) {
            httpLib = httpLibs[String(parsed === null || parsed === void 0 ? void 0 : parsed.protocol)];
            if (!httpLib) {
              stream.emit("error", new Miniget.MinigetError("Invalid URL object from `transform` function"));
              return;
            }
          }
        }
        const onError = (err) => {
          if (stream.destroyed || stream.readableEnded) {
            return;
          }
          cleanup();
          if (!retryRequest({ err })) {
            stream.emit("error", err);
          } else {
            activeRequest.removeListener("close", onRequestClose);
          }
        };
        const onRequestClose = () => {
          cleanup();
          retryRequest({});
        };
        const cleanup = () => {
          activeRequest.removeListener("close", onRequestClose);
          activeResponse === null || activeResponse === void 0 ? void 0 : activeResponse.removeListener("data", onData);
          activeDecodedStream === null || activeDecodedStream === void 0 ? void 0 : activeDecodedStream.removeListener("end", onEnd);
        };
        const onData = (chunk) => {
          downloaded += chunk.length;
        };
        const onEnd = () => {
          cleanup();
          if (!reconnectIfEndedEarly()) {
            stream.end();
          }
        };
        activeRequest = httpLib.request(parsed, (res) => {
          if (stream.destroyed) {
            return;
          }
          if (redirectStatusCodes.has(res.statusCode)) {
            if (redirects++ >= opts.maxRedirects) {
              stream.emit("error", new Miniget.MinigetError("Too many redirects"));
            } else {
              if (res.headers.location) {
                url = res.headers.location;
              } else {
                let err = new Miniget.MinigetError("Redirect status code given with no location", res.statusCode);
                stream.emit("error", err);
                cleanup();
                return;
              }
              setTimeout(doDownload, parseInt(res.headers["retry-after"] || "0", 10) * 1e3);
              stream.emit("redirect", url);
            }
            cleanup();
            return;
          } else if (retryStatusCodes.has(res.statusCode)) {
            if (!retryRequest({ retryAfter: parseInt(res.headers["retry-after"] || "0", 10) })) {
              let err = new Miniget.MinigetError(`Status code: ${res.statusCode}`, res.statusCode);
              stream.emit("error", err);
            }
            cleanup();
            return;
          } else if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 400)) {
            let err = new Miniget.MinigetError(`Status code: ${res.statusCode}`, res.statusCode);
            if (res.statusCode >= 500) {
              onError(err);
            } else {
              stream.emit("error", err);
            }
            cleanup();
            return;
          }
          activeDecodedStream = res;
          if (opts.acceptEncoding && res.headers["content-encoding"]) {
            for (let enc of res.headers["content-encoding"].split(", ").reverse()) {
              let fn = opts.acceptEncoding[enc];
              if (fn) {
                activeDecodedStream = activeDecodedStream.pipe(fn());
                activeDecodedStream.on("error", onError);
              }
            }
          }
          if (!contentLength) {
            contentLength = parseInt(`${res.headers["content-length"]}`, 10);
            acceptRanges = res.headers["accept-ranges"] === "bytes" && contentLength > 0 && opts.maxReconnects > 0;
          }
          res.on("data", onData);
          activeDecodedStream.on("end", onEnd);
          activeDecodedStream.pipe(stream, { end: !acceptRanges });
          activeResponse = res;
          stream.emit("response", res);
          res.on("error", onError);
          forwardEvents(res, responseEvents);
        });
        activeRequest.on("error", onError);
        activeRequest.on("close", onRequestClose);
        forwardEvents(activeRequest, requestEvents);
        if (stream.destroyed) {
          streamDestroy(...destroyArgs);
        }
        stream.emit("request", activeRequest);
        activeRequest.end();
      };
      stream.abort = (err) => {
        console.warn("`MinigetStream#abort()` has been deprecated in favor of `MinigetStream#destroy()`");
        stream.aborted = true;
        stream.emit("abort");
        stream.destroy(err);
      };
      let destroyArgs = [];
      const streamDestroy = (err) => {
        activeRequest.destroy(err);
        activeDecodedStream === null || activeDecodedStream === void 0 ? void 0 : activeDecodedStream.unpipe(stream);
        activeDecodedStream === null || activeDecodedStream === void 0 ? void 0 : activeDecodedStream.destroy();
        clearTimeout(retryTimeout);
      };
      stream._destroy = (...args) => {
        stream.destroyed = true;
        if (activeRequest) {
          streamDestroy(...args);
        } else {
          destroyArgs = args;
        }
      };
      stream.text = () => new Promise((resolve, reject) => {
        let body = "";
        stream.setEncoding("utf8");
        stream.on("data", (chunk) => body += chunk);
        stream.on("end", () => resolve(body));
        stream.on("error", reject);
      });
      process.nextTick(doDownload);
      return stream;
    }
    module2.exports = Miniget;
  }
});

// ../../StreamingCore-Client/src/factories/eventsBus/eventsBus.ts
var EventsBus;
var init_eventsBus = __esm({
  "../../StreamingCore-Client/src/factories/eventsBus/eventsBus.ts"() {
    "use strict";
    EventsBus = class {
      listeners = /* @__PURE__ */ new Set();
      notify(event) {
        return new Promise((resolve, reject) => {
          const extendedEvent = {
            ...event,
            resolve,
            reject
          };
          for (const listener of this.listeners) {
            listener(extendedEvent);
          }
        });
      }
      addListener(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      }
      dispose() {
        this.listeners.clear();
      }
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/fileSystem/eventsBus/fileSystemEventsBus.ts
var fileSystemEventsBus_default;
var init_fileSystemEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/fileSystem/eventsBus/fileSystemEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    fileSystemEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/fileSystem/index.ts
var fileSystem_exports = {};
__export(fileSystem_exports, {
  appendFile: () => appendFile,
  chunkedDownloadFile: () => chunkedDownloadFile,
  copyFile: () => copyFile,
  disposeFileSystemAdapter: () => disposeFileSystemAdapter,
  downloadFile: () => downloadFile,
  fileExists: () => fileExists,
  fileStat: () => fileStat,
  getMusicMetadata: () => getMusicMetadata,
  initFileSystemAdapter: () => initFileSystemAdapter,
  makeDirectory: () => makeDirectory,
  readDirectory: () => readDirectory,
  readFile: () => readFile,
  stopChunkedDownload: () => stopChunkedDownload,
  stopDownload: () => stopDownload,
  unlinkFile: () => unlinkFile,
  unlinkFiles: () => unlinkFiles,
  writeFile: () => writeFile
});
var import_electron6, import_fs3, import_path3, mm, import_miniget, guard5, basePath, stripFileProtocol, resolvePath, writeFile, appendFile, readFile, fileExists, readDirectory, makeDirectory, unlinkFile, unlinkFiles, copyFile, fileStat, getMusicMetadata, activeDownloads, downloadFile, stopDownload, activeChunkedDownloads, chunkedDownloadFile, stopChunkedDownload, encodeBase64, decodeBase64, initFileSystemAdapter, disposeFileSystemAdapter;
var init_fileSystem = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/fileSystem/index.ts"() {
    "use strict";
    import_electron6 = require("electron");
    import_fs3 = __toESM(require("fs"));
    import_path3 = __toESM(require("path"));
    mm = __toESM(require("music-metadata"));
    import_miniget = __toESM(require_dist());
    init_fileSystemEventsBus();
    init_adapterRegistry();
    guard5 = createBoundGuard();
    basePath = "";
    stripFileProtocol = (p) => p.startsWith("file://") ? p.slice(7) : p;
    resolvePath = (raw) => {
      const stripped = stripFileProtocol(raw);
      if (basePath && !import_path3.default.isAbsolute(stripped)) {
        return import_path3.default.join(basePath, stripped);
      }
      return stripped;
    };
    writeFile = async (filePath, content, encoding) => {
      await import_fs3.default.promises.writeFile(resolvePath(filePath), content, encoding ? { encoding } : void 0);
    };
    appendFile = async (filePath, content, encoding) => {
      const resolved = resolvePath(filePath);
      try {
        await import_fs3.default.promises.appendFile(resolved, content, encoding ? { encoding } : void 0);
      } catch (err) {
        if (err?.code === "ENOENT") {
          await import_fs3.default.promises.mkdir(import_path3.default.dirname(resolved), { recursive: true });
          await import_fs3.default.promises.appendFile(resolved, content, encoding ? { encoding } : void 0);
        } else {
          throw err;
        }
      }
    };
    readFile = async (filePath, encoding) => {
      return await import_fs3.default.promises.readFile(resolvePath(filePath), encoding ? { encoding } : void 0);
    };
    fileExists = async (filePath) => {
      try {
        await import_fs3.default.promises.access(resolvePath(filePath));
        return true;
      } catch {
        return false;
      }
    };
    readDirectory = async (dirPath) => {
      const resolved = resolvePath(dirPath);
      const names = await import_fs3.default.promises.readdir(resolved);
      return await Promise.all(names.map(async (name4) => {
        const full = import_path3.default.join(resolved, name4);
        try {
          const stat = await import_fs3.default.promises.stat(full);
          return { name: name4, path: full, ctime: stat.ctime, mtime: stat.mtime, size: stat.size };
        } catch {
          return { name: name4, path: full, ctime: void 0, mtime: void 0, size: void 0 };
        }
      }));
    };
    makeDirectory = async (dirPath) => {
      await import_fs3.default.promises.mkdir(resolvePath(dirPath), { recursive: true });
    };
    unlinkFile = async (filePath) => {
      await import_fs3.default.promises.rm(resolvePath(filePath), { recursive: true, force: true });
    };
    unlinkFiles = async (filePaths) => {
      await Promise.all(filePaths.map((fp) => import_fs3.default.promises.rm(resolvePath(fp), { recursive: true, force: true }).catch(() => null)));
    };
    copyFile = async (src, dest) => {
      await import_fs3.default.promises.copyFile(resolvePath(src), resolvePath(dest));
    };
    fileStat = async (filePath) => {
      const stat = await import_fs3.default.promises.stat(resolvePath(filePath));
      return { size: stat.size };
    };
    getMusicMetadata = async (filePath) => {
      try {
        const metadata = await mm.parseFile(resolvePath(filePath));
        const pictureBuf = metadata.common.picture?.[0]?.data;
        let picture;
        if (pictureBuf) {
          picture = Buffer.from(pictureBuf).toString("base64");
        }
        const year = metadata.common.year ? String(metadata.common.year) : void 0;
        const duration = metadata.format.duration;
        return {
          ...metadata.common.title !== void 0 && { title: metadata.common.title },
          ...metadata.common.artist !== void 0 && { artist: metadata.common.artist },
          ...metadata.common.album !== void 0 && { album: metadata.common.album },
          ...year !== void 0 && { year },
          ...duration !== void 0 && { duration },
          ...picture !== void 0 && { picture }
        };
      } catch {
        return {};
      }
    };
    activeDownloads = /* @__PURE__ */ new Map();
    downloadFile = (args) => {
      const jobId = args.jobId ?? Date.now() + Math.floor(Math.random() * 1e3);
      const filePath = resolvePath(args.toFile);
      const handle = { aborted: false };
      activeDownloads.set(jobId, handle);
      const promise = (async () => {
        await import_fs3.default.promises.mkdir(import_path3.default.dirname(filePath), { recursive: true });
        return new Promise((resolve, reject) => {
          let bytesWritten = 0;
          const writer = import_fs3.default.createWriteStream(filePath);
          const req = (0, import_miniget.default)(args.fromUrl, { headers: args.headers || {} });
          const cleanup = () => {
            activeDownloads.delete(jobId);
          };
          req.pipe(writer);
          req.on("data", (chunk) => {
            bytesWritten += chunk.length;
            if (args.progress) {
              args.progress({
                jobId,
                contentLength: 0,
                bytesWritten,
                ...args.contentId !== void 0 && { contentId: args.contentId }
              });
            }
          });
          req.on("end", () => {
            cleanup();
            try {
              writer.close();
            } catch {
            }
            resolve({ jobId, statusCode: 200, bytesWritten });
          });
          req.on("error", (err) => {
            try {
              writer.destroy();
            } catch {
            }
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          });
          writer.on("error", (err) => {
            try {
              req.destroy();
            } catch {
            }
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          });
        });
      })();
      return { jobId, promise };
    };
    stopDownload = (jobId) => {
      const handle = activeDownloads.get(jobId);
      if (handle) handle.aborted = true;
    };
    activeChunkedDownloads = /* @__PURE__ */ new Map();
    chunkedDownloadFile = async (args) => {
      const dlChunkSize = args.chunkSize || 1024 * 1024 * 10;
      const filePath = resolvePath(args.toFile);
      const handle = { aborted: false };
      activeChunkedDownloads.set(args.jobId, handle);
      await import_fs3.default.promises.mkdir(import_path3.default.dirname(filePath), { recursive: true });
      return new Promise((resolve, reject) => {
        const writer = import_fs3.default.createWriteStream(filePath);
        let bytesWritten = 0;
        let start = 0;
        let settled = false;
        const cleanup = () => {
          activeChunkedDownloads.delete(args.jobId);
        };
        writer.on("error", (err) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        });
        const downloadChunk = () => {
          if (handle.aborted || start >= args.contentLength) {
            writer.end();
            if (!settled) {
              settled = true;
              cleanup();
              resolve({ jobId: args.jobId, statusCode: 200, bytesWritten });
            }
            return;
          }
          const end = Math.min(start + dlChunkSize, args.contentLength);
          const rangeHeader = `bytes=${start}-${end - 1}`;
          const req = (0, import_miniget.default)(args.fromUrl, {
            headers: { ...args.headers || {}, Range: rangeHeader }
          });
          req.pipe(writer, { end: false });
          req.on("data", (chunk) => {
            bytesWritten += chunk.length;
            if (args.onProgress) {
              args.onProgress({
                jobId: args.jobId,
                contentLength: args.contentLength,
                bytesWritten,
                ...args.contentId !== void 0 && { contentId: args.contentId }
              });
            }
          });
          req.on("end", () => {
            start = end;
            downloadChunk();
          });
          req.on("error", (err) => {
            if (settled) return;
            settled = true;
            try {
              writer.destroy();
            } catch {
            }
            cleanup();
            reject(new Error(`Failed to download chunk: ${err && err.message || String(err)}`));
          });
        };
        downloadChunk();
      });
    };
    stopChunkedDownload = (jobId) => {
      const handle = activeChunkedDownloads.get(jobId);
      if (handle) handle.aborted = true;
    };
    encodeBase64 = (str) => Buffer.from(str, "utf-8").toString("base64");
    decodeBase64 = (str) => Buffer.from(str, "base64").toString("utf-8");
    initFileSystemAdapter = async (ctx) => {
      if (!guard5.bind()) return;
      basePath = ctx?.legacyBasePath ?? "";
      fileSystemEventsBus_default.addListener(async (event) => {
        switch (event.name) {
          case "fileExists":
            try {
              event.resolve(await fileExists(event.data));
            } catch (err) {
              event.reject(err);
            }
            break;
          case "makeDir":
            try {
              await makeDirectory(event.data);
              event.resolve();
            } catch (err) {
              event.reject(err);
            }
            break;
          case "unlinkFile":
            try {
              await unlinkFile(event.data);
              event.resolve();
            } catch (err) {
              event.reject(err);
            }
            break;
          case "unlinkFiles":
            try {
              await unlinkFiles(event.data);
              event.resolve();
            } catch (err) {
              event.reject(err);
            }
            break;
          case "writeFile":
            try {
              await writeFile(event.data.path, event.data.content, event.data.encoding);
              event.resolve();
            } catch (err) {
              event.reject(err);
            }
            break;
          case "appendFile":
            try {
              await appendFile(event.data.path, event.data.content, event.data.encoding);
              event.resolve();
            } catch (err) {
              event.reject(err);
            }
            break;
          case "readFile":
            try {
              const result = await readFile(event.data.path, event.data.encoding);
              event.resolve(typeof result === "string" ? result : result.toString());
            } catch (err) {
              event.reject(err);
            }
            break;
          case "fileStat":
            try {
              event.resolve(await fileStat(event.data));
            } catch (err) {
              event.reject(err);
            }
            break;
          case "readDir":
            try {
              event.resolve(await readDirectory(event.data));
            } catch (err) {
              event.reject(err);
            }
            break;
          case "copyFile":
            try {
              await copyFile(event.data.from, event.data.to);
              event.resolve();
            } catch (err) {
              event.reject(err);
            }
            break;
          case "encodeBase64":
            try {
              event.resolve(encodeBase64(event.data));
            } catch (err) {
              event.reject(err);
            }
            break;
          case "decodeBase64":
            try {
              event.resolve(decodeBase64(event.data));
            } catch (err) {
              event.reject(err);
            }
            break;
          case "getMediaTags":
            try {
              event.resolve(await getMusicMetadata(event.data));
            } catch {
              event.resolve({});
            }
            break;
          case "downloadFile":
            try {
              event.resolve(downloadFile({
                fromUrl: event.data.fromUrl,
                toFile: event.data.toFile,
                ...event.data.headers !== void 0 && { headers: event.data.headers },
                ...event.data.begin !== void 0 && { begin: event.data.begin },
                ...event.data.progress !== void 0 && { progress: event.data.progress },
                ...event.data.contentId !== void 0 && { contentId: event.data.contentId }
              }));
            } catch (err) {
              event.reject(err);
            }
            break;
          case "stopDownload":
            try {
              stopDownload(event.data.jobId);
              event.resolve();
            } catch (err) {
              event.reject(err);
            }
            break;
          case "downloadFileCompleted":
            event.resolve();
            break;
          case "xzDecompressFile":
          case "xzDecompressToString":
            event.reject(new Error("xz decompression is not available in the electron-main adapter"));
            break;
        }
      });
      import_electron6.ipcMain.handle("service:fs:writeFile", (_e, req) => writeFile(req.path, req.content, req.encoding));
      import_electron6.ipcMain.handle("service:fs:appendFile", (_e, req) => appendFile(req.path, req.content, req.encoding));
      import_electron6.ipcMain.handle("service:fs:readFile", async (_e, req) => {
        const result = await readFile(req.path, req.encoding);
        return typeof result === "string" ? result : result.toString();
      });
      import_electron6.ipcMain.handle("service:fs:fileExists", (_e, p) => fileExists(p));
      import_electron6.ipcMain.handle("service:fs:readDir", (_e, p) => readDirectory(p));
      import_electron6.ipcMain.handle("service:fs:makeDir", (_e, p) => makeDirectory(p));
      import_electron6.ipcMain.handle("service:fs:unlinkFile", (_e, p) => unlinkFile(p));
      import_electron6.ipcMain.handle("service:fs:unlinkFiles", (_e, paths) => unlinkFiles(paths));
      import_electron6.ipcMain.handle("service:fs:copyFile", (_e, req) => copyFile(req.from, req.to));
      import_electron6.ipcMain.handle("service:fs:fileStat", (_e, p) => fileStat(p));
      import_electron6.ipcMain.handle("service:fs:getMediaTags", (_e, p) => getMusicMetadata(p));
      import_electron6.ipcMain.handle("service:fs:encodeBase64", (_e, s) => encodeBase64(s));
      import_electron6.ipcMain.handle("service:fs:decodeBase64", (_e, s) => decodeBase64(s));
      import_electron6.ipcMain.handle("service:fs:downloadFile", async (event, req) => {
        const win2 = import_electron6.BrowserWindow.fromWebContents(event.sender);
        const handle = downloadFile({
          ...req,
          progress: (res) => {
            if (win2) win2.webContents.send("service:fs:downloadProgress", { ...res });
          },
          begin: (res) => {
            if (win2) win2.webContents.send("service:fs:downloadBegin", { ...res });
          }
        });
        return await handle.promise;
      });
      import_electron6.ipcMain.handle("service:fs:stopDownload", (_e, req) => {
        stopDownload(req.jobId);
      });
      import_electron6.ipcMain.handle("service:chunked:download", async (event, req) => {
        const win2 = import_electron6.BrowserWindow.fromWebContents(event.sender);
        return chunkedDownloadFile({
          ...req,
          onProgress: (data) => {
            if (win2) win2.webContents.send("service:chunked:downloadProgress", data);
          }
        });
      });
      import_electron6.ipcMain.handle("service:chunked:stopDownload", (_e, req) => {
        stopChunkedDownload(req.jobId);
      });
    };
    disposeFileSystemAdapter = () => {
      if (!guard5.dispose()) return;
      import_electron6.ipcMain.removeHandler("service:fs:writeFile");
      import_electron6.ipcMain.removeHandler("service:fs:appendFile");
      import_electron6.ipcMain.removeHandler("service:fs:readFile");
      import_electron6.ipcMain.removeHandler("service:fs:fileExists");
      import_electron6.ipcMain.removeHandler("service:fs:readDir");
      import_electron6.ipcMain.removeHandler("service:fs:makeDir");
      import_electron6.ipcMain.removeHandler("service:fs:unlinkFile");
      import_electron6.ipcMain.removeHandler("service:fs:unlinkFiles");
      import_electron6.ipcMain.removeHandler("service:fs:copyFile");
      import_electron6.ipcMain.removeHandler("service:fs:fileStat");
      import_electron6.ipcMain.removeHandler("service:fs:getMediaTags");
      import_electron6.ipcMain.removeHandler("service:fs:encodeBase64");
      import_electron6.ipcMain.removeHandler("service:fs:decodeBase64");
      import_electron6.ipcMain.removeHandler("service:fs:downloadFile");
      import_electron6.ipcMain.removeHandler("service:fs:stopDownload");
      import_electron6.ipcMain.removeHandler("service:chunked:download");
      import_electron6.ipcMain.removeHandler("service:chunked:stopDownload");
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/linking/index.ts
var linking_exports = {};
__export(linking_exports, {
  disposeLinkingAdapter: () => disposeLinkingAdapter,
  initLinkingAdapter: () => initLinkingAdapter
});
var guard6, initLinkingAdapter, disposeLinkingAdapter;
var init_linking = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/linking/index.ts"() {
    "use strict";
    init_adapterRegistry();
    guard6 = createBoundGuard();
    initLinkingAdapter = async () => {
      guard6.bind();
    };
    disposeLinkingAdapter = () => {
      guard6.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/sleepTimer/index.ts
var sleepTimer_exports = {};
__export(sleepTimer_exports, {
  disposeSleepTimerAdapter: () => disposeSleepTimerAdapter,
  initSleepTimerAdapter: () => initSleepTimerAdapter
});
var guard7, initSleepTimerAdapter, disposeSleepTimerAdapter;
var init_sleepTimer = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/sleepTimer/index.ts"() {
    "use strict";
    init_adapterRegistry();
    guard7 = createBoundGuard();
    initSleepTimerAdapter = async () => {
      guard7.bind();
    };
    disposeSleepTimerAdapter = () => {
      guard7.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/hapticFeedback/index.ts
var hapticFeedback_exports = {};
__export(hapticFeedback_exports, {
  disposeHapticFeedbackAdapter: () => disposeHapticFeedbackAdapter,
  initHapticFeedbackAdapter: () => initHapticFeedbackAdapter
});
var guard8, initHapticFeedbackAdapter, disposeHapticFeedbackAdapter;
var init_hapticFeedback = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/hapticFeedback/index.ts"() {
    "use strict";
    init_adapterRegistry();
    guard8 = createBoundGuard();
    initHapticFeedbackAdapter = async () => {
      guard8.bind();
    };
    disposeHapticFeedbackAdapter = () => {
      guard8.dispose();
    };
  }
});

// ../../StreamingCore-Client/node_modules/zustand/esm/vanilla.mjs
var createStoreImpl, createStore;
var init_vanilla = __esm({
  "../../StreamingCore-Client/node_modules/zustand/esm/vanilla.mjs"() {
    createStoreImpl = (createState) => {
      let state;
      const listeners = /* @__PURE__ */ new Set();
      const setState = (partial, replace) => {
        const nextState = typeof partial === "function" ? partial(state) : partial;
        if (!Object.is(nextState, state)) {
          const previousState = state;
          state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
          listeners.forEach((listener) => listener(state, previousState));
        }
      };
      const getState = () => state;
      const getInitialState = () => initialState;
      const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };
      const api = { setState, getState, getInitialState, subscribe };
      const initialState = state = createState(setState, getState, api);
      return api;
    };
    createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);
  }
});

// ../../StreamingCore-Client/node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "../../StreamingCore-Client/node_modules/react/cjs/react.production.js"(exports2) {
    "use strict";
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = Symbol.for("react.memo");
    var REACT_LAZY_TYPE = Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function() {
      },
      enqueueReplaceState: function() {
      },
      enqueueSetState: function() {
      }
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component2(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component2.prototype.isReactComponent = {};
    Component2.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component2.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    ComponentDummy.prototype = Component2.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component2.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    function noop() {
    }
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    var Children = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }
    };
    exports2.Activity = REACT_ACTIVITY_TYPE;
    exports2.Children = Children;
    exports2.Component = Component2;
    exports2.Fragment = REACT_FRAGMENT_TYPE;
    exports2.Profiler = REACT_PROFILER_TYPE;
    exports2.PureComponent = PureComponent;
    exports2.StrictMode = REACT_STRICT_MODE_TYPE;
    exports2.Suspense = REACT_SUSPENSE_TYPE;
    exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports2.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }
    };
    exports2.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports2.cacheSignal = function() {
      return null;
    };
    exports2.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports2.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports2.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports2.createRef = function() {
      return { current: null };
    };
    exports2.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports2.isValidElement = isValidElement;
    exports2.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports2.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports2.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports2.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports2.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports2.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports2.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports2.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports2.useDebugValue = function() {
    };
    exports2.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports2.useEffect = function(create2, deps) {
      return ReactSharedInternals.H.useEffect(create2, deps);
    };
    exports2.useEffectEvent = function(callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports2.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports2.useImperativeHandle = function(ref, create2, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create2, deps);
    };
    exports2.useInsertionEffect = function(create2, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create2, deps);
    };
    exports2.useLayoutEffect = function(create2, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create2, deps);
    };
    exports2.useMemo = function(create2, deps) {
      return ReactSharedInternals.H.useMemo(create2, deps);
    };
    exports2.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports2.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports2.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports2.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports2.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports2.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports2.version = "19.2.3";
  }
});

// ../../StreamingCore-Client/node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "../../StreamingCore-Client/node_modules/react/cjs/react.development.js"(exports2, module2) {
    "use strict";
    "production" !== process.env.NODE_ENV && (function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component2.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component2(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name4 = getComponentNameFromType(type);
          return name4 ? "<" + name4 + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          oldElement.props,
          oldElement._owner,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ioInfo = payload._ioInfo;
          null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
          ioInfo = payload._result;
          var thenable = ioInfo();
          thenable.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 1;
                payload._result = moduleObject;
                var _ioInfo = payload._ioInfo;
                null != _ioInfo && (_ioInfo.end = performance.now());
                void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
              }
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 2;
                payload._result = error;
                var _ioInfo2 = payload._ioInfo;
                null != _ioInfo2 && (_ioInfo2.end = performance.now());
                void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            }
          );
          ioInfo = payload._ioInfo;
          if (null != ioInfo) {
            ioInfo.value = thenable;
            var displayName = thenable.displayName;
            "string" === typeof displayName && (ioInfo.name = displayName);
          }
          -1 === payload._status && (payload._status = 0, payload._result = thenable);
        }
        if (1 === payload._status)
          return ioInfo = payload._result, void 0 === ioInfo && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ioInfo
          ), "default" in ioInfo || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ioInfo
          ), ioInfo.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function releaseAsyncTransition() {
        ReactSharedInternals.asyncTransitions--;
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module2 && module2[requireString]).call(
              module2,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component2.prototype.isReactComponent = {};
      Component2.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component2.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      };
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component2.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component2.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      var fnName = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports2.Activity = REACT_ACTIVITY_TYPE;
      exports2.Children = fnName;
      exports2.Component = Component2;
      exports2.Fragment = REACT_FRAGMENT_TYPE;
      exports2.Profiler = REACT_PROFILER_TYPE;
      exports2.PureComponent = PureComponent;
      exports2.StrictMode = REACT_STRICT_MODE_TYPE;
      exports2.Suspense = REACT_SUSPENSE_TYPE;
      exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports2.__COMPILER_RUNTIME = deprecatedAPIs;
      exports2.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports2.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports2.cacheSignal = function() {
        return null;
      };
      exports2.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports2.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          props,
          owner,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key]);
        return props;
      };
      exports2.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports2.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++)
          validateChildKeys(arguments[i]);
        i = {};
        var key = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        key && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return ReactElement(
          type,
          key,
          i,
          getOwner(),
          propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports2.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports2.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name4) {
            ownName = name4;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name4 }), render.displayName = name4);
          }
        });
        return elementType;
      };
      exports2.isValidElement = isValidElement;
      exports2.lazy = function(ctor) {
        ctor = { _status: -1, _result: ctor };
        var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer
        }, ioInfo = {
          name: "lazy",
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error("react-stack-top-frame"),
          debugTask: console.createTask ? console.createTask("lazy()") : null
        };
        ctor._ioInfo = ioInfo;
        lazyType._debugInfo = [{ awaited: ioInfo }];
        return lazyType;
      };
      exports2.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name4) {
            ownName = name4;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name4 }), type.displayName = name4);
          }
        });
        return compare;
      };
      exports2.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
            "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
          ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
        }
      };
      exports2.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports2.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports2.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports2.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports2.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports2.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports2.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports2.useEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useEffect(create2, deps);
      };
      exports2.useEffectEvent = function(callback) {
        return resolveDispatcher().useEffectEvent(callback);
      };
      exports2.useId = function() {
        return resolveDispatcher().useId();
      };
      exports2.useImperativeHandle = function(ref, create2, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create2, deps);
      };
      exports2.useInsertionEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create2, deps);
      };
      exports2.useLayoutEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create2, deps);
      };
      exports2.useMemo = function(create2, deps) {
        return resolveDispatcher().useMemo(create2, deps);
      };
      exports2.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports2.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports2.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports2.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports2.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports2.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports2.version = "19.2.3";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// ../../StreamingCore-Client/node_modules/react/index.js
var require_react = __commonJS({
  "../../StreamingCore-Client/node_modules/react/index.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_production();
    } else {
      module2.exports = require_react_development();
    }
  }
});

// ../../StreamingCore-Client/node_modules/zustand/esm/react.mjs
function useStore(api, selector = identity) {
  const slice = import_react.default.useSyncExternalStore(
    api.subscribe,
    import_react.default.useCallback(() => selector(api.getState()), [api, selector]),
    import_react.default.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  import_react.default.useDebugValue(slice);
  return slice;
}
var import_react, identity, createImpl, create;
var init_react = __esm({
  "../../StreamingCore-Client/node_modules/zustand/esm/react.mjs"() {
    import_react = __toESM(require_react(), 1);
    init_vanilla();
    identity = (arg) => arg;
    createImpl = (createState) => {
      const api = createStore(createState);
      const useBoundStore = (selector) => useStore(api, selector);
      Object.assign(useBoundStore, api);
      return useBoundStore;
    };
    create = ((createState) => createState ? createImpl(createState) : createImpl);
  }
});

// ../../StreamingCore-Client/node_modules/zustand/esm/index.mjs
var init_esm = __esm({
  "../../StreamingCore-Client/node_modules/zustand/esm/index.mjs"() {
    init_vanilla();
    init_react();
  }
});

// ../../StreamingCore-Client/src/factories/zustand/keyValueStorageEventsBus.ts
var keyValueStorageEventsBus_default;
var init_keyValueStorageEventsBus = __esm({
  "../../StreamingCore-Client/src/factories/zustand/keyValueStorageEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    keyValueStorageEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/factories/storageNames.ts
var nameOverrides, resolveName;
var init_storageNames = __esm({
  "../../StreamingCore-Client/src/factories/storageNames.ts"() {
    "use strict";
    nameOverrides = {};
    resolveName = (name4) => {
      return nameOverrides[name4] ?? name4;
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/utils/backgroundTimer.ts
var impl, backgroundSetTimeout, backgroundClearTimeout;
var init_backgroundTimer = __esm({
  "../../StreamingCore-Client/src/core-ts/utils/backgroundTimer.ts"() {
    "use strict";
    impl = null;
    backgroundSetTimeout = (callback, ms) => {
      if (impl) {
        try {
          return { nativeId: impl.setTimeout(callback, ms), jsId: null };
        } catch {
        }
      }
      return { nativeId: null, jsId: setTimeout(callback, ms) };
    };
    backgroundClearTimeout = (handle) => {
      if (!handle) return;
      if (handle.nativeId !== null) {
        try {
          impl?.clearTimeout(handle.nativeId);
        } catch {
        }
        return;
      }
      if (handle.jsId !== null) clearTimeout(handle.jsId);
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/utils/promiseWithTimeout.ts
var PromiseTimeoutError, promiseWithTimeout, promiseWithTimeout_default;
var init_promiseWithTimeout = __esm({
  "../../StreamingCore-Client/src/core-ts/utils/promiseWithTimeout.ts"() {
    "use strict";
    init_backgroundTimer();
    PromiseTimeoutError = class extends Error {
      timeoutMs;
      constructor(timeoutMs) {
        super(`operation timed out after ${timeoutMs}ms`);
        this.name = "PromiseTimeoutError";
        this.timeoutMs = timeoutMs;
      }
    };
    promiseWithTimeout = (promise, timeoutMs) => {
      let timer2;
      const timeout = new Promise((_resolve, reject) => {
        timer2 = backgroundSetTimeout(() => reject(new PromiseTimeoutError(timeoutMs)), timeoutMs);
      });
      return Promise.race([promise, timeout]).finally(() => {
        if (timer2) backgroundClearTimeout(timer2);
      });
    };
    promiseWithTimeout_default = promiseWithTimeout;
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/constants.ts
var LEVEL, LEVEL_CHARS, HIGH_WATERMARK_LINES, MAX_BUFFER_LINES, FLUSH_INTERVAL_MS, FLUSH_TIMEOUT_MS, MAX_BATCH_BYTES, BACKOFF_BASE_MS, BACKOFF_MAX_MS, RETENTION_THROTTLE_MS, LOG_DIR, LOG_FILE_PREFIX, DATA_MAX, STACK_MAX, VALUE_MAX, REDACTED, SENSITIVE_KEY_PATTERN;
var init_constants = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/constants.ts"() {
    "use strict";
    LEVEL = { debug: 0, info: 1, warn: 2, error: 3 };
    LEVEL_CHARS = ["D", "I", "W", "E"];
    HIGH_WATERMARK_LINES = 200;
    MAX_BUFFER_LINES = 5e3;
    FLUSH_INTERVAL_MS = 1500;
    FLUSH_TIMEOUT_MS = 5e3;
    MAX_BATCH_BYTES = 256 * 1024;
    BACKOFF_BASE_MS = 1e3;
    BACKOFF_MAX_MS = 3e4;
    RETENTION_THROTTLE_MS = 20 * 60 * 60 * 1e3;
    LOG_DIR = "/logs";
    LOG_FILE_PREFIX = "app";
    DATA_MAX = 8e3;
    STACK_MAX = 2e3;
    VALUE_MAX = 1e3;
    REDACTED = "[redacted]";
    SENSITIVE_KEY_PATTERN = /(password|passwd|secret|token|authorization|cookie|credential|api[-_]?key|access[-_]?token|refresh[-_]?token|session[-_]?token|bearer|jwt|client[-_]?secret|private[-_]?key|otp)/i;
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/redact.ts
var truncate, errorToObject, safeStringify, serializeData;
var init_redact = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/redact.ts"() {
    "use strict";
    init_constants();
    truncate = (s, max) => s.length > max ? `${s.slice(0, max)}\u2026(+${s.length - max})` : s;
    errorToObject = (err) => ({
      name: err.name,
      message: err.message,
      ...err.stack ? { stack: truncate(err.stack, STACK_MAX) } : {}
    });
    safeStringify = (value) => {
      const seen = /* @__PURE__ */ new WeakSet();
      let out;
      try {
        out = JSON.stringify(value, function replacer(key, val) {
          if (key && SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
          if (typeof val === "bigint") return String(val);
          if (typeof val === "function") return "[Function]";
          if (val instanceof Error) return errorToObject(val);
          if (typeof val === "object" && val !== null) {
            if (seen.has(val)) return "[Circular]";
            seen.add(val);
          }
          return val;
        });
      } catch {
        return "[Unserializable]";
      }
      if (out === void 0) return "";
      return out.length > DATA_MAX ? `${out.slice(0, DATA_MAX)}\u2026(+${out.length - DATA_MAX})` : out;
    };
    serializeData = (data) => {
      if (data === void 0) return "";
      try {
        if (data instanceof Error) return safeStringify(errorToObject(data));
        if (typeof data !== "object" || data === null) return truncate(String(data), VALUE_MAX);
        return safeStringify(data);
      } catch {
        return "[Unserializable]";
      }
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/format.ts
var formatLine;
var init_format = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/format.ts"() {
    "use strict";
    init_constants();
    init_redact();
    formatLine = (t, level, scope, message, data) => {
      const head = `${new Date(t).toISOString()} ${LEVEL_CHARS[level]} ${scope} ${message}`;
      const serialized = serializeData(data);
      return serialized ? `${head} | ${serialized}
` : `${head}
`;
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/categories.ts
var LOG_CATEGORY;
var init_categories = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/categories.ts"() {
    "use strict";
    LOG_CATEGORY = {
      // High-volume systems that earn their own file so they can be enabled in
      // isolation (and cost nothing when off). `embed` is the embed engine's
      // diagnostic bridge — very chatty. Add more here as new chatty areas appear.
      embed: "embed",
      // The playback resolution pipeline (loadPlayerInfos → loadPlayback →
      // resolveTrackSource) plus the trimmed player response. Enabled in
      // isolation to debug a single user's playback failures.
      playback: "playback",
      // The audio transport engine: play/seek/next, queue management and track
      // preloading. Distinct from `playback` (which is source resolution) — enable
      // to debug "skips / won't start / gapless broken".
      player: "player",
      // The HTTP request layer: all outbound API clients (v1/v2, Spotify/Deezer/…),
      // token pools, sessions and web-view fetches. Enable to trace a user's calls.
      network: "network",
      // Library data synchronization: apiV1/apiV2 sync, pull/push changes, nosql
      // cache reconciliation. Enable to debug "my library isn't syncing" reports.
      sync: "sync",
      // Login, session lifecycle, token refresh, logout, identity resolution.
      // Enable to debug login/session failures for a single user.
      auth: "auth",
      // Subscriptions, entitlements, in-app purchase validation/restore.
      purchases: "purchases",
      // Ad loading, rendering and ad-state transitions.
      ads: "ads",
      // Importing tracks/playlists from external clouds (Drive, Dropbox, OneDrive,
      // Box, Yandex) and device files, plus the import queue processor.
      cloudImport: "cloudImport",
      // Search across providers (Spotify/Deezer/TikTok/…), URL resolution, voice
      // search, and short-link expansion.
      search: "search",
      // Offline/local resources: track & thumbnail downloads, local file mapping,
      // filesystem/storage and legacy-id migration.
      offline: "offline",
      // Library CRUD: saved tracks/podcasts, library items, sort/reorder, library
      // imports (Demus/Youtify). Enable to debug wrong/missing library data.
      library: "library",
      // Playlist operations: create/edit/reorder, add/remove items, playlist sort.
      playlists: "playlists",
      // Browse/catalog data: albums, artists, genres, editorials, trending,
      // recommendations, taste profile, media items, tracks and podcasts (shows &
      // episodes). Enable to debug empty/wrong browse & discovery pages.
      catalog: "catalog",
      // One-off data migrations run on app upgrade (redux-persist migration, legacy
      // persist files, zustand/SQL backfills). Enable to debug a broken upgrade.
      migration: "migration",
      // Default bucket: the plain, untagged `app-<date>.log`.
      general: "general"
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/scopeCategories.ts
var SCOPE_CATEGORY, categoryForScope;
var init_scopeCategories = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/scopeCategories.ts"() {
    "use strict";
    init_categories();
    SCOPE_CATEGORY = {
      "addItems": LOG_CATEGORY.catalog,
      "addItemsToPlaylists": LOG_CATEGORY.library,
      "addLinkedMediaItemToMap": LOG_CATEGORY.offline,
      "addLocalMediaItemToMap": LOG_CATEGORY.offline,
      "addLocalThumbToMap": LOG_CATEGORY.offline,
      "addStateEditorials": LOG_CATEGORY.catalog,
      "addStatePlaylists": LOG_CATEGORY.playlists,
      "addToImportQueue": LOG_CATEGORY.cloudImport,
      "addToQueue": LOG_CATEGORY.player,
      "adsState": LOG_CATEGORY.ads,
      "apiV1.authenticate": LOG_CATEGORY.auth,
      "apiV1.autoLogin": LOG_CATEGORY.auth,
      "apiV1.logout": LOG_CATEGORY.auth,
      "apiV1.refreshSession": LOG_CATEGORY.auth,
      "apiV1.reportActivity": LOG_CATEGORY.auth,
      "apiV1.sortPlaylist": LOG_CATEGORY.library,
      "apiV1.sortPlaylistWithItems": LOG_CATEGORY.library,
      "apiV1.sync": LOG_CATEGORY.sync,
      "apiV1": LOG_CATEGORY.network,
      "apiV2.authenticate": LOG_CATEGORY.auth,
      "apiV2.authenticateImpl": LOG_CATEGORY.auth,
      "apiV2.logout": LOG_CATEGORY.auth,
      "apiV2.pull": LOG_CATEGORY.sync,
      "apiV2.push": LOG_CATEGORY.sync,
      "apiV2.refreshSession": LOG_CATEGORY.auth,
      "apiV2.reportActivity": LOG_CATEGORY.auth,
      "apiV2.revokeAllSessions": LOG_CATEGORY.auth,
      "apiV2.sync": LOG_CATEGORY.sync,
      "apiV2": LOG_CATEGORY.network,
      "applyChangesToLibrary": LOG_CATEGORY.sync,
      "artistSpreadOrder": LOG_CATEGORY.player,
      "authenticate": LOG_CATEGORY.auth,
      "backfillFoldedSearchKeys": LOG_CATEGORY.search,
      "backfillMigratedTrackThumbs": LOG_CATEGORY.offline,
      "backfillUserPlaylistItemCreatedAt": LOG_CATEGORY.library,
      "boxAccountLogin": LOG_CATEGORY.cloudImport,
      "boxAccountLogout": LOG_CATEGORY.cloudImport,
      "checkPersistFilesExist": LOG_CATEGORY.migration,
      "checkSavedConsistency": LOG_CATEGORY.library,
      "cleanLibraryStorage": LOG_CATEGORY.offline,
      "cleanupAllSessions": LOG_CATEGORY.network,
      "cleanupPreloads": LOG_CATEGORY.player,
      "cleanupSession": LOG_CATEGORY.network,
      "clearImportQueue": LOG_CATEGORY.cloudImport,
      "clearLibrary": LOG_CATEGORY.library,
      "clearLocalFiles": LOG_CATEGORY.library,
      "clearQueue": LOG_CATEGORY.player,
      "cloudAccountLogin": LOG_CATEGORY.cloudImport,
      "cloudAccountLogout": LOG_CATEGORY.cloudImport,
      "cloudImportQueueProcessor.processItem": LOG_CATEGORY.cloudImport,
      "cloudImportQueueProcessor.refetchCloudFile": LOG_CATEGORY.cloudImport,
      "cloudImportQueueProcessor.startProcessing": LOG_CATEGORY.cloudImport,
      "computeTopResult": LOG_CATEGORY.search,
      "consumeQueueItem": LOG_CATEGORY.player,
      "convertToLibraryPlaylist": LOG_CATEGORY.library,
      "createFileSystemDirectories": LOG_CATEGORY.offline,
      "createLibraryItems": LOG_CATEGORY.library,
      "createPlaylist": LOG_CATEGORY.library,
      "createSimpleObserver": LOG_CATEGORY.catalog,
      "deleteCloudImportedTrack": LOG_CATEGORY.cloudImport,
      "deletePersistFiles": LOG_CATEGORY.migration,
      "dismissPlayer": LOG_CATEGORY.player,
      "downloadThumbs": LOG_CATEGORY.offline,
      "downloadThumbSize": LOG_CATEGORY.offline,
      "downloadTrackLocalResources": LOG_CATEGORY.offline,
      "dropBoxAccountLogin": LOG_CATEGORY.cloudImport,
      "dropBoxAccountLogout": LOG_CATEGORY.cloudImport,
      "dzApiClient": LOG_CATEGORY.network,
      "editPlaylist": LOG_CATEGORY.library,
      "editTrack": LOG_CATEGORY.library,
      "exaClient": LOG_CATEGORY.network,
      "executePreload": LOG_CATEGORY.player,
      "extractClientTokenFromEmbed": LOG_CATEGORY.network,
      "fetchAlbumViaWebView": LOG_CATEGORY.network,
      "fetchArtistViaWebView": LOG_CATEGORY.network,
      "fetchMaintenanceStatus": LOG_CATEGORY.network,
      "fetchMusiPlaylistData": LOG_CATEGORY.playlists,
      "fetchPlayerScript": LOG_CATEGORY.network,
      "fetchPlaylistViaWebView": LOG_CATEGORY.network,
      "fetchTrackViaWebView": LOG_CATEGORY.network,
      "findNextLocalItemOffset": LOG_CATEGORY.player,
      "generateIds": LOG_CATEGORY.catalog,
      "getAddablePlaylistItems": LOG_CATEGORY.library,
      "getAdjacentItems": LOG_CATEGORY.player,
      "getAlbumInternalId": LOG_CATEGORY.catalog,
      "getAllAlbumTracks": LOG_CATEGORY.catalog,
      "getAllArtistTracks": LOG_CATEGORY.catalog,
      "getArtistInternalId": LOG_CATEGORY.catalog,
      "getArtistMixes": LOG_CATEGORY.catalog,
      "getArtistPresences": LOG_CATEGORY.catalog,
      "getBoxCloudFiles": LOG_CATEGORY.cloudImport,
      "getChangesForTable": LOG_CATEGORY.sync,
      "getCloudAccountInfos": LOG_CATEGORY.cloudImport,
      "getCloudFiles": LOG_CATEGORY.cloudImport,
      "getCurrentUser": LOG_CATEGORY.auth,
      "getDailyMixes": LOG_CATEGORY.catalog,
      "getDeletingSongsCount": LOG_CATEGORY.library,
      "getDropBoxCloudFiles": LOG_CATEGORY.cloudImport,
      "getEditorial": LOG_CATEGORY.catalog,
      "getEditorialLibraryProps": LOG_CATEGORY.catalog,
      "getEpisodesProgress": LOG_CATEGORY.catalog,
      "getFromHistory": LOG_CATEGORY.catalog,
      "getFromLibrary": LOG_CATEGORY.catalog,
      "getFromPicks": LOG_CATEGORY.catalog,
      "getGenres": LOG_CATEGORY.catalog,
      "getGoogleDriveCloudFiles": LOG_CATEGORY.cloudImport,
      "getImportedLibraryGroups": LOG_CATEGORY.catalog,
      "getItemFromLocalMediaItemId": LOG_CATEGORY.offline,
      "getLibrary": LOG_CATEGORY.library,
      "getLibrarySize": LOG_CATEGORY.library,
      "getLocalItemsInfo": LOG_CATEGORY.sync,
      "getLocalMediaItemPathFromFileSystem": LOG_CATEGORY.offline,
      "getLocalSource": LOG_CATEGORY.offline,
      "getObservables": LOG_CATEGORY.catalog,
      "getOfflineLibrarySize": LOG_CATEGORY.library,
      "getOneDriveCloudFiles": LOG_CATEGORY.cloudImport,
      "getPendingPushKeys": LOG_CATEGORY.sync,
      "getPlayerScript": LOG_CATEGORY.network,
      "getPlaylist": LOG_CATEGORY.playlists,
      "getPlaylistInternalId": LOG_CATEGORY.playlists,
      "getPlaylistSharableId": LOG_CATEGORY.playlists,
      "getPlaylistsWithEditableItems": LOG_CATEGORY.library,
      "getRecommendedArtists": LOG_CATEGORY.catalog,
      "getSavedPodcastEpisodesPlaylist": LOG_CATEGORY.library,
      "getSavedTracksPlaylist": LOG_CATEGORY.library,
      "getSpotifyAccessToken": LOG_CATEGORY.network,
      "getTrendingAlbums": LOG_CATEGORY.catalog,
      "getTrendingPlaylists": LOG_CATEGORY.catalog,
      "getTrendingPodcasts": LOG_CATEGORY.catalog,
      "getTrendingRadios": LOG_CATEGORY.catalog,
      "getYandexCloudFiles": LOG_CATEGORY.cloudImport,
      "googleDriveAccountLogin": LOG_CATEGORY.cloudImport,
      "googleDriveAccountLogout": LOG_CATEGORY.cloudImport,
      "hydrateLocalMediaItemsMap": LOG_CATEGORY.offline,
      "hydrateLocalThumbsMap": LOG_CATEGORY.offline,
      "identityClient.onBeforeSend": LOG_CATEGORY.network,
      "identityClient.onError": LOG_CATEGORY.network,
      "importCloudFile": LOG_CATEGORY.cloudImport,
      "importDemusPlaylist": LOG_CATEGORY.library,
      "importDeviceFiles": LOG_CATEGORY.cloudImport,
      "importYoutifyPlaylist": LOG_CATEGORY.library,
      "initLocalFilesManager": LOG_CATEGORY.offline,
      "invalidateSpotifyToken": LOG_CATEGORY.network,
      "invalidateTokenFromPool": LOG_CATEGORY.network,
      "legacyIdMigration_collectLibraryRowMappings": LOG_CATEGORY.offline,
      "legacyIdMigration_collectMappingsForTable": LOG_CATEGORY.offline,
      "legacyIdMigration_readFlag": LOG_CATEGORY.offline,
      "legacyIdMigration_writeFlag": LOG_CATEGORY.offline,
      "loadAlbum": LOG_CATEGORY.catalog,
      "loadAlbumFromSql": LOG_CATEGORY.catalog,
      "loadAlbumYoutubeFallback": LOG_CATEGORY.catalog,
      "loadArtist": LOG_CATEGORY.catalog,
      "loadArtistMix": LOG_CATEGORY.playlists,
      "loadArtistMixes": LOG_CATEGORY.catalog,
      "loadDailyMix.getPreviouslyServedItemIds": LOG_CATEGORY.playlists,
      "loadDailyMix": LOG_CATEGORY.playlists,
      "loadDailyMixes": LOG_CATEGORY.catalog,
      "loadDzAlbum": LOG_CATEGORY.catalog,
      "loadDzArtist": LOG_CATEGORY.catalog,
      "loadDzEditorial": LOG_CATEGORY.catalog,
      "loadDzGenres": LOG_CATEGORY.catalog,
      "loadDzPlaylist": LOG_CATEGORY.playlists,
      "loadDzRankings": LOG_CATEGORY.catalog,
      "loadDzTrending": LOG_CATEGORY.catalog,
      "loadEditorial": LOG_CATEGORY.catalog,
      "loadFromDisk": LOG_CATEGORY.network,
      "loadGenres": LOG_CATEGORY.catalog,
      "loadInternalAlbum": LOG_CATEGORY.catalog,
      "loadInternalArtist": LOG_CATEGORY.catalog,
      "loadLibraryPlaylist": LOG_CATEGORY.playlists,
      "loadMoreAlbumTracks": LOG_CATEGORY.catalog,
      "loadMoreArtistTracks": LOG_CATEGORY.catalog,
      "loadMoreDzAlbumTracks": LOG_CATEGORY.catalog,
      "loadMoreDzArtistTracks": LOG_CATEGORY.catalog,
      "loadMoreDzPlaylistItems": LOG_CATEGORY.playlists,
      "loadMoreLibraryPlaylistItems": LOG_CATEGORY.playlists,
      "loadMorePiPodcastEpisodes": LOG_CATEGORY.catalog,
      "loadMorePlaylistItems": LOG_CATEGORY.playlists,
      "loadMorePodcastEpisodes": LOG_CATEGORY.catalog,
      "loadMoreSharedPlaylistItems": LOG_CATEGORY.playlists,
      "loadMoreSpotifyPlaylistItems.loadMoreViaEmbed": LOG_CATEGORY.playlists,
      "loadMoreSpotifyPlaylistItems.loadMoreViaWebView": LOG_CATEGORY.playlists,
      "loadMoreSpotifyPlaylistItems": LOG_CATEGORY.playlists,
      "loadMoreTracksViaWebView": LOG_CATEGORY.network,
      "loadMoreTtAlbumTracks": LOG_CATEGORY.catalog,
      "loadMoreTtPlaylistItems": LOG_CATEGORY.playlists,
      "loadMusiPlaylist": LOG_CATEGORY.playlists,
      "loadPiPodcast": LOG_CATEGORY.catalog,
      "loadPiPodcastEpisode": LOG_CATEGORY.catalog,
      "loadPiTrending": LOG_CATEGORY.catalog,
      "loadPlaylist": LOG_CATEGORY.playlists,
      "loadPlaylistFromSql": LOG_CATEGORY.playlists,
      "loadPlaylistSuggestions": LOG_CATEGORY.playlists,
      "loadPlaylistUpdatesFromSql": LOG_CATEGORY.playlists,
      "loadPodcast": LOG_CATEGORY.catalog,
      "loadPodcastEpisode": LOG_CATEGORY.catalog,
      "loadPodcastFromSql": LOG_CATEGORY.catalog,
      "loadPopularArtists": LOG_CATEGORY.catalog,
      "loadPublicProfile": LOG_CATEGORY.catalog,
      "loadPublicTasteProfile": LOG_CATEGORY.catalog,
      "loadRbTrending": LOG_CATEGORY.catalog,
      "loadRecommandations": LOG_CATEGORY.catalog,
      "loadRelatedArtists": LOG_CATEGORY.catalog,
      "loadSharedPlaylist": LOG_CATEGORY.playlists,
      "loadSpotifyAlbum": LOG_CATEGORY.catalog,
      "loadSpotifyArtist": LOG_CATEGORY.catalog,
      "loadSpotifyPlaylist.loadViaApi": LOG_CATEGORY.playlists,
      "loadSpotifyPlaylist.loadViaWebView": LOG_CATEGORY.playlists,
      "loadSpotifyPlaylist": LOG_CATEGORY.playlists,
      "loadTasteMatch": LOG_CATEGORY.catalog,
      "loadTasteProfile": LOG_CATEGORY.catalog,
      "loadTrending": LOG_CATEGORY.catalog,
      "loadTtAlbum": LOG_CATEGORY.catalog,
      "loadTtArtist": LOG_CATEGORY.catalog,
      "loadTtEditorialMeta": LOG_CATEGORY.catalog,
      "loadTtGenres": LOG_CATEGORY.catalog,
      "loadTtPlaylist": LOG_CATEGORY.playlists,
      "loadTtTrack": LOG_CATEGORY.catalog,
      "loadTtTrending": LOG_CATEGORY.catalog,
      "localResources": LOG_CATEGORY.offline,
      "logout": LOG_CATEGORY.auth,
      "markEndpoint429": LOG_CATEGORY.network,
      "markEpisodeCompleted": LOG_CATEGORY.catalog,
      "migrateLegacyIds": LOG_CATEGORY.offline,
      "oneDriveAccountLogin": LOG_CATEGORY.cloudImport,
      "oneDriveAccountLogout": LOG_CATEGORY.cloudImport,
      "onPathfinderResponse": LOG_CATEGORY.network,
      "onPurchaseSuccess": LOG_CATEGORY.purchases,
      "parseAlbumsFromNosql": LOG_CATEGORY.catalog,
      "parseArtistsFromNosql": LOG_CATEGORY.catalog,
      "parseEditorialFromNosql": LOG_CATEGORY.catalog,
      "parseItemsToNosql": LOG_CATEGORY.catalog,
      "parseMediaItemsFromNosql": LOG_CATEGORY.catalog,
      "parseMediaItemsFromSql": LOG_CATEGORY.catalog,
      "parseMediaItemUpdatesFromSql": LOG_CATEGORY.catalog,
      "parsePlaylistFromSql": LOG_CATEGORY.playlists,
      "parsePlaylistsFromNosql": LOG_CATEGORY.playlists,
      "parsePlaylistsToNosql": LOG_CATEGORY.playlists,
      "parsePodcastEpisodesFromNosql": LOG_CATEGORY.catalog,
      "parsePodcastEpisodesToNosql": LOG_CATEGORY.catalog,
      "parsePodcastsFromNosql": LOG_CATEGORY.catalog,
      "permanentlyDeleteRecords": LOG_CATEGORY.sync,
      "piApiClient": LOG_CATEGORY.network,
      "pinCollectionItems": LOG_CATEGORY.player,
      "pinItemInLibrary": LOG_CATEGORY.library,
      "pinQueueItem": LOG_CATEGORY.player,
      "play": LOG_CATEGORY.player,
      "playerSeek": LOG_CATEGORY.player,
      "Playlist.addItems": LOG_CATEGORY.playlists,
      "Playlist.removeItems": LOG_CATEGORY.playlists,
      "Playlist.removeModel": LOG_CATEGORY.playlists,
      "Playlist.reorderItems": LOG_CATEGORY.playlists,
      "Playlist.updateModel": LOG_CATEGORY.playlists,
      "playNext": LOG_CATEGORY.player,
      "preloadCurrentTrack": LOG_CATEGORY.player,
      "preloadTrack": LOG_CATEGORY.player,
      "prepopulateTokenPool": LOG_CATEGORY.network,
      "processBatch": LOG_CATEGORY.sync,
      "processBatchResults": LOG_CATEGORY.sync,
      "processUpdates": LOG_CATEGORY.catalog,
      "pruneMissingLocalThumbs": LOG_CATEGORY.offline,
      "pullChangesWithResponse": LOG_CATEGORY.sync,
      "rbApiClient.responseError": LOG_CATEGORY.network,
      "readPersistFile": LOG_CATEGORY.migration,
      "reconcileLibraryAfterPull": LOG_CATEGORY.sync,
      "reconcileLocalFlagOnStateTracks": LOG_CATEGORY.offline,
      "refreshDropboxToken": LOG_CATEGORY.cloudImport,
      "refreshGoogleDriveToken": LOG_CATEGORY.cloudImport,
      "refreshLoadedPlaylistsAfterPull": LOG_CATEGORY.sync,
      "refreshOneDriveToken": LOG_CATEGORY.cloudImport,
      "refreshSession": LOG_CATEGORY.auth,
      "releaseSession": LOG_CATEGORY.network,
      "removeFromQueue": LOG_CATEGORY.player,
      "removeItemFromLibrary": LOG_CATEGORY.library,
      "removeItemsFromPlaylist": LOG_CATEGORY.library,
      "removeLocalThumbAllSizesFromMap": LOG_CATEGORY.offline,
      "removeLocalThumbSizeFromMap": LOG_CATEGORY.offline,
      "removeMarkedAsDeletedRecords": LOG_CATEGORY.offline,
      "removeMediaItemFromOffline": LOG_CATEGORY.offline,
      "removePodcastEpisode": LOG_CATEGORY.library,
      "removeThumbs": LOG_CATEGORY.offline,
      "removeTrack": LOG_CATEGORY.library,
      "renameArtist": LOG_CATEGORY.catalog,
      "reorderLibraryItems": LOG_CATEGORY.library,
      "reorderQueue": LOG_CATEGORY.player,
      "reportActivity": LOG_CATEGORY.auth,
      "requestRefreshSession": LOG_CATEGORY.auth,
      "resetLibraryStorage": LOG_CATEGORY.offline,
      "resetStatusWithCheck": LOG_CATEGORY.sync,
      "reshuffleForNewPass": LOG_CATEGORY.player,
      "resolveAddablePlaylistItems": LOG_CATEGORY.library,
      "resolveCurrentUser": LOG_CATEGORY.auth,
      "resolveDeezerShortLink": LOG_CATEGORY.search,
      "resolveLatestPodcastEpisodes": LOG_CATEGORY.catalog,
      "resolveLibrary": LOG_CATEGORY.library,
      "resolveLibraryPlaylistItems": LOG_CATEGORY.playlists,
      "resolveLibraryPlaylistItemsUpdates": LOG_CATEGORY.playlists,
      "resolveLibrarySize": LOG_CATEGORY.library,
      "resolveOfflineLibrarySize": LOG_CATEGORY.library,
      "resolvePlayerItem": LOG_CATEGORY.player,
      "resolvePlaylistsWithEditableItems": LOG_CATEGORY.library,
      "resolvePlaylistThumbnail": LOG_CATEGORY.playlists,
      "resolveSortedPlayerItems": LOG_CATEGORY.player,
      "restoreLegacyUserPlaylistSort": LOG_CATEGORY.library,
      "runReduxPersistMigration": LOG_CATEGORY.migration,
      "saveEpisodeProgress": LOG_CATEGORY.catalog,
      "saveItemsInLibrary": LOG_CATEGORY.library,
      "savePodcastEpisode": LOG_CATEGORY.library,
      "saveToDisk": LOG_CATEGORY.network,
      "saveTrack": LOG_CATEGORY.library,
      "schedulePreload": LOG_CATEGORY.player,
      "search": LOG_CATEGORY.search,
      "searchDz": LOG_CATEGORY.search,
      "searchInEditorials": LOG_CATEGORY.search,
      "searchInPlaylists": LOG_CATEGORY.search,
      "searchPi": LOG_CATEGORY.search,
      "searchProfiles": LOG_CATEGORY.search,
      "searchProfilesV2": LOG_CATEGORY.search,
      "searchRb": LOG_CATEGORY.search,
      "searchSpotify": LOG_CATEGORY.search,
      "searchTt": LOG_CATEGORY.search,
      "searchTtMusic": LOG_CATEGORY.search,
      "searchTtStd": LOG_CATEGORY.search,
      "searchUsers": LOG_CATEGORY.catalog,
      "sendBatchWithRetry": LOG_CATEGORY.sync,
      "setLibrarySort": LOG_CATEGORY.library,
      "setLibrarySortType": LOG_CATEGORY.library,
      "setSpotifyAccessToken": LOG_CATEGORY.network,
      "setSpotifyClientToken": LOG_CATEGORY.network,
      "shuffleCycleStore": LOG_CATEGORY.player,
      "sortPlaylist": LOG_CATEGORY.library,
      "spotifyWebApiClient.responseError": LOG_CATEGORY.network,
      "sync": LOG_CATEGORY.sync,
      "syncAlbumNosqlCaches": LOG_CATEGORY.catalog,
      "syncDiagnostics": LOG_CATEGORY.sync,
      "syncPlaylistNosqlCaches": LOG_CATEGORY.playlists,
      "syncPodcastNosqlCaches": LOG_CATEGORY.catalog,
      "syncQueueAfterCollectionChange": LOG_CATEGORY.player,
      "toggleAlbumShuffle": LOG_CATEGORY.library,
      "togglePlaylistShuffle": LOG_CATEGORY.library,
      "togglePlayPause": LOG_CATEGORY.player,
      "togglePlayPauseCore": LOG_CATEGORY.player,
      "togglePodcastShuffle": LOG_CATEGORY.library,
      "toggleRepeat": LOG_CATEGORY.player,
      "toggleShuffle": LOG_CATEGORY.player,
      "unpinPlayerModels": LOG_CATEGORY.player,
      "unshiftToQueue": LOG_CATEGORY.player,
      "updateRbServers": LOG_CATEGORY.network,
      "v1.getInternalAlbumInternalId": LOG_CATEGORY.catalog,
      "v1.getInternalArtistInternalId": LOG_CATEGORY.catalog,
      "v1.getInternalPlaylistInternalId": LOG_CATEGORY.playlists,
      "v1.loadInternalPlaylist": LOG_CATEGORY.playlists,
      "verifyLocalMediaItemsExist": LOG_CATEGORY.offline,
      "voiceSearch": LOG_CATEGORY.search,
      "waitForOngoingPreload": LOG_CATEGORY.player,
      "writeAlbumsToSql": LOG_CATEGORY.catalog,
      "writeArtistsToSql": LOG_CATEGORY.catalog,
      "writeAuthToZustand": LOG_CATEGORY.migration,
      "writeEditorialsToSql": LOG_CATEGORY.catalog,
      "writeLibraryToSql": LOG_CATEGORY.migration,
      "writeMediaItemsToSql": LOG_CATEGORY.catalog,
      "writePlaylistItemsToSql": LOG_CATEGORY.playlists,
      "writePlaylistsToSql": LOG_CATEGORY.playlists,
      "writePodcastEpisodesToSql": LOG_CATEGORY.catalog,
      "writePodcastsToSql": LOG_CATEGORY.catalog,
      "writeSettingsToZustand": LOG_CATEGORY.migration,
      "yandexAccountLogin": LOG_CATEGORY.cloudImport
    };
    categoryForScope = (scope) => SCOPE_CATEGORY[scope] ?? LOG_CATEGORY.general;
  }
});

// ../../StreamingCore-Client/src/core-ts/fileSystem/getBasePath.ts
var getBasePath2, getBasePath_default;
var init_getBasePath = __esm({
  "../../StreamingCore-Client/src/core-ts/fileSystem/getBasePath.ts"() {
    "use strict";
    init_deviceState();
    getBasePath2 = function(path11) {
      const { appBasePath } = deviceState.getState();
      let normalizedBase = appBasePath.replace(/\\/g, "/");
      if (!normalizedBase.startsWith("/")) {
        normalizedBase = `/${normalizedBase}`;
      }
      const prefix = "file://";
      if (!path11) {
        return `${prefix}${normalizedBase}`;
      }
      if (path11[0] !== "/") {
        path11 = `/${path11}`;
      }
      return `${prefix}${normalizedBase}${path11}`;
    };
    getBasePath_default = getBasePath2;
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/logPaths.ts
var logPaths_exports = {};
__export(logPaths_exports, {
  currentLogPath: () => currentLogPath,
  getLogsDir: () => getLogsDir,
  logFileName: () => logFileName,
  parseDateFromName: () => parseDateFromName,
  yyyymmdd: () => yyyymmdd
});
var pad2, yyyymmdd, getLogsDir, logFileName, currentLogPath, NAME_RE, parseDateFromName;
var init_logPaths = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/logPaths.ts"() {
    "use strict";
    init_getBasePath();
    init_constants();
    pad2 = (n) => n < 10 ? `0${n}` : String(n);
    yyyymmdd = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    getLogsDir = () => getBasePath_default(LOG_DIR);
    logFileName = (date, tag) => `${LOG_FILE_PREFIX}${tag ? `-${tag}` : ""}-${yyyymmdd(date)}.log`;
    currentLogPath = (date, tag) => getBasePath_default(`${LOG_DIR}/${logFileName(date, tag)}`);
    NAME_RE = new RegExp(
      `^${LOG_FILE_PREFIX}(?:-[a-z0-9]+)*-(\\d{4})-(\\d{2})-(\\d{2})\\.log$`,
      "i"
    );
    parseDateFromName = (name4) => {
      const m = NAME_RE.exec(name4);
      if (!m) return null;
      return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/buffer.ts
var buffer, droppedCount, flushing, ready, consecutiveFailures, timer, processTag, minLevel, writesEnabled, enabledCategories, isPersisted, composeTag, currentLogPathFn, resolveLogPath, clearTimer, armTimer, scheduleFlush, enforceCap, buildCategoryBatch, droppedMarkerLine, reportFlushFailure, enqueue, flush2;
var init_buffer = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/buffer.ts"() {
    "use strict";
    init_fileSystemEventsBus();
    init_promiseWithTimeout();
    init_format();
    init_categories();
    init_scopeCategories();
    init_constants();
    buffer = [];
    droppedCount = 0;
    flushing = false;
    ready = false;
    consecutiveFailures = 0;
    timer = null;
    minLevel = LEVEL.info;
    writesEnabled = false;
    enabledCategories = /* @__PURE__ */ new Set();
    isPersisted = (category) => writesEnabled && (enabledCategories.size === 0 || enabledCategories.has(category));
    composeTag = (category) => {
      const segments = [];
      if (processTag) segments.push(processTag);
      if (category !== LOG_CATEGORY.general) segments.push(category);
      return segments.length > 0 ? segments.join("-") : void 0;
    };
    currentLogPathFn = null;
    resolveLogPath = (date, tag) => {
      if (!currentLogPathFn) {
        currentLogPathFn = (init_logPaths(), __toCommonJS(logPaths_exports)).currentLogPath;
      }
      return currentLogPathFn(date, tag);
    };
    clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    armTimer = (delay) => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        void flush2();
      }, delay);
      timer.unref?.();
    };
    scheduleFlush = () => {
      if (!ready) return;
      if (buffer.length >= HIGH_WATERMARK_LINES) {
        void flush2();
        return;
      }
      armTimer(FLUSH_INTERVAL_MS);
    };
    enforceCap = () => {
      if (buffer.length <= MAX_BUFFER_LINES) return;
      const overflow = buffer.length - MAX_BUFFER_LINES;
      buffer.splice(0, overflow);
      droppedCount += overflow;
    };
    buildCategoryBatch = (records) => {
      let content = "";
      const taken = [];
      let i = 0;
      for (; i < records.length; i++) {
        const r = records[i];
        const line = formatLine(r.t, r.level, r.scope, r.msg, r.data);
        if (content.length > 0 && content.length + line.length > MAX_BATCH_BYTES) break;
        content += line;
        taken.push(r);
      }
      return { content, taken, remainder: records.slice(i) };
    };
    droppedMarkerLine = () => {
      const line = formatLine(Date.now(), LEVEL.warn, "logger", `${droppedCount} lines dropped (buffer overflow)`);
      droppedCount = 0;
      return line;
    };
    reportFlushFailure = (err) => {
      try {
        console.warn("[logger] flush failed", err);
      } catch {
      }
    };
    enqueue = (level, scope, category, msg, data) => {
      if (level < minLevel) return;
      const effectiveCategory = category === LOG_CATEGORY.general ? categoryForScope(scope) : category;
      if (!isPersisted(effectiveCategory)) return;
      try {
        buffer.push({ t: Date.now(), level, scope, category: effectiveCategory, msg, data });
        if (buffer.length > MAX_BUFFER_LINES) {
          buffer.shift();
          droppedCount++;
        }
        scheduleFlush();
      } catch {
      }
    };
    flush2 = async () => {
      clearTimer();
      if (flushing || !ready) return;
      if (buffer.length === 0 && droppedCount === 0) return;
      if (!writesEnabled) {
        buffer = [];
        droppedCount = 0;
        return;
      }
      flushing = true;
      let anyFailed = false;
      try {
        const groups = /* @__PURE__ */ new Map();
        for (const r of buffer) {
          if (!isPersisted(r.category)) continue;
          const g = groups.get(r.category);
          if (g) g.push(r);
          else groups.set(r.category, [r]);
        }
        buffer = [];
        let markerPending = droppedCount > 0;
        for (const [category, records] of groups) {
          const { content: body, taken, remainder } = buildCategoryBatch(records);
          if (remainder.length > 0) buffer.push(...remainder);
          let content = body;
          if (markerPending) {
            content = droppedMarkerLine() + content;
            markerPending = false;
          }
          if (content.length === 0) continue;
          try {
            await promiseWithTimeout_default(
              fileSystemEventsBus_default.notify({
                name: "appendFile",
                data: { path: resolveLogPath(/* @__PURE__ */ new Date(), composeTag(category)), content, encoding: "utf8" }
              }),
              FLUSH_TIMEOUT_MS
            );
          } catch (err) {
            anyFailed = true;
            buffer = taken.concat(buffer);
            reportFlushFailure(err);
          }
        }
        consecutiveFailures = anyFailed ? consecutiveFailures + 1 : 0;
      } finally {
        flushing = false;
        enforceCap();
        if (buffer.length > 0 || droppedCount > 0) {
          if (consecutiveFailures > 0) {
            const delay = Math.min(BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1), BACKOFF_MAX_MS);
            armTimer(delay);
          } else {
            scheduleFlush();
          }
        }
      }
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/logging/logger.ts
var createLogger, log;
var init_logger = __esm({
  "../../StreamingCore-Client/src/core-ts/logging/logger.ts"() {
    "use strict";
    init_buffer();
    init_constants();
    init_categories();
    createLogger = (scope, category = LOG_CATEGORY.general) => {
      const fn = ((message, data) => enqueue(LEVEL.info, scope, category, message, data));
      fn.debug = (message, data) => enqueue(LEVEL.debug, scope, category, message, data);
      fn.info = (message, data) => enqueue(LEVEL.info, scope, category, message, data);
      fn.warn = (message, data) => enqueue(LEVEL.warn, scope, category, message, data);
      fn.error = (message, data) => enqueue(LEVEL.error, scope, category, message, data);
      fn.time = (label) => {
        const start = Date.now();
        return () => enqueue(LEVEL.info, scope, category, label, { ms: Date.now() - start });
      };
      return fn;
    };
    log = ((scope, message, data) => enqueue(LEVEL.info, scope, LOG_CATEGORY.general, message, data));
    log.debug = (scope, message, data) => enqueue(LEVEL.debug, scope, LOG_CATEGORY.general, message, data);
    log.info = (scope, message, data) => enqueue(LEVEL.info, scope, LOG_CATEGORY.general, message, data);
    log.warn = (scope, message, data) => enqueue(LEVEL.warn, scope, LOG_CATEGORY.general, message, data);
    log.error = (scope, message, data) => enqueue(LEVEL.error, scope, LOG_CATEGORY.general, message, data);
  }
});

// ../../StreamingCore-Client/src/factories/zustand/zustandStateFactory.ts
function createZustandState(options) {
  const { keys } = options;
  const initialState = {};
  for (const key in keys) {
    const typedKey = key;
    const config = keys[typedKey];
    initialState[typedKey] = config.default;
  }
  const store = create((set3) => ({
    ...initialState,
    rehydrated: false,
    rehydrateState: async () => {
      const storage = resolveName(options.storageName);
      const started = Date.now();
      let loadedKeys = 0;
      log2("start", { storage });
      const rehydratedState = {};
      try {
        await keyValueStorageEventsBus_default.notify({
          name: "createStorage",
          data: {
            name: resolveName(options.storageName)
          }
        });
        await Promise.all(Object.keys(keys).map(async (key) => {
          const typedKey = key;
          const config = keys[typedKey];
          if (config.ignorePersist) {
            return;
          }
          const raw = await keyValueStorageEventsBus_default.notify({
            name: "getStorageValue",
            data: {
              key,
              type: "string",
              storage: resolveName(options.storageName)
            }
          });
          if (raw === null || raw === void 0) {
            return;
          }
          try {
            let parsed;
            if ("serializationType" in config) {
              if (config.serializationType === "string") {
                parsed = raw;
              } else if (config.serializationType === "number") {
                parsed = Number(raw);
              } else if (config.serializationType === "boolean") {
                parsed = raw === "true";
              }
            } else {
              parsed = config.deserialize(raw);
            }
            rehydratedState[typedKey] = parsed;
            loadedKeys++;
          } catch (err) {
            log2.error("deserializeFailed", { storage, key, err });
          }
        }));
      } catch (err) {
        log2.error("rehydrateFailed", { storage, err });
      }
      set3((state) => ({
        ...state,
        ...rehydratedState,
        rehydrated: true
      }));
      log2("done", { storage, ms: Date.now() - started, keys: loadedKeys });
    },
    updateState: (partial) => {
      const updates = {};
      for (const key in partial) {
        if (!(key in keys)) continue;
        const typedKey = key;
        const config = keys[typedKey];
        const value = partial[typedKey];
        if (!config.ignorePersist && value !== void 0) {
          let serialized;
          if (value === null) {
            serialized = null;
          } else if ("serializationType" in config) {
            if (config.serializationType === "string") {
              serialized = value;
            } else if (config.serializationType === "number") {
              serialized = String(value);
            } else if (config.serializationType === "boolean") {
              serialized = String(value);
            }
          } else {
            serialized = config.serialize(value);
          }
          if (value === null) {
            keyValueStorageEventsBus_default.notify({
              name: "deleteStorageValue",
              data: {
                key,
                storage: resolveName(options.storageName)
              }
            });
          } else {
            keyValueStorageEventsBus_default.notify({
              name: "setStorageValue",
              data: {
                key,
                value: serialized,
                storage: resolveName(options.storageName)
              }
            });
          }
        }
        if (value !== void 0) {
          updates[typedKey] = value;
        }
      }
      set3((state) => ({
        ...state,
        ...updates
      }));
    }
  }));
  return store;
}
var log2, jsonDeserializer, jsonSerializer;
var init_zustandStateFactory = __esm({
  "../../StreamingCore-Client/src/factories/zustand/zustandStateFactory.ts"() {
    "use strict";
    init_esm();
    init_keyValueStorageEventsBus();
    init_storageNames();
    init_logger();
    log2 = createLogger("rehydrateState");
    jsonDeserializer = (value) => JSON.parse(value);
    jsonSerializer = (value) => JSON.stringify(value);
  }
});

// ../../StreamingCore-Client/src/core-ts/device/zustandState/deviceState.ts
var deviceState;
var init_deviceState = __esm({
  "../../StreamingCore-Client/src/core-ts/device/zustandState/deviceState.ts"() {
    "use strict";
    init_zustandStateFactory();
    deviceState = createZustandState({
      storageName: "device-storage",
      keys: {
        appState: {
          default: "active",
          ignorePersist: true,
          serializationType: "string"
        },
        trackingStatus: {
          default: "denied",
          serializationType: "string"
        },
        country: {
          default: "",
          serializationType: "string"
        },
        ipCountry: {
          default: "",
          serializationType: "string"
        },
        storeFront: {
          default: "",
          serializationType: "string"
        },
        language: {
          default: null,
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        platformName: {
          default: "ios",
          serializationType: "string"
        },
        platformVersion: {
          default: "",
          serializationType: "string"
        },
        deviceId: {
          default: "",
          serializationType: "string"
        },
        appBasePath: {
          default: "",
          serializationType: "string"
        },
        connected: {
          default: false,
          serializationType: "boolean"
        },
        connectionType: {
          default: "",
          ignorePersist: true,
          serializationType: "string"
        },
        headlessApp: {
          default: true,
          ignorePersist: true,
          serializationType: "boolean"
        },
        browserBased: {
          default: false,
          serializationType: "boolean"
        }
      }
    });
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/device/index.ts
var device_exports = {};
__export(device_exports, {
  disposeDeviceAdapter: () => disposeDeviceAdapter,
  initDeviceAdapter: () => initDeviceAdapter
});
var import_os, import_process, guard9, detectPlatform, detectLanguageTag, initDeviceAdapter, disposeDeviceAdapter;
var init_device = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/device/index.ts"() {
    "use strict";
    import_os = __toESM(require("os"));
    import_process = __toESM(require("process"));
    init_deviceState();
    init_adapterRegistry();
    guard9 = createBoundGuard();
    detectPlatform = () => {
      switch (import_process.default.platform) {
        case "darwin":
          return "macos";
        case "win32":
          return "windows";
        case "linux":
          return "linux";
        default:
          return "linux";
      }
    };
    detectLanguageTag = () => {
      const env = import_process.default.env.LANG || import_process.default.env.LC_ALL || import_process.default.env.LC_MESSAGES || "en";
      return env.split(".")[0]?.replace("_", "-") || "en";
    };
    initDeviceAdapter = async () => {
      if (!guard9.bind()) return;
      const languageTag = detectLanguageTag();
      deviceState.getState().updateState({
        platformName: detectPlatform(),
        platformVersion: import_os.default.release(),
        browserBased: false,
        language: {
          languageTag,
          language: languageTag.split("-")[0] || languageTag,
          country: languageTag.split("-")[1],
          isRTL: false
        }
      });
    };
    disposeDeviceAdapter = () => {
      guard9.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/analytics/eventsBus/analyticsEventsBus.ts
var analyticsEventsBus_default;
var init_analyticsEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/analytics/eventsBus/analyticsEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    analyticsEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/analytics/index.ts
var analytics_exports = {};
__export(analytics_exports, {
  disposeAnalyticsAdapter: () => disposeAnalyticsAdapter,
  initAnalyticsAdapter: () => initAnalyticsAdapter
});
var guard10, initAnalyticsAdapter, disposeAnalyticsAdapter;
var init_analytics = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/analytics/index.ts"() {
    "use strict";
    init_analyticsEventsBus();
    init_adapterRegistry();
    guard10 = createBoundGuard();
    initAnalyticsAdapter = async () => {
      if (!guard10.bind()) return;
      analyticsEventsBus_default.addListener((event) => {
        switch (event.name) {
          case "sendEvent":
            event.resolve();
            break;
        }
      });
    };
    disposeAnalyticsAdapter = () => {
      guard10.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/theme/eventsBus/themeEventsBus.ts
var themeEventsBus_default;
var init_themeEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/theme/eventsBus/themeEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    themeEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/theme/index.ts
var theme_exports = {};
__export(theme_exports, {
  disposeThemeAdapter: () => disposeThemeAdapter,
  initThemeAdapter: () => initThemeAdapter
});
var import_electron7, guard11, updateListener, resolveScheme, initThemeAdapter, disposeThemeAdapter;
var init_theme = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/theme/index.ts"() {
    "use strict";
    import_electron7 = require("electron");
    init_themeEventsBus();
    init_adapterRegistry();
    guard11 = createBoundGuard();
    updateListener = null;
    resolveScheme = () => import_electron7.nativeTheme.shouldUseDarkColors ? "dark" : "light";
    initThemeAdapter = async () => {
      if (!guard11.bind()) return;
      themeEventsBus_default.addListener((event) => {
        switch (event.name) {
          case "getSystemColorScheme":
            event.resolve(resolveScheme());
            break;
          case "systemColorSchemeChanged":
            event.resolve();
            break;
        }
      });
      updateListener = () => {
        themeEventsBus_default.notify({
          name: "systemColorSchemeChanged",
          data: { scheme: resolveScheme() }
        });
      };
      import_electron7.nativeTheme.on("updated", updateListener);
    };
    disposeThemeAdapter = () => {
      if (!guard11.dispose()) return;
      if (updateListener) {
        import_electron7.nativeTheme.off("updated", updateListener);
        updateListener = null;
      }
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/images/eventsBus/imagesEventsBus.ts
var imagesEventsBus_default;
var init_imagesEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/images/eventsBus/imagesEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    imagesEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/images/index.ts
var images_exports = {};
__export(images_exports, {
  clearColorCache: () => clearColorCache,
  disposeImagesAdapter: () => disposeImagesAdapter,
  extractColorPalette: () => extractColorPalette,
  initImagesAdapter: () => initImagesAdapter
});
var import_electron8, guard12, colorCache, rgbToHex, fetchImageBuffer, dominantOf, extractColorPalette, clearColorCache, initImagesAdapter, disposeImagesAdapter;
var init_images = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/images/index.ts"() {
    "use strict";
    import_electron8 = require("electron");
    init_imagesEventsBus();
    init_adapterRegistry();
    guard12 = createBoundGuard();
    colorCache = /* @__PURE__ */ new Map();
    rgbToHex = (rgb) => "#" + [rgb.r, rgb.g, rgb.b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
    fetchImageBuffer = (url) => {
      return new Promise((resolve, reject) => {
        const request = import_electron8.net.request(url);
        request.on("response", (response) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => resolve(Buffer.concat(chunks)));
          response.on("error", reject);
        });
        request.on("error", reject);
        request.end();
      });
    };
    dominantOf = (bitmap, width, height, region, bucket = 16) => {
      const channels = 4;
      const counts = /* @__PURE__ */ new Map();
      const inEdge = (x, y) => x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const cStart = Math.floor(width * 0.2);
      const cEnd = Math.floor(width * 0.8);
      const inCenter = (x, y) => x >= cStart && x < cEnd && y >= cStart && y < cEnd;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (region === "edge" ? !inEdge(x, y) : !inCenter(x, y)) continue;
          const i = (y * width + x) * channels;
          const a = bitmap[i + 3];
          if (a === void 0 || a < 128) continue;
          const r = Math.round((bitmap[i] ?? 0) / bucket) * bucket;
          const g = Math.round((bitmap[i + 1] ?? 0) / bucket) * bucket;
          const b = Math.round((bitmap[i + 2] ?? 0) / bucket) * bucket;
          const key = `${r},${g},${b}`;
          const existing = counts.get(key);
          if (existing) {
            existing.count++;
          } else {
            counts.set(key, { count: 1, rgb: { r, g, b } });
          }
        }
      }
      let dominant = null;
      for (const c of counts.values()) {
        if (!dominant || c.count > dominant.count) dominant = c;
      }
      return dominant ? rgbToHex(dominant.rgb) : "#808080";
    };
    extractColorPalette = async (imageUrl) => {
      if (!imageUrl) return null;
      const cached = colorCache.get(imageUrl);
      if (cached) return cached;
      try {
        let image;
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          const buffer2 = await fetchImageBuffer(imageUrl);
          image = import_electron8.nativeImage.createFromBuffer(buffer2);
        } else {
          const filePath = imageUrl.startsWith("file://") ? imageUrl.slice(7) : imageUrl;
          image = import_electron8.nativeImage.createFromPath(filePath);
        }
        if (image.isEmpty()) {
          const fallback = { background: "#808080", primary: "#808080" };
          colorCache.set(imageUrl, fallback);
          return fallback;
        }
        const size = 50;
        const resized = image.resize({ width: size, height: size, quality: "good" });
        const bitmap = resized.toBitmap();
        const palette = {
          background: dominantOf(bitmap, size, size, "edge"),
          primary: dominantOf(bitmap, size, size, "center")
        };
        colorCache.set(imageUrl, palette);
        return palette;
      } catch {
        return null;
      }
    };
    clearColorCache = () => {
      colorCache.clear();
    };
    initImagesAdapter = async () => {
      if (!guard12.bind()) return;
      imagesEventsBus_default.addListener(async (event) => {
        try {
          switch (event.name) {
            case "preloadImages":
              event.resolve();
              break;
            case "clearImageCache":
              clearColorCache();
              event.resolve();
              break;
            case "getColorPalette":
              event.resolve(await extractColorPalette(event.data.imageUrl));
              break;
          }
        } catch (err) {
          event.reject(err);
        }
      });
      import_electron8.ipcMain.handle(
        "service:images:getColorPalette",
        (_e, imageUrl) => extractColorPalette(imageUrl)
      );
    };
    disposeImagesAdapter = () => {
      if (!guard12.dispose()) return;
      import_electron8.ipcMain.removeHandler("service:images:getColorPalette");
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/filePicker/eventsBus/filePickerEventsBus.ts
var filePickerEventsBus_default;
var init_filePickerEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/filePicker/eventsBus/filePickerEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    filePickerEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/filePicker/index.ts
var filePicker_exports = {};
__export(filePicker_exports, {
  disposeFilePickerAdapter: () => disposeFilePickerAdapter,
  initFilePickerAdapter: () => initFilePickerAdapter,
  pickFile: () => pickFile,
  pickImage: () => pickImage,
  pickMediaFiles: () => pickMediaFiles
});
var import_electron9, import_fs4, import_path4, guard13, audioExts, videoExts, imageExts, getExtension, getImageMime, pickImage, pickMediaFiles, pickFile, initFilePickerAdapter, disposeFilePickerAdapter;
var init_filePicker = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/filePicker/index.ts"() {
    "use strict";
    import_electron9 = require("electron");
    import_fs4 = __toESM(require("fs"));
    import_path4 = __toESM(require("path"));
    init_filePickerEventsBus();
    init_adapterRegistry();
    guard13 = createBoundGuard();
    audioExts = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"];
    videoExts = ["mp4", "mkv", "avi", "mov", "webm"];
    imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
    getExtension = (filename) => {
      const ext = import_path4.default.extname(filename).slice(1).toLowerCase();
      return ext || "bin";
    };
    getImageMime = (extension) => {
      switch (extension) {
        case "jpg":
        case "jpeg":
          return "image/jpeg";
        case "png":
          return "image/png";
        case "gif":
          return "image/gif";
        case "webp":
          return "image/webp";
        default:
          return "image/jpeg";
      }
    };
    pickImage = async (opts = {}) => {
      const result = await import_electron9.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Images", extensions: imageExts }]
      });
      if (result.canceled || !result.filePaths?.length) return void 0;
      const filePath = result.filePaths[0];
      const extension = getExtension(filePath);
      if (opts.outputType === "base64") {
        const buffer2 = await import_fs4.default.promises.readFile(filePath);
        return { base64Data: { base64: buffer2.toString("base64"), extension } };
      }
      return {
        fileData: {
          url: filePath,
          name: import_path4.default.basename(filePath),
          mime: getImageMime(extension),
          extension
        }
      };
    };
    pickMediaFiles = async () => {
      const result = await import_electron9.dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Media", extensions: [...audioExts, ...videoExts] }]
      });
      if (result.canceled || !result.filePaths?.length) return [];
      return result.filePaths.map((filePath) => {
        const name4 = import_path4.default.basename(filePath);
        const ext = getExtension(name4);
        const mimeType = audioExts.includes(ext) ? `audio/${ext}` : videoExts.includes(ext) ? `video/${ext}` : null;
        let size = null;
        try {
          size = import_fs4.default.statSync(filePath).size;
        } catch {
        }
        return { uri: filePath, name: name4, size, mimeType };
      });
    };
    pickFile = async (opts = {}) => {
      const dialogOptions = { properties: ["openFile"] };
      if (opts.extensions) {
        dialogOptions.filters = [{ name: "Files", extensions: opts.extensions }];
      }
      const result = await import_electron9.dialog.showOpenDialog(dialogOptions);
      if (result.canceled || !result.filePaths?.length) return null;
      const filePath = result.filePaths[0];
      return { uri: filePath, name: import_path4.default.basename(filePath) };
    };
    initFilePickerAdapter = async () => {
      if (!guard13.bind()) return;
      if (!import_electron9.app.isReady()) {
        await import_electron9.app.whenReady();
      }
      filePickerEventsBus_default.addListener(async (event) => {
        try {
          switch (event.name) {
            case "pickImage":
              event.resolve(await pickImage(event.data));
              break;
            case "pickMediaFiles":
              event.resolve(await pickMediaFiles());
              break;
            case "pickFile":
              event.resolve(await pickFile(event.data));
              break;
          }
        } catch (err) {
          event.reject(err);
        }
      });
      import_electron9.ipcMain.handle(
        "service:filePicker:pickImage",
        (_e, opts) => pickImage(opts ?? {})
      );
      import_electron9.ipcMain.handle("service:filePicker:pickMediaFiles", () => pickMediaFiles());
      import_electron9.ipcMain.handle(
        "service:filePicker:pickFile",
        (_e, opts) => pickFile(opts ?? {})
      );
    };
    disposeFilePickerAdapter = () => {
      if (!guard13.dispose()) return;
      import_electron9.ipcMain.removeHandler("service:filePicker:pickImage");
      import_electron9.ipcMain.removeHandler("service:filePicker:pickMediaFiles");
      import_electron9.ipcMain.removeHandler("service:filePicker:pickFile");
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/auth/eventsBus/authEventsBus.ts
var authEventsBus_default;
var init_authEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/auth/eventsBus/authEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    authEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/core-ts/linking/eventsBus/linkingEventsBus.ts
var linkingEventsBus_default;
var init_linkingEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/linking/eventsBus/linkingEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    linkingEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/core-ts/globals/zustandState/globalsState.ts
var globalsState;
var init_globalsState = __esm({
  "../../StreamingCore-Client/src/core-ts/globals/zustandState/globalsState.ts"() {
    "use strict";
    init_zustandStateFactory();
    globalsState = createZustandState({
      storageName: "globals-storage",
      keys: {
        launchedApp: {
          default: false,
          ignorePersist: true,
          serializationType: "boolean"
        },
        stateRehydrated: {
          default: false,
          ignorePersist: true,
          serializationType: "boolean"
        },
        useInternalAnalytics: {
          default: true,
          serializationType: "boolean"
        },
        apiVersion: {
          default: "v2",
          serializationType: "string"
        },
        apiClientName: {
          default: "",
          serializationType: "string"
        },
        apiClientId: {
          default: "",
          serializationType: "string"
        },
        appVersion: {
          default: "",
          serializationType: "string"
        },
        appDistribution: {
          default: "other",
          serializationType: "string"
        },
        supportsLocalResources: {
          default: false,
          serializationType: "boolean"
        },
        unsupportedMediaTypes: {
          default: [],
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        artistsBlacklist: {
          default: {},
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        tracksBlacklist: {
          default: {},
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        homeCard: {
          default: null,
          ignorePersist: true,
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        userBlockedArtists: {
          default: {},
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        userBlockedPodcasts: {
          default: {},
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        userRequired: {
          default: true,
          serializationType: "boolean"
        },
        defaultMusicProvider: {
          default: "deezer",
          serializationType: "string"
        },
        composeExternalPlaylistThumbnails: {
          default: false,
          serializationType: "boolean"
        },
        echoRegions: {
          default: "",
          serializationType: "string"
        },
        // On by default: the feature is meant to be the normal behaviour, not an
        // opt-in. Remote config is the escape hatch, not the switch that turns it
        // on. An unrecognised remote value still falls back to 'off' — garbage in
        // config should disable a feature, never half-enable it.
        artistMergeMode: {
          default: "on",
          serializationType: "string"
        },
        artistMergeMinConfidence: {
          default: 70,
          serializationType: "number"
        },
        endpoints: {
          default: {},
          serialize: jsonSerializer,
          deserialize: jsonDeserializer
        },
        proipClientKey: {
          default: "",
          serializationType: "string"
        },
        productName: {
          default: "",
          serializationType: "string"
        },
        websiteUrl: {
          default: "",
          serializationType: "string"
        },
        authUrl: {
          default: "",
          serializationType: "string"
        },
        authUrlAlternative: {
          default: "",
          serializationType: "string"
        },
        syncUrl: {
          default: "",
          serializationType: "string"
        },
        apiUrl: {
          default: "",
          serializationType: "string"
        },
        podcastsUrl: {
          default: "",
          serializationType: "string"
        },
        radiosUrl: {
          default: "",
          serializationType: "string"
        },
        analyticsUrl: {
          default: "",
          serializationType: "string"
        },
        podcastIndexApiKey: {
          default: "",
          serializationType: "string"
        },
        podcastIndexApiSecret: {
          default: "",
          serializationType: "string"
        },
        appBundleId: {
          default: "",
          serializationType: "string"
        },
        deepLinkScheme: {
          default: "",
          serializationType: "string"
        },
        dzCheckedCountry: {
          default: "",
          serializationType: "string"
        },
        lastfmApiKey: {
          default: "",
          serializationType: "string"
        },
        lastfmApiSecret: {
          default: "",
          serializationType: "string"
        },
        appleStoreUri: {
          default: "",
          serializationType: "string"
        },
        googleStoreUri: {
          default: "",
          serializationType: "string"
        },
        appGalleryStoreUri: {
          default: "",
          serializationType: "string"
        },
        microsoftStoreUri: {
          default: "",
          serializationType: "string"
        },
        amazonStoreUri: {
          default: "",
          serializationType: "string"
        },
        appMarketStoreUri: {
          default: "",
          serializationType: "string"
        },
        googleWebClientId: {
          default: "",
          serializationType: "string"
        },
        googleWebClientSecret: {
          default: "",
          serializationType: "string"
        },
        googleOauthRedirectUrl: {
          default: "",
          serializationType: "string"
        }
      }
    });
  }
});

// ../../StreamingCore-Client/src/core-ts/cloudImport/zustandState/cloudImportState.ts
var cloudImportState;
var init_cloudImportState = __esm({
  "../../StreamingCore-Client/src/core-ts/cloudImport/zustandState/cloudImportState.ts"() {
    "use strict";
    init_zustandStateFactory();
    cloudImportState = createZustandState({
      storageName: "cloud-import-storage",
      keys: {
        boxAppKey: {
          default: "",
          ignorePersist: true,
          serializationType: "string"
        },
        boxAppSecret: {
          default: "",
          ignorePersist: true,
          serializationType: "string"
        },
        dropboxAppKey: {
          default: "",
          ignorePersist: true,
          serializationType: "string"
        },
        dropboxAppSecret: {
          default: "",
          ignorePersist: true,
          serializationType: "string"
        },
        microsoftAppKey: {
          default: "",
          ignorePersist: true,
          serializationType: "string"
        },
        yandexAppKey: {
          default: "",
          ignorePersist: true,
          serializationType: "string"
        },
        oauthRedirectPath: {
          default: "root",
          ignorePersist: true,
          serializationType: "string"
        }
      }
    });
  }
});

// ../../StreamingCore-Client/src/adapters/web/auth/index.ts
var guard14, ctxConfig, isElectron, buildGoogleRedirectUri, generateChallenge, handleGoogleUserWeb, initAuthAdapter, disposeAuthAdapter;
var init_auth = __esm({
  "../../StreamingCore-Client/src/adapters/web/auth/index.ts"() {
    "use strict";
    init_authEventsBus();
    init_linkingEventsBus();
    init_globalsState();
    init_cloudImportState();
    init_adapterRegistry();
    guard14 = createBoundGuard();
    ctxConfig = null;
    isElectron = () => typeof window !== "undefined" && !!window.electronAPI;
    buildGoogleRedirectUri = ({
      isBrowser: isBrowser2,
      googleOauthRedirectUrl,
      origin
    }) => {
      if (!isBrowser2) {
        if (!googleOauthRedirectUrl) {
          throw new Error("Google OAuth: googleOauthRedirectUrl not configured");
        }
        return googleOauthRedirectUrl;
      }
      if (!googleOauthRedirectUrl) {
        throw new Error("Google OAuth: googleOauthRedirectUrl not configured");
      }
      if (!origin) {
        throw new Error("Google OAuth: no window origin to build the browser redirect from");
      }
      return `${origin}${new URL(googleOauthRedirectUrl).pathname}`;
    };
    generateChallenge = async () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const codeVerifier = Array.from(array, (b) => b.toString(36)).join("").substring(0, 43);
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const base642 = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return { challenge: base642, verifier: codeVerifier };
    };
    handleGoogleUserWeb = async (scopes) => {
      const { challenge, verifier } = await generateChallenge();
      const {
        deepLinkScheme,
        googleWebClientId,
        googleWebClientSecret,
        googleOauthRedirectUrl
      } = globalsState.getState();
      const { oauthRedirectPath } = cloudImportState.getState();
      const deepLinkRedirectUri = `${deepLinkScheme}://${oauthRedirectPath}`;
      const isBrowser2 = !isElectron();
      const googleRedirectUri = buildGoogleRedirectUri({
        isBrowser: isBrowser2,
        googleOauthRedirectUrl,
        origin: typeof window !== "undefined" ? window.location.origin : ""
      });
      if (!googleWebClientId) {
        throw new Error("Google OAuth: googleWebClientId not configured");
      }
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.append("client_id", googleWebClientId);
      authUrl.searchParams.append("redirect_uri", googleRedirectUri);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", scopes.join(" "));
      authUrl.searchParams.append("code_challenge", challenge);
      authUrl.searchParams.append("code_challenge_method", "S256");
      authUrl.searchParams.append("access_type", "offline");
      authUrl.searchParams.append("prompt", "consent");
      const callbackUrl = await linkingEventsBus_default.notify({
        name: "openAuthLink",
        // The opener watches for THIS url to know the popup finished, so it has to be
        // the same value we asked Google to redirect to. Electron keeps matching on the
        // deep link, which is what its handler registers.
        data: { url: authUrl.href, redirectUrl: isBrowser2 ? googleRedirectUri : deepLinkRedirectUri }
      });
      const callbackSplits = callbackUrl.split(/\?|#/);
      const params = new URLSearchParams(callbackSplits[1] || callbackSplits[0]);
      const code = params.get("code");
      if (!code) throw new Error("Google OAuth: missing auth code");
      const tokenBody = new URLSearchParams({
        code,
        client_id: googleWebClientId,
        redirect_uri: googleRedirectUri,
        code_verifier: verifier,
        grant_type: "authorization_code"
      });
      if (isElectron() && googleWebClientSecret) {
        tokenBody.set("client_secret", googleWebClientSecret);
      }
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) throw new Error("Google OAuth: invalid token response");
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const user = await userRes.json();
      if (!user.id) throw new Error("Google OAuth: invalid user response");
      return {
        googleId: user.id,
        googleIdToken: tokenData.id_token || "",
        googleAccessToken: tokenData.access_token,
        name: user.given_name || "",
        surname: user.family_name || "",
        email: user.email || "",
        avatar: user.picture || ""
      };
    };
    initAuthAdapter = async (ctx = {}) => {
      if (!guard14.bind()) return;
      ctxConfig = ctx;
      const storageKey = ctx.autoLoginStorageKey ?? "auth_auto_login";
      authEventsBus_default.addListener(async (event) => {
        if (!ctxConfig) {
          event.reject(new Error("Auth adapter not initialised"));
          return;
        }
        try {
          switch (event.name) {
            case "generateChallenge":
              event.resolve(await generateChallenge());
              break;
            case "setCookie": {
              const c = event.data.cookie;
              document.cookie = `${c.name}=${c.value}; path=${c.path ?? "/"}; SameSite=Strict`;
              event.resolve();
              break;
            }
            case "deleteCookie":
              document.cookie = `${event.data.cookie.name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              event.resolve();
              break;
            case "setAutoLoginCredentials":
              window.localStorage.setItem(storageKey, JSON.stringify(event.data));
              event.resolve();
              break;
            case "getAutoLoginCredentials": {
              try {
                const stored = window.localStorage.getItem(storageKey);
                event.resolve(stored ? JSON.parse(stored) : null);
              } catch {
                event.resolve(null);
              }
              break;
            }
            case "deleteAutoLoginCredentials":
              window.localStorage.removeItem(storageKey);
              event.resolve();
              break;
            case "getGoogleUser":
              event.resolve(await handleGoogleUserWeb(event.data.scopes));
              break;
            case "getAppleUser":
            case "getFacebookUser":
              event.reject(new Error("Social login not available on web"));
              break;
            case "facebookLogout":
            case "googleLogout":
            case "appleLogout":
              event.resolve();
              break;
          }
        } catch (err) {
          event.reject(err);
        }
      });
    };
    disposeAuthAdapter = () => {
      if (!guard14.dispose()) return;
      ctxConfig = null;
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/auth/index.ts
var auth_exports = {};
__export(auth_exports, {
  disposeAuthAdapter: () => disposeAuthAdapter,
  initAuthAdapter: () => initAuthAdapter
});
var init_auth2 = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/auth/index.ts"() {
    "use strict";
    init_auth();
  }
});

// ../../StreamingCore-Client/src/core-ts/purchases/eventsBus/purchasesEventsBus.ts
var purchasesEventsBus_default;
var init_purchasesEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/purchases/eventsBus/purchasesEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    purchasesEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/web/purchases/index.ts
var guard15, initPurchasesAdapter, disposePurchasesAdapter;
var init_purchases = __esm({
  "../../StreamingCore-Client/src/adapters/web/purchases/index.ts"() {
    "use strict";
    init_purchasesEventsBus();
    init_adapterRegistry();
    guard15 = createBoundGuard();
    initPurchasesAdapter = async () => {
      if (!guard15.bind()) return;
      purchasesEventsBus_default.addListener(async (event) => {
        try {
          switch (event.name) {
            case "initPurchases":
              event.resolve();
              break;
            case "getPurchases":
              event.resolve([]);
              break;
            case "getSubscriptions":
              event.resolve([]);
              break;
            case "requestSubscription":
              event.reject(new Error("Purchases not supported on web"));
              break;
            case "finishTransaction":
              event.resolve();
              break;
          }
        } catch (err) {
          event.reject(err);
        }
      });
    };
    disposePurchasesAdapter = () => {
      guard15.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/purchases/index.ts
var purchases_exports = {};
__export(purchases_exports, {
  disposePurchasesAdapter: () => disposePurchasesAdapter,
  initPurchasesAdapter: () => initPurchasesAdapter
});
var init_purchases2 = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/purchases/index.ts"() {
    "use strict";
    init_purchases();
  }
});

// ../../StreamingCore-Client/node_modules/@firebase/util/dist/postinstall.mjs
var getDefaultsFromPostinstall;
var init_postinstall = __esm({
  "../../StreamingCore-Client/node_modules/@firebase/util/dist/postinstall.mjs"() {
    getDefaultsFromPostinstall = () => void 0;
  }
});

// ../../StreamingCore-Client/node_modules/@firebase/util/dist/node-esm/index.node.esm.js
function getGlobal() {
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw new Error("Unable to locate global object.");
}
function isIndexedDBAvailable() {
  try {
    return typeof indexedDB === "object";
  } catch (e) {
    return false;
  }
}
function validateIndexedDBOpenable() {
  return new Promise((resolve, reject) => {
    try {
      let preExist = true;
      const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
      const request = self.indexedDB.open(DB_CHECK_NAME);
      request.onsuccess = () => {
        request.result.close();
        if (!preExist) {
          self.indexedDB.deleteDatabase(DB_CHECK_NAME);
        }
        resolve(true);
      };
      request.onupgradeneeded = () => {
        preExist = false;
      };
      request.onerror = () => {
        reject(request.error?.message || "");
      };
    } catch (error) {
      reject(error);
    }
  });
}
function replaceTemplate(template, data) {
  return template.replace(PATTERN, (_, key) => {
    const value = data[key];
    return value != null ? String(value) : `<${key}?>`;
  });
}
function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  for (const k of aKeys) {
    if (!bKeys.includes(k)) {
      return false;
    }
    const aProp = a[k];
    const bProp = b[k];
    if (isObject(aProp) && isObject(bProp)) {
      if (!deepEqual(aProp, bProp)) {
        return false;
      }
    } else if (aProp !== bProp) {
      return false;
    }
  }
  for (const k of bKeys) {
    if (!aKeys.includes(k)) {
      return false;
    }
  }
  return true;
}
function isObject(thing) {
  return thing !== null && typeof thing === "object";
}
function calculateBackoffMillis(backoffCount, intervalMillis = DEFAULT_INTERVAL_MILLIS, backoffFactor = DEFAULT_BACKOFF_FACTOR) {
  const currBaseValue = intervalMillis * Math.pow(backoffFactor, backoffCount);
  const randomWait = Math.round(
    // A fraction of the backoff value to add/subtract.
    // Deviation: changes multiplication order to improve readability.
    RANDOM_FACTOR * currBaseValue * // A random float (rounded to int by Math.round above) in the range [-1, 1]. Determines
    // if we add or subtract.
    (Math.random() - 0.5) * 2
  );
  return Math.min(MAX_VALUE_MILLIS, currBaseValue + randomWait);
}
function getModularInstance(service) {
  if (service && service._delegate) {
    return service._delegate;
  } else {
    return service;
  }
}
var CONSTANTS, assert, assertionError, stringToByteArray$1, byteArrayToString, base64, DecodeBase64StringError, base64Encode, base64urlEncodeWithoutPadding, base64Decode, getDefaultsFromGlobal, getDefaultsFromEnvVariable, getDefaultsFromCookie, getDefaults, getDefaultAppConfig, Deferred, ERROR_NAME, FirebaseError, ErrorFactory, PATTERN, DEFAULT_INTERVAL_MILLIS, DEFAULT_BACKOFF_FACTOR, MAX_VALUE_MILLIS, RANDOM_FACTOR;
var init_index_node_esm = __esm({
  "../../StreamingCore-Client/node_modules/@firebase/util/dist/node-esm/index.node.esm.js"() {
    init_postinstall();
    CONSTANTS = {
      /**
       * @define {boolean} Whether this is the client Node.js SDK.
       */
      NODE_CLIENT: false,
      /**
       * @define {boolean} Whether this is the Admin Node.js SDK.
       */
      NODE_ADMIN: false,
      /**
       * Firebase SDK Version
       */
      SDK_VERSION: "${JSCORE_VERSION}"
    };
    assert = function(assertion, message) {
      if (!assertion) {
        throw assertionError(message);
      }
    };
    assertionError = function(message) {
      return new Error("Firebase Database (" + CONSTANTS.SDK_VERSION + ") INTERNAL ASSERT FAILED: " + message);
    };
    stringToByteArray$1 = function(str) {
      const out = [];
      let p = 0;
      for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 128) {
          out[p++] = c;
        } else if (c < 2048) {
          out[p++] = c >> 6 | 192;
          out[p++] = c & 63 | 128;
        } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
          c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
          out[p++] = c >> 18 | 240;
          out[p++] = c >> 12 & 63 | 128;
          out[p++] = c >> 6 & 63 | 128;
          out[p++] = c & 63 | 128;
        } else {
          out[p++] = c >> 12 | 224;
          out[p++] = c >> 6 & 63 | 128;
          out[p++] = c & 63 | 128;
        }
      }
      return out;
    };
    byteArrayToString = function(bytes) {
      const out = [];
      let pos = 0, c = 0;
      while (pos < bytes.length) {
        const c1 = bytes[pos++];
        if (c1 < 128) {
          out[c++] = String.fromCharCode(c1);
        } else if (c1 > 191 && c1 < 224) {
          const c2 = bytes[pos++];
          out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
        } else if (c1 > 239 && c1 < 365) {
          const c2 = bytes[pos++];
          const c3 = bytes[pos++];
          const c4 = bytes[pos++];
          const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
          out[c++] = String.fromCharCode(55296 + (u >> 10));
          out[c++] = String.fromCharCode(56320 + (u & 1023));
        } else {
          const c2 = bytes[pos++];
          const c3 = bytes[pos++];
          out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
        }
      }
      return out.join("");
    };
    base64 = {
      /**
       * Maps bytes to characters.
       */
      byteToCharMap_: null,
      /**
       * Maps characters to bytes.
       */
      charToByteMap_: null,
      /**
       * Maps bytes to websafe characters.
       * @private
       */
      byteToCharMapWebSafe_: null,
      /**
       * Maps websafe characters to bytes.
       * @private
       */
      charToByteMapWebSafe_: null,
      /**
       * Our default alphabet, shared between
       * ENCODED_VALS and ENCODED_VALS_WEBSAFE
       */
      ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      /**
       * Our default alphabet. Value 64 (=) is special; it means "nothing."
       */
      get ENCODED_VALS() {
        return this.ENCODED_VALS_BASE + "+/=";
      },
      /**
       * Our websafe alphabet.
       */
      get ENCODED_VALS_WEBSAFE() {
        return this.ENCODED_VALS_BASE + "-_.";
      },
      /**
       * Whether this browser supports the atob and btoa functions. This extension
       * started at Mozilla but is now implemented by many browsers. We use the
       * ASSUME_* variables to avoid pulling in the full useragent detection library
       * but still allowing the standard per-browser compilations.
       *
       */
      HAS_NATIVE_SUPPORT: typeof atob === "function",
      /**
       * Base64-encode an array of bytes.
       *
       * @param input An array of bytes (numbers with
       *     value in [0, 255]) to encode.
       * @param webSafe Boolean indicating we should use the
       *     alternative alphabet.
       * @return The base64 encoded string.
       */
      encodeByteArray(input, webSafe) {
        if (!Array.isArray(input)) {
          throw Error("encodeByteArray takes an array as a parameter");
        }
        this.init_();
        const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
        const output = [];
        for (let i = 0; i < input.length; i += 3) {
          const byte1 = input[i];
          const haveByte2 = i + 1 < input.length;
          const byte2 = haveByte2 ? input[i + 1] : 0;
          const haveByte3 = i + 2 < input.length;
          const byte3 = haveByte3 ? input[i + 2] : 0;
          const outByte1 = byte1 >> 2;
          const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
          let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
          let outByte4 = byte3 & 63;
          if (!haveByte3) {
            outByte4 = 64;
            if (!haveByte2) {
              outByte3 = 64;
            }
          }
          output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
        }
        return output.join("");
      },
      /**
       * Base64-encode a string.
       *
       * @param input A string to encode.
       * @param webSafe If true, we should use the
       *     alternative alphabet.
       * @return The base64 encoded string.
       */
      encodeString(input, webSafe) {
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
          return btoa(input);
        }
        return this.encodeByteArray(stringToByteArray$1(input), webSafe);
      },
      /**
       * Base64-decode a string.
       *
       * @param input to decode.
       * @param webSafe True if we should use the
       *     alternative alphabet.
       * @return string representing the decoded value.
       */
      decodeString(input, webSafe) {
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
          return atob(input);
        }
        return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
      },
      /**
       * Base64-decode a string.
       *
       * In base-64 decoding, groups of four characters are converted into three
       * bytes.  If the encoder did not apply padding, the input length may not
       * be a multiple of 4.
       *
       * In this case, the last group will have fewer than 4 characters, and
       * padding will be inferred.  If the group has one or two characters, it decodes
       * to one byte.  If the group has three characters, it decodes to two bytes.
       *
       * @param input Input to decode.
       * @param webSafe True if we should use the web-safe alphabet.
       * @return bytes representing the decoded value.
       */
      decodeStringToByteArray(input, webSafe) {
        this.init_();
        const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
        const output = [];
        for (let i = 0; i < input.length; ) {
          const byte1 = charToByteMap[input.charAt(i++)];
          const haveByte2 = i < input.length;
          const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
          ++i;
          const haveByte3 = i < input.length;
          const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
          ++i;
          const haveByte4 = i < input.length;
          const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
          ++i;
          if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
            throw new DecodeBase64StringError();
          }
          const outByte1 = byte1 << 2 | byte2 >> 4;
          output.push(outByte1);
          if (byte3 !== 64) {
            const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
            output.push(outByte2);
            if (byte4 !== 64) {
              const outByte3 = byte3 << 6 & 192 | byte4;
              output.push(outByte3);
            }
          }
        }
        return output;
      },
      /**
       * Lazy static initialization function. Called before
       * accessing any of the static map variables.
       * @private
       */
      init_() {
        if (!this.byteToCharMap_) {
          this.byteToCharMap_ = {};
          this.charToByteMap_ = {};
          this.byteToCharMapWebSafe_ = {};
          this.charToByteMapWebSafe_ = {};
          for (let i = 0; i < this.ENCODED_VALS.length; i++) {
            this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
            this.charToByteMap_[this.byteToCharMap_[i]] = i;
            this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
            this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
            if (i >= this.ENCODED_VALS_BASE.length) {
              this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
              this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
            }
          }
        }
      }
    };
    DecodeBase64StringError = class extends Error {
      constructor() {
        super(...arguments);
        this.name = "DecodeBase64StringError";
      }
    };
    base64Encode = function(str) {
      const utf8Bytes = stringToByteArray$1(str);
      return base64.encodeByteArray(utf8Bytes, true);
    };
    base64urlEncodeWithoutPadding = function(str) {
      return base64Encode(str).replace(/\./g, "");
    };
    base64Decode = function(str) {
      try {
        return base64.decodeString(str, true);
      } catch (e) {
        console.error("base64Decode failed: ", e);
      }
      return null;
    };
    getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
    getDefaultsFromEnvVariable = () => {
      if (typeof process === "undefined" || typeof process.env === "undefined") {
        return;
      }
      const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
      if (defaultsJsonString) {
        return JSON.parse(defaultsJsonString);
      }
    };
    getDefaultsFromCookie = () => {
      if (typeof document === "undefined") {
        return;
      }
      let match;
      try {
        match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
      } catch (e) {
        return;
      }
      const decoded = match && base64Decode(match[1]);
      return decoded && JSON.parse(decoded);
    };
    getDefaults = () => {
      try {
        return getDefaultsFromPostinstall() || getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
      } catch (e) {
        console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
        return;
      }
    };
    getDefaultAppConfig = () => getDefaults()?.config;
    Deferred = class {
      constructor() {
        this.reject = () => {
        };
        this.resolve = () => {
        };
        this.promise = new Promise((resolve, reject) => {
          this.resolve = resolve;
          this.reject = reject;
        });
      }
      /**
       * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
       * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
       * and returns a node-style callback which will resolve or reject the Deferred's promise.
       */
      wrapCallback(callback) {
        return (error, value) => {
          if (error) {
            this.reject(error);
          } else {
            this.resolve(value);
          }
          if (typeof callback === "function") {
            this.promise.catch(() => {
            });
            if (callback.length === 1) {
              callback(error);
            } else {
              callback(error, value);
            }
          }
        };
      }
    };
    ERROR_NAME = "FirebaseError";
    FirebaseError = class _FirebaseError extends Error {
      constructor(code, message, customData) {
        super(message);
        this.code = code;
        this.customData = customData;
        this.name = ERROR_NAME;
        Object.setPrototypeOf(this, _FirebaseError.prototype);
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, ErrorFactory.prototype.create);
        }
      }
    };
    ErrorFactory = class {
      constructor(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
      }
      create(code, ...data) {
        const customData = data[0] || {};
        const fullCode = `${this.service}/${code}`;
        const template = this.errors[code];
        const message = template ? replaceTemplate(template, customData) : "Error";
        const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
        const error = new FirebaseError(fullCode, fullMessage, customData);
        return error;
      }
    };
    PATTERN = /\{\$([^}]+)}/g;
    DEFAULT_INTERVAL_MILLIS = 1e3;
    DEFAULT_BACKOFF_FACTOR = 2;
    MAX_VALUE_MILLIS = 4 * 60 * 60 * 1e3;
    RANDOM_FACTOR = 0.5;
    CONSTANTS.NODE_CLIENT = true;
  }
});

// ../../StreamingCore-Client/node_modules/@firebase/component/dist/esm/index.esm.js
function normalizeIdentifierForFactory(identifier) {
  return identifier === DEFAULT_ENTRY_NAME ? void 0 : identifier;
}
function isComponentEager(component) {
  return component.instantiationMode === "EAGER";
}
var Component, DEFAULT_ENTRY_NAME, Provider, ComponentContainer;
var init_index_esm = __esm({
  "../../StreamingCore-Client/node_modules/@firebase/component/dist/esm/index.esm.js"() {
    init_index_node_esm();
    Component = class {
      /**
       *
       * @param name The public service name, e.g. app, auth, firestore, database
       * @param instanceFactory Service factory responsible for creating the public interface
       * @param type whether the service provided by the component is public or private
       */
      constructor(name4, instanceFactory, type) {
        this.name = name4;
        this.instanceFactory = instanceFactory;
        this.type = type;
        this.multipleInstances = false;
        this.serviceProps = {};
        this.instantiationMode = "LAZY";
        this.onInstanceCreated = null;
      }
      setInstantiationMode(mode) {
        this.instantiationMode = mode;
        return this;
      }
      setMultipleInstances(multipleInstances) {
        this.multipleInstances = multipleInstances;
        return this;
      }
      setServiceProps(props) {
        this.serviceProps = props;
        return this;
      }
      setInstanceCreatedCallback(callback) {
        this.onInstanceCreated = callback;
        return this;
      }
    };
    DEFAULT_ENTRY_NAME = "[DEFAULT]";
    Provider = class {
      constructor(name4, container) {
        this.name = name4;
        this.container = container;
        this.component = null;
        this.instances = /* @__PURE__ */ new Map();
        this.instancesDeferred = /* @__PURE__ */ new Map();
        this.instancesOptions = /* @__PURE__ */ new Map();
        this.onInitCallbacks = /* @__PURE__ */ new Map();
      }
      /**
       * @param identifier A provider can provide multiple instances of a service
       * if this.component.multipleInstances is true.
       */
      get(identifier) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        if (!this.instancesDeferred.has(normalizedIdentifier)) {
          const deferred = new Deferred();
          this.instancesDeferred.set(normalizedIdentifier, deferred);
          if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
            try {
              const instance2 = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier
              });
              if (instance2) {
                deferred.resolve(instance2);
              }
            } catch (e) {
            }
          }
        }
        return this.instancesDeferred.get(normalizedIdentifier).promise;
      }
      getImmediate(options) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(options?.identifier);
        const optional = options?.optional ?? false;
        if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
          try {
            return this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
          } catch (e) {
            if (optional) {
              return null;
            } else {
              throw e;
            }
          }
        } else {
          if (optional) {
            return null;
          } else {
            throw Error(`Service ${this.name} is not available`);
          }
        }
      }
      getComponent() {
        return this.component;
      }
      setComponent(component) {
        if (component.name !== this.name) {
          throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
        }
        if (this.component) {
          throw Error(`Component for ${this.name} has already been provided`);
        }
        this.component = component;
        if (!this.shouldAutoInitialize()) {
          return;
        }
        if (isComponentEager(component)) {
          try {
            this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME });
          } catch (e) {
          }
        }
        for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
          const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
          try {
            const instance2 = this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
            instanceDeferred.resolve(instance2);
          } catch (e) {
          }
        }
      }
      clearInstance(identifier = DEFAULT_ENTRY_NAME) {
        this.instancesDeferred.delete(identifier);
        this.instancesOptions.delete(identifier);
        this.instances.delete(identifier);
      }
      // app.delete() will call this method on every provider to delete the services
      // TODO: should we mark the provider as deleted?
      async delete() {
        const services = Array.from(this.instances.values());
        await Promise.all([
          ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
          ...services.filter((service) => "_delete" in service).map((service) => service._delete())
        ]);
      }
      isComponentSet() {
        return this.component != null;
      }
      isInitialized(identifier = DEFAULT_ENTRY_NAME) {
        return this.instances.has(identifier);
      }
      getOptions(identifier = DEFAULT_ENTRY_NAME) {
        return this.instancesOptions.get(identifier) || {};
      }
      initialize(opts = {}) {
        const { options = {} } = opts;
        const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
        if (this.isInitialized(normalizedIdentifier)) {
          throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
        }
        if (!this.isComponentSet()) {
          throw Error(`Component ${this.name} has not been registered yet`);
        }
        const instance2 = this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier,
          options
        });
        for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
          const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
          if (normalizedIdentifier === normalizedDeferredIdentifier) {
            instanceDeferred.resolve(instance2);
          }
        }
        return instance2;
      }
      /**
       *
       * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
       * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
       *
       * @param identifier An optional instance identifier
       * @returns a function to unregister the callback
       */
      onInit(callback, identifier) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        const existingCallbacks = this.onInitCallbacks.get(normalizedIdentifier) ?? /* @__PURE__ */ new Set();
        existingCallbacks.add(callback);
        this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
        const existingInstance = this.instances.get(normalizedIdentifier);
        if (existingInstance) {
          callback(existingInstance, normalizedIdentifier);
        }
        return () => {
          existingCallbacks.delete(callback);
        };
      }
      /**
       * Invoke onInit callbacks synchronously
       * @param instance the service instance`
       */
      invokeOnInitCallbacks(instance2, identifier) {
        const callbacks = this.onInitCallbacks.get(identifier);
        if (!callbacks) {
          return;
        }
        for (const callback of callbacks) {
          try {
            callback(instance2, identifier);
          } catch {
          }
        }
      }
      getOrInitializeService({ instanceIdentifier, options = {} }) {
        let instance2 = this.instances.get(instanceIdentifier);
        if (!instance2 && this.component) {
          instance2 = this.component.instanceFactory(this.container, {
            instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
            options
          });
          this.instances.set(instanceIdentifier, instance2);
          this.instancesOptions.set(instanceIdentifier, options);
          this.invokeOnInitCallbacks(instance2, instanceIdentifier);
          if (this.component.onInstanceCreated) {
            try {
              this.component.onInstanceCreated(this.container, instanceIdentifier, instance2);
            } catch {
            }
          }
        }
        return instance2 || null;
      }
      normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME) {
        if (this.component) {
          return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
        } else {
          return identifier;
        }
      }
      shouldAutoInitialize() {
        return !!this.component && this.component.instantiationMode !== "EXPLICIT";
      }
    };
    ComponentContainer = class {
      constructor(name4) {
        this.name = name4;
        this.providers = /* @__PURE__ */ new Map();
      }
      /**
       *
       * @param component Component being added
       * @param overwrite When a component with the same name has already been registered,
       * if overwrite is true: overwrite the existing component with the new component and create a new
       * provider with the new component. It can be useful in tests where you want to use different mocks
       * for different tests.
       * if overwrite is false: throw an exception
       */
      addComponent(component) {
        const provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
          throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
        }
        provider.setComponent(component);
      }
      addOrOverwriteComponent(component) {
        const provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
          this.providers.delete(component.name);
        }
        this.addComponent(component);
      }
      /**
       * getProvider provides a type safe interface where it can only be called with a field name
       * present in NameServiceMapping interface.
       *
       * Firebase SDKs providing services should extend NameServiceMapping interface to register
       * themselves.
       */
      getProvider(name4) {
        if (this.providers.has(name4)) {
          return this.providers.get(name4);
        }
        const provider = new Provider(name4, this);
        this.providers.set(name4, provider);
        return provider;
      }
      getProviders() {
        return Array.from(this.providers.values());
      }
    };
  }
});

// ../../StreamingCore-Client/node_modules/@firebase/logger/dist/esm/index.esm.js
var instances, LogLevel4, levelStringToEnum, defaultLogLevel, ConsoleMethod, defaultLogHandler, Logger;
var init_index_esm2 = __esm({
  "../../StreamingCore-Client/node_modules/@firebase/logger/dist/esm/index.esm.js"() {
    instances = [];
    (function(LogLevel5) {
      LogLevel5[LogLevel5["DEBUG"] = 0] = "DEBUG";
      LogLevel5[LogLevel5["VERBOSE"] = 1] = "VERBOSE";
      LogLevel5[LogLevel5["INFO"] = 2] = "INFO";
      LogLevel5[LogLevel5["WARN"] = 3] = "WARN";
      LogLevel5[LogLevel5["ERROR"] = 4] = "ERROR";
      LogLevel5[LogLevel5["SILENT"] = 5] = "SILENT";
    })(LogLevel4 || (LogLevel4 = {}));
    levelStringToEnum = {
      "debug": LogLevel4.DEBUG,
      "verbose": LogLevel4.VERBOSE,
      "info": LogLevel4.INFO,
      "warn": LogLevel4.WARN,
      "error": LogLevel4.ERROR,
      "silent": LogLevel4.SILENT
    };
    defaultLogLevel = LogLevel4.INFO;
    ConsoleMethod = {
      [LogLevel4.DEBUG]: "log",
      [LogLevel4.VERBOSE]: "log",
      [LogLevel4.INFO]: "info",
      [LogLevel4.WARN]: "warn",
      [LogLevel4.ERROR]: "error"
    };
    defaultLogHandler = (instance2, logType, ...args) => {
      if (logType < instance2.logLevel) {
        return;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const method = ConsoleMethod[logType];
      if (method) {
        console[method](`[${now}]  ${instance2.name}:`, ...args);
      } else {
        throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
      }
    };
    Logger = class {
      /**
       * Gives you an instance of a Logger to capture messages according to
       * Firebase's logging scheme.
       *
       * @param name The name that the logs will be associated with
       */
      constructor(name4) {
        this.name = name4;
        this._logLevel = defaultLogLevel;
        this._logHandler = defaultLogHandler;
        this._userLogHandler = null;
        instances.push(this);
      }
      get logLevel() {
        return this._logLevel;
      }
      set logLevel(val) {
        if (!(val in LogLevel4)) {
          throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
        }
        this._logLevel = val;
      }
      // Workaround for setter/getter having to be the same type.
      setLogLevel(val) {
        this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
      }
      get logHandler() {
        return this._logHandler;
      }
      set logHandler(val) {
        if (typeof val !== "function") {
          throw new TypeError("Value assigned to `logHandler` must be a function");
        }
        this._logHandler = val;
      }
      get userLogHandler() {
        return this._userLogHandler;
      }
      set userLogHandler(val) {
        this._userLogHandler = val;
      }
      /**
       * The functions below are all based on the `console` interface
       */
      debug(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel4.DEBUG, ...args);
        this._logHandler(this, LogLevel4.DEBUG, ...args);
      }
      log(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel4.VERBOSE, ...args);
        this._logHandler(this, LogLevel4.VERBOSE, ...args);
      }
      info(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel4.INFO, ...args);
        this._logHandler(this, LogLevel4.INFO, ...args);
      }
      warn(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel4.WARN, ...args);
        this._logHandler(this, LogLevel4.WARN, ...args);
      }
      error(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel4.ERROR, ...args);
        this._logHandler(this, LogLevel4.ERROR, ...args);
      }
    };
  }
});

// ../../StreamingCore-Client/node_modules/idb/build/wrap-idb-value.js
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  promise.then((value) => {
    if (value instanceof IDBCursor) {
      cursorRequestMap.set(value, request);
    }
  }).catch(() => {
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
    return function(storeNames, ...args) {
      const tx = func.call(unwrap(this), storeNames, ...args);
      transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
      return wrap(tx);
    };
  }
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(cursorRequestMap.get(this));
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var instanceOfAny, idbProxyableTypes, cursorAdvanceMethods, cursorRequestMap, transactionDoneMap, transactionStoreNamesMap, transformCache, reverseTransformCache, idbProxyTraps, unwrap;
var init_wrap_idb_value = __esm({
  "../../StreamingCore-Client/node_modules/idb/build/wrap-idb-value.js"() {
    instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
    cursorRequestMap = /* @__PURE__ */ new WeakMap();
    transactionDoneMap = /* @__PURE__ */ new WeakMap();
    transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
    transformCache = /* @__PURE__ */ new WeakMap();
    reverseTransformCache = /* @__PURE__ */ new WeakMap();
    idbProxyTraps = {
      get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
          if (prop === "done")
            return transactionDoneMap.get(target);
          if (prop === "objectStoreNames") {
            return target.objectStoreNames || transactionStoreNamesMap.get(target);
          }
          if (prop === "store") {
            return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
          }
        }
        return wrap(target[prop]);
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
      has(target, prop) {
        if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
          return true;
        }
        return prop in target;
      }
    };
    unwrap = (value) => reverseTransformCache.get(value);
  }
});

// ../../StreamingCore-Client/node_modules/idb/build/index.js
function openDB(name4, version4, { blocked, upgrade, blocking, terminated } = {}) {
  const request = indexedDB.open(name4, version4);
  const openPromise = wrap(request);
  if (upgrade) {
    request.addEventListener("upgradeneeded", (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
    });
  }
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event.newVersion,
      event
    ));
  }
  openPromise.then((db) => {
    if (terminated)
      db.addEventListener("close", () => terminated());
    if (blocking) {
      db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
    }
  }).catch(() => {
  });
  return openPromise;
}
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
var readMethods, writeMethods, cachedMethods;
var init_build = __esm({
  "../../StreamingCore-Client/node_modules/idb/build/index.js"() {
    init_wrap_idb_value();
    init_wrap_idb_value();
    readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
    writeMethods = ["put", "add", "delete", "clear"];
    cachedMethods = /* @__PURE__ */ new Map();
    replaceTraps((oldTraps) => ({
      ...oldTraps,
      get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
      has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
    }));
  }
});

// ../../StreamingCore-Client/node_modules/@firebase/app/dist/esm/index.esm.js
function isVersionServiceProvider(provider) {
  const component = provider.getComponent();
  return component?.type === "VERSION";
}
function _addComponent(app13, component) {
  try {
    app13.container.addComponent(component);
  } catch (e) {
    logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app13.name}`, e);
  }
}
function _registerComponent(component) {
  const componentName = component.name;
  if (_components.has(componentName)) {
    logger.debug(`There were multiple attempts to register component ${componentName}.`);
    return false;
  }
  _components.set(componentName, component);
  for (const app13 of _apps.values()) {
    _addComponent(app13, component);
  }
  for (const serverApp of _serverApps.values()) {
    _addComponent(serverApp, component);
  }
  return true;
}
function _getProvider(app13, name4) {
  const heartbeatController = app13.container.getProvider("heartbeat").getImmediate({ optional: true });
  if (heartbeatController) {
    void heartbeatController.triggerHeartbeat();
  }
  return app13.container.getProvider(name4);
}
function initializeApp(_options, rawConfig = {}) {
  let options = _options;
  if (typeof rawConfig !== "object") {
    const name5 = rawConfig;
    rawConfig = { name: name5 };
  }
  const config = {
    name: DEFAULT_ENTRY_NAME2,
    automaticDataCollectionEnabled: true,
    ...rawConfig
  };
  const name4 = config.name;
  if (typeof name4 !== "string" || !name4) {
    throw ERROR_FACTORY.create("bad-app-name", {
      appName: String(name4)
    });
  }
  options || (options = getDefaultAppConfig());
  if (!options) {
    throw ERROR_FACTORY.create(
      "no-options"
      /* AppError.NO_OPTIONS */
    );
  }
  const existingApp = _apps.get(name4);
  if (existingApp) {
    if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
      return existingApp;
    } else {
      throw ERROR_FACTORY.create("duplicate-app", { appName: name4 });
    }
  }
  const container = new ComponentContainer(name4);
  for (const component of _components.values()) {
    container.addComponent(component);
  }
  const newApp = new FirebaseAppImpl(options, config, container);
  _apps.set(name4, newApp);
  return newApp;
}
function getApp(name4 = DEFAULT_ENTRY_NAME2) {
  const app13 = _apps.get(name4);
  if (!app13 && name4 === DEFAULT_ENTRY_NAME2 && getDefaultAppConfig()) {
    return initializeApp();
  }
  if (!app13) {
    throw ERROR_FACTORY.create("no-app", { appName: name4 });
  }
  return app13;
}
function registerVersion(libraryKeyOrName, version4, variant) {
  let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
  if (variant) {
    library += `-${variant}`;
  }
  const libraryMismatch = library.match(/\s|\//);
  const versionMismatch = version4.match(/\s|\//);
  if (libraryMismatch || versionMismatch) {
    const warning = [
      `Unable to register library "${library}" with version "${version4}":`
    ];
    if (libraryMismatch) {
      warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
    }
    if (libraryMismatch && versionMismatch) {
      warning.push("and");
    }
    if (versionMismatch) {
      warning.push(`version name "${version4}" contains illegal characters (whitespace or "/")`);
    }
    logger.warn(warning.join(" "));
    return;
  }
  _registerComponent(new Component(
    `${library}-version`,
    () => ({ library, version: version4 }),
    "VERSION"
    /* ComponentType.VERSION */
  ));
}
function getDbPromise() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion) => {
        switch (oldVersion) {
          case 0:
            try {
              db.createObjectStore(STORE_NAME);
            } catch (e) {
              console.warn(e);
            }
        }
      }
    }).catch((e) => {
      throw ERROR_FACTORY.create("idb-open", {
        originalErrorMessage: e.message
      });
    });
  }
  return dbPromise;
}
async function readHeartbeatsFromIndexedDB(app13) {
  try {
    const db = await getDbPromise();
    const tx = db.transaction(STORE_NAME);
    const result = await tx.objectStore(STORE_NAME).get(computeKey(app13));
    await tx.done;
    return result;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create("idb-get", {
        originalErrorMessage: e?.message
      });
      logger.warn(idbGetError.message);
    }
  }
}
async function writeHeartbeatsToIndexedDB(app13, heartbeatObject) {
  try {
    const db = await getDbPromise();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const objectStore = tx.objectStore(STORE_NAME);
    await objectStore.put(heartbeatObject, computeKey(app13));
    await tx.done;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create("idb-set", {
        originalErrorMessage: e?.message
      });
      logger.warn(idbGetError.message);
    }
  }
}
function computeKey(app13) {
  return `${app13.name}!${app13.options.appId}`;
}
function getUTCDateString() {
  const today = /* @__PURE__ */ new Date();
  return today.toISOString().substring(0, 10);
}
function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
  const heartbeatsToSend = [];
  let unsentEntries = heartbeatsCache.slice();
  for (const singleDateHeartbeat of heartbeatsCache) {
    const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
    if (!heartbeatEntry) {
      heartbeatsToSend.push({
        agent: singleDateHeartbeat.agent,
        dates: [singleDateHeartbeat.date]
      });
      if (countBytes(heartbeatsToSend) > maxSize) {
        heartbeatsToSend.pop();
        break;
      }
    } else {
      heartbeatEntry.dates.push(singleDateHeartbeat.date);
      if (countBytes(heartbeatsToSend) > maxSize) {
        heartbeatEntry.dates.pop();
        break;
      }
    }
    unsentEntries = unsentEntries.slice(1);
  }
  return {
    heartbeatsToSend,
    unsentEntries
  };
}
function countBytes(heartbeatsCache) {
  return base64urlEncodeWithoutPadding(
    // heartbeatsCache wrapper properties
    JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
  ).length;
}
function getEarliestHeartbeatIdx(heartbeats) {
  if (heartbeats.length === 0) {
    return -1;
  }
  let earliestHeartbeatIdx = 0;
  let earliestHeartbeatDate = heartbeats[0].date;
  for (let i = 1; i < heartbeats.length; i++) {
    if (heartbeats[i].date < earliestHeartbeatDate) {
      earliestHeartbeatDate = heartbeats[i].date;
      earliestHeartbeatIdx = i;
    }
  }
  return earliestHeartbeatIdx;
}
function registerCoreComponents(variant) {
  _registerComponent(new Component(
    "platform-logger",
    (container) => new PlatformLoggerServiceImpl(container),
    "PRIVATE"
    /* ComponentType.PRIVATE */
  ));
  _registerComponent(new Component(
    "heartbeat",
    (container) => new HeartbeatServiceImpl(container),
    "PRIVATE"
    /* ComponentType.PRIVATE */
  ));
  registerVersion(name$q, version$1, variant);
  registerVersion(name$q, version$1, "esm2020");
  registerVersion("fire-js", "");
}
var PlatformLoggerServiceImpl, name$q, version$1, logger, name$p, name$o, name$n, name$m, name$l, name$k, name$j, name$i, name$h, name$g, name$f, name$e, name$d, name$c, name$b, name$a, name$9, name$8, name$7, name$6, name$5, name$4, name$3, name$2, name$1, name, version, DEFAULT_ENTRY_NAME2, PLATFORM_LOG_STRING, _apps, _serverApps, _components, ERRORS, ERROR_FACTORY, FirebaseAppImpl, SDK_VERSION, DB_NAME, DB_VERSION, STORE_NAME, dbPromise, MAX_HEADER_BYTES, MAX_NUM_STORED_HEARTBEATS, HeartbeatServiceImpl, HeartbeatStorageImpl;
var init_index_esm3 = __esm({
  "../../StreamingCore-Client/node_modules/@firebase/app/dist/esm/index.esm.js"() {
    init_index_esm();
    init_index_esm2();
    init_index_node_esm();
    init_index_node_esm();
    init_build();
    PlatformLoggerServiceImpl = class {
      constructor(container) {
        this.container = container;
      }
      // In initial implementation, this will be called by installations on
      // auth token refresh, and installations will send this string.
      getPlatformInfoString() {
        const providers = this.container.getProviders();
        return providers.map((provider) => {
          if (isVersionServiceProvider(provider)) {
            const service = provider.getImmediate();
            return `${service.library}/${service.version}`;
          } else {
            return null;
          }
        }).filter((logString) => logString).join(" ");
      }
    };
    name$q = "@firebase/app";
    version$1 = "0.14.13";
    logger = new Logger("@firebase/app");
    name$p = "@firebase/app-compat";
    name$o = "@firebase/analytics-compat";
    name$n = "@firebase/analytics";
    name$m = "@firebase/app-check-compat";
    name$l = "@firebase/app-check";
    name$k = "@firebase/auth";
    name$j = "@firebase/auth-compat";
    name$i = "@firebase/database";
    name$h = "@firebase/data-connect";
    name$g = "@firebase/database-compat";
    name$f = "@firebase/functions";
    name$e = "@firebase/functions-compat";
    name$d = "@firebase/installations";
    name$c = "@firebase/installations-compat";
    name$b = "@firebase/messaging";
    name$a = "@firebase/messaging-compat";
    name$9 = "@firebase/performance";
    name$8 = "@firebase/performance-compat";
    name$7 = "@firebase/remote-config";
    name$6 = "@firebase/remote-config-compat";
    name$5 = "@firebase/storage";
    name$4 = "@firebase/storage-compat";
    name$3 = "@firebase/firestore";
    name$2 = "@firebase/ai";
    name$1 = "@firebase/firestore-compat";
    name = "firebase";
    version = "12.14.0";
    DEFAULT_ENTRY_NAME2 = "[DEFAULT]";
    PLATFORM_LOG_STRING = {
      [name$q]: "fire-core",
      [name$p]: "fire-core-compat",
      [name$n]: "fire-analytics",
      [name$o]: "fire-analytics-compat",
      [name$l]: "fire-app-check",
      [name$m]: "fire-app-check-compat",
      [name$k]: "fire-auth",
      [name$j]: "fire-auth-compat",
      [name$i]: "fire-rtdb",
      [name$h]: "fire-data-connect",
      [name$g]: "fire-rtdb-compat",
      [name$f]: "fire-fn",
      [name$e]: "fire-fn-compat",
      [name$d]: "fire-iid",
      [name$c]: "fire-iid-compat",
      [name$b]: "fire-fcm",
      [name$a]: "fire-fcm-compat",
      [name$9]: "fire-perf",
      [name$8]: "fire-perf-compat",
      [name$7]: "fire-rc",
      [name$6]: "fire-rc-compat",
      [name$5]: "fire-gcs",
      [name$4]: "fire-gcs-compat",
      [name$3]: "fire-fst",
      [name$1]: "fire-fst-compat",
      [name$2]: "fire-vertex",
      "fire-js": "fire-js",
      // Platform identifier for JS SDK.
      [name]: "fire-js-all"
    };
    _apps = /* @__PURE__ */ new Map();
    _serverApps = /* @__PURE__ */ new Map();
    _components = /* @__PURE__ */ new Map();
    ERRORS = {
      [
        "no-app"
        /* AppError.NO_APP */
      ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
      [
        "bad-app-name"
        /* AppError.BAD_APP_NAME */
      ]: "Illegal App name: '{$appName}'",
      [
        "duplicate-app"
        /* AppError.DUPLICATE_APP */
      ]: "Firebase App named '{$appName}' already exists with different options or config",
      [
        "app-deleted"
        /* AppError.APP_DELETED */
      ]: "Firebase App named '{$appName}' already deleted",
      [
        "server-app-deleted"
        /* AppError.SERVER_APP_DELETED */
      ]: "Firebase Server App has been deleted",
      [
        "no-options"
        /* AppError.NO_OPTIONS */
      ]: "Need to provide options, when not being deployed to hosting via source.",
      [
        "invalid-app-argument"
        /* AppError.INVALID_APP_ARGUMENT */
      ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
      [
        "invalid-log-argument"
        /* AppError.INVALID_LOG_ARGUMENT */
      ]: "First argument to `onLog` must be null or a function.",
      [
        "idb-open"
        /* AppError.IDB_OPEN */
      ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
      [
        "idb-get"
        /* AppError.IDB_GET */
      ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
      [
        "idb-set"
        /* AppError.IDB_WRITE */
      ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
      [
        "idb-delete"
        /* AppError.IDB_DELETE */
      ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
      [
        "finalization-registry-not-supported"
        /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
      ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
      [
        "invalid-server-app-environment"
        /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
      ]: "FirebaseServerApp is not for use in browser environments."
    };
    ERROR_FACTORY = new ErrorFactory("app", "Firebase", ERRORS);
    FirebaseAppImpl = class {
      constructor(options, config, container) {
        this._isDeleted = false;
        this._options = { ...options };
        this._config = { ...config };
        this._name = config.name;
        this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
        this._container = container;
        this.container.addComponent(new Component(
          "app",
          () => this,
          "PUBLIC"
          /* ComponentType.PUBLIC */
        ));
      }
      get automaticDataCollectionEnabled() {
        this.checkDestroyed();
        return this._automaticDataCollectionEnabled;
      }
      set automaticDataCollectionEnabled(val) {
        this.checkDestroyed();
        this._automaticDataCollectionEnabled = val;
      }
      get name() {
        this.checkDestroyed();
        return this._name;
      }
      get options() {
        this.checkDestroyed();
        return this._options;
      }
      get config() {
        this.checkDestroyed();
        return this._config;
      }
      get container() {
        return this._container;
      }
      get isDeleted() {
        return this._isDeleted;
      }
      set isDeleted(val) {
        this._isDeleted = val;
      }
      /**
       * This function will throw an Error if the App has already been deleted -
       * use before performing API actions on the App.
       */
      checkDestroyed() {
        if (this.isDeleted) {
          throw ERROR_FACTORY.create("app-deleted", { appName: this._name });
        }
      }
    };
    SDK_VERSION = version;
    DB_NAME = "firebase-heartbeat-database";
    DB_VERSION = 1;
    STORE_NAME = "firebase-heartbeat-store";
    dbPromise = null;
    MAX_HEADER_BYTES = 1024;
    MAX_NUM_STORED_HEARTBEATS = 30;
    HeartbeatServiceImpl = class {
      constructor(container) {
        this.container = container;
        this._heartbeatsCache = null;
        const app13 = this.container.getProvider("app").getImmediate();
        this._storage = new HeartbeatStorageImpl(app13);
        this._heartbeatsCachePromise = this._storage.read().then((result) => {
          this._heartbeatsCache = result;
          return result;
        });
      }
      /**
       * Called to report a heartbeat. The function will generate
       * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
       * to IndexedDB.
       * Note that we only store one heartbeat per day. So if a heartbeat for today is
       * already logged, subsequent calls to this function in the same day will be ignored.
       */
      async triggerHeartbeat() {
        try {
          const platformLogger = this.container.getProvider("platform-logger").getImmediate();
          const agent = platformLogger.getPlatformInfoString();
          const date = getUTCDateString();
          if (this._heartbeatsCache?.heartbeats == null) {
            this._heartbeatsCache = await this._heartbeatsCachePromise;
            if (this._heartbeatsCache?.heartbeats == null) {
              return;
            }
          }
          if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
            return;
          } else {
            this._heartbeatsCache.heartbeats.push({ date, agent });
            if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
              const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
              this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
            }
          }
          return this._storage.overwrite(this._heartbeatsCache);
        } catch (e) {
          logger.warn(e);
        }
      }
      /**
       * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
       * It also clears all heartbeats from memory as well as in IndexedDB.
       *
       * NOTE: Consuming product SDKs should not send the header if this method
       * returns an empty string.
       */
      async getHeartbeatsHeader() {
        try {
          if (this._heartbeatsCache === null) {
            await this._heartbeatsCachePromise;
          }
          if (this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) {
            return "";
          }
          const date = getUTCDateString();
          const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
          const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
          this._heartbeatsCache.lastSentHeartbeatDate = date;
          if (unsentEntries.length > 0) {
            this._heartbeatsCache.heartbeats = unsentEntries;
            await this._storage.overwrite(this._heartbeatsCache);
          } else {
            this._heartbeatsCache.heartbeats = [];
            void this._storage.overwrite(this._heartbeatsCache);
          }
          return headerString;
        } catch (e) {
          logger.warn(e);
          return "";
        }
      }
    };
    HeartbeatStorageImpl = class {
      constructor(app13) {
        this.app = app13;
        this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
      }
      async runIndexedDBEnvironmentCheck() {
        if (!isIndexedDBAvailable()) {
          return false;
        } else {
          return validateIndexedDBOpenable().then(() => true).catch(() => false);
        }
      }
      /**
       * Read all heartbeats.
       */
      async read() {
        const canUseIndexedDB = await this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
          return { heartbeats: [] };
        } else {
          const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
          if (idbHeartbeatObject?.heartbeats) {
            return idbHeartbeatObject;
          } else {
            return { heartbeats: [] };
          }
        }
      }
      // overwrite the storage with the provided heartbeats
      async overwrite(heartbeatsObject) {
        const canUseIndexedDB = await this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
          return;
        } else {
          const existingHeartbeatsObject = await this.read();
          return writeHeartbeatsToIndexedDB(this.app, {
            lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
            heartbeats: heartbeatsObject.heartbeats
          });
        }
      }
      // add heartbeats
      async add(heartbeatsObject) {
        const canUseIndexedDB = await this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
          return;
        } else {
          const existingHeartbeatsObject = await this.read();
          return writeHeartbeatsToIndexedDB(this.app, {
            lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
            heartbeats: [
              ...existingHeartbeatsObject.heartbeats,
              ...heartbeatsObject.heartbeats
            ]
          });
        }
      }
    };
    registerCoreComponents("");
  }
});

// ../../StreamingCore-Client/node_modules/@firebase/installations/dist/esm/index.esm.js
function isServerError(error) {
  return error instanceof FirebaseError && error.code.includes(
    "request-failed"
    /* ErrorCode.REQUEST_FAILED */
  );
}
function getInstallationsEndpoint({ projectId }) {
  return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
}
function extractAuthTokenInfoFromResponse(response) {
  return {
    token: response.token,
    requestStatus: 2,
    expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
    creationTime: Date.now()
  };
}
async function getErrorFromResponse(requestName, response) {
  const responseJson = await response.json();
  const errorData = responseJson.error;
  return ERROR_FACTORY2.create("request-failed", {
    requestName,
    serverCode: errorData.code,
    serverMessage: errorData.message,
    serverStatus: errorData.status
  });
}
function getHeaders({ apiKey }) {
  return new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-goog-api-key": apiKey
  });
}
function getHeadersWithAuth(appConfig, { refreshToken }) {
  const headers = getHeaders(appConfig);
  headers.append("Authorization", getAuthorizationHeader(refreshToken));
  return headers;
}
async function retryIfServerError(fn) {
  const result = await fn();
  if (result.status >= 500 && result.status < 600) {
    return fn();
  }
  return result;
}
function getExpiresInFromResponseExpiresIn(responseExpiresIn) {
  return Number(responseExpiresIn.replace("s", "000"));
}
function getAuthorizationHeader(refreshToken) {
  return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
}
async function createInstallationRequest({ appConfig, heartbeatServiceProvider }, { fid }) {
  const endpoint = getInstallationsEndpoint(appConfig);
  const headers = getHeaders(appConfig);
  const heartbeatService = heartbeatServiceProvider.getImmediate({
    optional: true
  });
  if (heartbeatService) {
    const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
    if (heartbeatsHeader) {
      headers.append("x-firebase-client", heartbeatsHeader);
    }
  }
  const body = {
    fid,
    authVersion: INTERNAL_AUTH_VERSION,
    appId: appConfig.appId,
    sdkVersion: PACKAGE_VERSION
  };
  const request = {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  };
  const response = await retryIfServerError(() => fetch(endpoint, request));
  if (response.ok) {
    const responseValue = await response.json();
    const registeredInstallationEntry = {
      fid: responseValue.fid || fid,
      registrationStatus: 2,
      refreshToken: responseValue.refreshToken,
      authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
    };
    return registeredInstallationEntry;
  } else {
    throw await getErrorFromResponse("Create Installation", response);
  }
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function bufferToBase64UrlSafe(array) {
  const b64 = btoa(String.fromCharCode(...array));
  return b64.replace(/\+/g, "-").replace(/\//g, "_");
}
function generateFid() {
  try {
    const fidByteArray = new Uint8Array(17);
    const crypto3 = self.crypto || self.msCrypto;
    crypto3.getRandomValues(fidByteArray);
    fidByteArray[0] = 112 + fidByteArray[0] % 16;
    const fid = encode(fidByteArray);
    return VALID_FID_PATTERN.test(fid) ? fid : INVALID_FID;
  } catch {
    return INVALID_FID;
  }
}
function encode(fidByteArray) {
  const b64String = bufferToBase64UrlSafe(fidByteArray);
  return b64String.substr(0, 22);
}
function getKey(appConfig) {
  return `${appConfig.appName}!${appConfig.appId}`;
}
function fidChanged(appConfig, fid) {
  const key = getKey(appConfig);
  callFidChangeCallbacks(key, fid);
  broadcastFidChange(key, fid);
}
function callFidChangeCallbacks(key, fid) {
  const callbacks = fidChangeCallbacks.get(key);
  if (!callbacks) {
    return;
  }
  for (const callback of callbacks) {
    callback(fid);
  }
}
function broadcastFidChange(key, fid) {
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({ key, fid });
  }
  closeBroadcastChannel();
}
function getBroadcastChannel() {
  if (!broadcastChannel && "BroadcastChannel" in self) {
    broadcastChannel = new BroadcastChannel("[Firebase] FID Change");
    broadcastChannel.onmessage = (e) => {
      callFidChangeCallbacks(e.data.key, e.data.fid);
    };
  }
  return broadcastChannel;
}
function closeBroadcastChannel() {
  if (fidChangeCallbacks.size === 0 && broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
}
function getDbPromise2() {
  if (!dbPromise2) {
    dbPromise2 = openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade: (db, oldVersion) => {
        switch (oldVersion) {
          case 0:
            db.createObjectStore(OBJECT_STORE_NAME);
        }
      }
    });
  }
  return dbPromise2;
}
async function set2(appConfig, value) {
  const key = getKey(appConfig);
  const db = await getDbPromise2();
  const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
  const objectStore = tx.objectStore(OBJECT_STORE_NAME);
  const oldValue = await objectStore.get(key);
  await objectStore.put(value, key);
  await tx.done;
  if (!oldValue || oldValue.fid !== value.fid) {
    fidChanged(appConfig, value.fid);
  }
  return value;
}
async function remove2(appConfig) {
  const key = getKey(appConfig);
  const db = await getDbPromise2();
  const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
  await tx.objectStore(OBJECT_STORE_NAME).delete(key);
  await tx.done;
}
async function update(appConfig, updateFn) {
  const key = getKey(appConfig);
  const db = await getDbPromise2();
  const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
  const store = tx.objectStore(OBJECT_STORE_NAME);
  const oldValue = await store.get(key);
  const newValue = updateFn(oldValue);
  if (newValue === void 0) {
    await store.delete(key);
  } else {
    await store.put(newValue, key);
  }
  await tx.done;
  if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
    fidChanged(appConfig, newValue.fid);
  }
  return newValue;
}
async function getInstallationEntry(installations) {
  let registrationPromise;
  const installationEntry = await update(installations.appConfig, (oldEntry) => {
    const installationEntry2 = updateOrCreateInstallationEntry(oldEntry);
    const entryWithPromise = triggerRegistrationIfNecessary(installations, installationEntry2);
    registrationPromise = entryWithPromise.registrationPromise;
    return entryWithPromise.installationEntry;
  });
  if (installationEntry.fid === INVALID_FID) {
    return { installationEntry: await registrationPromise };
  }
  return {
    installationEntry,
    registrationPromise
  };
}
function updateOrCreateInstallationEntry(oldEntry) {
  const entry = oldEntry || {
    fid: generateFid(),
    registrationStatus: 0
    /* RequestStatus.NOT_STARTED */
  };
  return clearTimedOutRequest(entry);
}
function triggerRegistrationIfNecessary(installations, installationEntry) {
  if (installationEntry.registrationStatus === 0) {
    if (!navigator.onLine) {
      const registrationPromiseWithError = Promise.reject(ERROR_FACTORY2.create(
        "app-offline"
        /* ErrorCode.APP_OFFLINE */
      ));
      return {
        installationEntry,
        registrationPromise: registrationPromiseWithError
      };
    }
    const inProgressEntry = {
      fid: installationEntry.fid,
      registrationStatus: 1,
      registrationTime: Date.now()
    };
    const registrationPromise = registerInstallation(installations, inProgressEntry);
    return { installationEntry: inProgressEntry, registrationPromise };
  } else if (installationEntry.registrationStatus === 1) {
    return {
      installationEntry,
      registrationPromise: waitUntilFidRegistration(installations)
    };
  } else {
    return { installationEntry };
  }
}
async function registerInstallation(installations, installationEntry) {
  try {
    const registeredInstallationEntry = await createInstallationRequest(installations, installationEntry);
    return set2(installations.appConfig, registeredInstallationEntry);
  } catch (e) {
    if (isServerError(e) && e.customData.serverCode === 409) {
      await remove2(installations.appConfig);
    } else {
      await set2(installations.appConfig, {
        fid: installationEntry.fid,
        registrationStatus: 0
        /* RequestStatus.NOT_STARTED */
      });
    }
    throw e;
  }
}
async function waitUntilFidRegistration(installations) {
  let entry = await updateInstallationRequest(installations.appConfig);
  while (entry.registrationStatus === 1) {
    await sleep(100);
    entry = await updateInstallationRequest(installations.appConfig);
  }
  if (entry.registrationStatus === 0) {
    const { installationEntry, registrationPromise } = await getInstallationEntry(installations);
    if (registrationPromise) {
      return registrationPromise;
    } else {
      return installationEntry;
    }
  }
  return entry;
}
function updateInstallationRequest(appConfig) {
  return update(appConfig, (oldEntry) => {
    if (!oldEntry) {
      throw ERROR_FACTORY2.create(
        "installation-not-found"
        /* ErrorCode.INSTALLATION_NOT_FOUND */
      );
    }
    return clearTimedOutRequest(oldEntry);
  });
}
function clearTimedOutRequest(entry) {
  if (hasInstallationRequestTimedOut(entry)) {
    return {
      fid: entry.fid,
      registrationStatus: 0
      /* RequestStatus.NOT_STARTED */
    };
  }
  return entry;
}
function hasInstallationRequestTimedOut(installationEntry) {
  return installationEntry.registrationStatus === 1 && installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now();
}
async function generateAuthTokenRequest({ appConfig, heartbeatServiceProvider }, installationEntry) {
  const endpoint = getGenerateAuthTokenEndpoint(appConfig, installationEntry);
  const headers = getHeadersWithAuth(appConfig, installationEntry);
  const heartbeatService = heartbeatServiceProvider.getImmediate({
    optional: true
  });
  if (heartbeatService) {
    const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
    if (heartbeatsHeader) {
      headers.append("x-firebase-client", heartbeatsHeader);
    }
  }
  const body = {
    installation: {
      sdkVersion: PACKAGE_VERSION,
      appId: appConfig.appId
    }
  };
  const request = {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  };
  const response = await retryIfServerError(() => fetch(endpoint, request));
  if (response.ok) {
    const responseValue = await response.json();
    const completedAuthToken = extractAuthTokenInfoFromResponse(responseValue);
    return completedAuthToken;
  } else {
    throw await getErrorFromResponse("Generate Auth Token", response);
  }
}
function getGenerateAuthTokenEndpoint(appConfig, { fid }) {
  return `${getInstallationsEndpoint(appConfig)}/${fid}/authTokens:generate`;
}
async function refreshAuthToken(installations, forceRefresh = false) {
  let tokenPromise;
  const entry = await update(installations.appConfig, (oldEntry) => {
    if (!isEntryRegistered(oldEntry)) {
      throw ERROR_FACTORY2.create(
        "not-registered"
        /* ErrorCode.NOT_REGISTERED */
      );
    }
    const oldAuthToken = oldEntry.authToken;
    if (!forceRefresh && isAuthTokenValid(oldAuthToken)) {
      return oldEntry;
    } else if (oldAuthToken.requestStatus === 1) {
      tokenPromise = waitUntilAuthTokenRequest(installations, forceRefresh);
      return oldEntry;
    } else {
      if (!navigator.onLine) {
        throw ERROR_FACTORY2.create(
          "app-offline"
          /* ErrorCode.APP_OFFLINE */
        );
      }
      const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
      tokenPromise = fetchAuthTokenFromServer(installations, inProgressEntry);
      return inProgressEntry;
    }
  });
  const authToken = tokenPromise ? await tokenPromise : entry.authToken;
  return authToken;
}
async function waitUntilAuthTokenRequest(installations, forceRefresh) {
  let entry = await updateAuthTokenRequest(installations.appConfig);
  while (entry.authToken.requestStatus === 1) {
    await sleep(100);
    entry = await updateAuthTokenRequest(installations.appConfig);
  }
  const authToken = entry.authToken;
  if (authToken.requestStatus === 0) {
    return refreshAuthToken(installations, forceRefresh);
  } else {
    return authToken;
  }
}
function updateAuthTokenRequest(appConfig) {
  return update(appConfig, (oldEntry) => {
    if (!isEntryRegistered(oldEntry)) {
      throw ERROR_FACTORY2.create(
        "not-registered"
        /* ErrorCode.NOT_REGISTERED */
      );
    }
    const oldAuthToken = oldEntry.authToken;
    if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
      return {
        ...oldEntry,
        authToken: {
          requestStatus: 0
          /* RequestStatus.NOT_STARTED */
        }
      };
    }
    return oldEntry;
  });
}
async function fetchAuthTokenFromServer(installations, installationEntry) {
  try {
    const authToken = await generateAuthTokenRequest(installations, installationEntry);
    const updatedInstallationEntry = {
      ...installationEntry,
      authToken
    };
    await set2(installations.appConfig, updatedInstallationEntry);
    return authToken;
  } catch (e) {
    if (isServerError(e) && (e.customData.serverCode === 401 || e.customData.serverCode === 404)) {
      await remove2(installations.appConfig);
    } else {
      const updatedInstallationEntry = {
        ...installationEntry,
        authToken: {
          requestStatus: 0
          /* RequestStatus.NOT_STARTED */
        }
      };
      await set2(installations.appConfig, updatedInstallationEntry);
    }
    throw e;
  }
}
function isEntryRegistered(installationEntry) {
  return installationEntry !== void 0 && installationEntry.registrationStatus === 2;
}
function isAuthTokenValid(authToken) {
  return authToken.requestStatus === 2 && !isAuthTokenExpired(authToken);
}
function isAuthTokenExpired(authToken) {
  const now = Date.now();
  return now < authToken.creationTime || authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER;
}
function makeAuthTokenRequestInProgressEntry(oldEntry) {
  const inProgressAuthToken = {
    requestStatus: 1,
    requestTime: Date.now()
  };
  return {
    ...oldEntry,
    authToken: inProgressAuthToken
  };
}
function hasAuthTokenRequestTimedOut(authToken) {
  return authToken.requestStatus === 1 && authToken.requestTime + PENDING_TIMEOUT_MS < Date.now();
}
async function getId(installations) {
  const installationsImpl = installations;
  const { installationEntry, registrationPromise } = await getInstallationEntry(installationsImpl);
  if (registrationPromise) {
    registrationPromise.catch(console.error);
  } else {
    refreshAuthToken(installationsImpl).catch(console.error);
  }
  return installationEntry.fid;
}
async function getToken(installations, forceRefresh = false) {
  const installationsImpl = installations;
  await completeInstallationRegistration(installationsImpl);
  const authToken = await refreshAuthToken(installationsImpl, forceRefresh);
  return authToken.token;
}
async function completeInstallationRegistration(installations) {
  const { registrationPromise } = await getInstallationEntry(installations);
  if (registrationPromise) {
    await registrationPromise;
  }
}
function extractAppConfig(app13) {
  if (!app13 || !app13.options) {
    throw getMissingValueError("App Configuration");
  }
  if (!app13.name) {
    throw getMissingValueError("App Name");
  }
  const configKeys = [
    "projectId",
    "apiKey",
    "appId"
  ];
  for (const keyName of configKeys) {
    if (!app13.options[keyName]) {
      throw getMissingValueError(keyName);
    }
  }
  return {
    appName: app13.name,
    projectId: app13.options.projectId,
    apiKey: app13.options.apiKey,
    appId: app13.options.appId
  };
}
function getMissingValueError(valueName) {
  return ERROR_FACTORY2.create("missing-app-config-values", {
    valueName
  });
}
function registerInstallations() {
  _registerComponent(new Component(
    INSTALLATIONS_NAME,
    publicFactory,
    "PUBLIC"
    /* ComponentType.PUBLIC */
  ));
  _registerComponent(new Component(
    INSTALLATIONS_NAME_INTERNAL,
    internalFactory,
    "PRIVATE"
    /* ComponentType.PRIVATE */
  ));
}
var name2, version2, PENDING_TIMEOUT_MS, PACKAGE_VERSION, INTERNAL_AUTH_VERSION, INSTALLATIONS_API_URL, TOKEN_EXPIRATION_BUFFER, SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP, ERROR_FACTORY2, VALID_FID_PATTERN, INVALID_FID, fidChangeCallbacks, broadcastChannel, DATABASE_NAME, DATABASE_VERSION, OBJECT_STORE_NAME, dbPromise2, INSTALLATIONS_NAME, INSTALLATIONS_NAME_INTERNAL, publicFactory, internalFactory;
var init_index_esm4 = __esm({
  "../../StreamingCore-Client/node_modules/@firebase/installations/dist/esm/index.esm.js"() {
    init_index_esm3();
    init_index_esm();
    init_index_node_esm();
    init_build();
    name2 = "@firebase/installations";
    version2 = "0.6.22";
    PENDING_TIMEOUT_MS = 1e4;
    PACKAGE_VERSION = `w:${version2}`;
    INTERNAL_AUTH_VERSION = "FIS_v2";
    INSTALLATIONS_API_URL = "https://firebaseinstallations.googleapis.com/v1";
    TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1e3;
    SERVICE = "installations";
    SERVICE_NAME = "Installations";
    ERROR_DESCRIPTION_MAP = {
      [
        "missing-app-config-values"
        /* ErrorCode.MISSING_APP_CONFIG_VALUES */
      ]: 'Missing App configuration value: "{$valueName}"',
      [
        "not-registered"
        /* ErrorCode.NOT_REGISTERED */
      ]: "Firebase Installation is not registered.",
      [
        "installation-not-found"
        /* ErrorCode.INSTALLATION_NOT_FOUND */
      ]: "Firebase Installation not found.",
      [
        "request-failed"
        /* ErrorCode.REQUEST_FAILED */
      ]: '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
      [
        "app-offline"
        /* ErrorCode.APP_OFFLINE */
      ]: "Could not process request. Application offline.",
      [
        "delete-pending-registration"
        /* ErrorCode.DELETE_PENDING_REGISTRATION */
      ]: "Can't delete installation while there is a pending registration request."
    };
    ERROR_FACTORY2 = new ErrorFactory(SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP);
    VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
    INVALID_FID = "";
    fidChangeCallbacks = /* @__PURE__ */ new Map();
    broadcastChannel = null;
    DATABASE_NAME = "firebase-installations-database";
    DATABASE_VERSION = 1;
    OBJECT_STORE_NAME = "firebase-installations-store";
    dbPromise2 = null;
    INSTALLATIONS_NAME = "installations";
    INSTALLATIONS_NAME_INTERNAL = "installations-internal";
    publicFactory = (container) => {
      const app13 = container.getProvider("app").getImmediate();
      const appConfig = extractAppConfig(app13);
      const heartbeatServiceProvider = _getProvider(app13, "heartbeat");
      const installationsImpl = {
        app: app13,
        appConfig,
        heartbeatServiceProvider,
        _delete: () => Promise.resolve()
      };
      return installationsImpl;
    };
    internalFactory = (container) => {
      const app13 = container.getProvider("app").getImmediate();
      const installations = _getProvider(app13, INSTALLATIONS_NAME).getImmediate();
      const installationsInternal = {
        getId: () => getId(installations),
        getToken: (forceRefresh) => getToken(installations, forceRefresh)
      };
      return installationsInternal;
    };
    registerInstallations();
    registerVersion(name2, version2);
    registerVersion(name2, version2, "esm2020");
  }
});

// ../../StreamingCore-Client/node_modules/@firebase/remote-config/dist/esm/index.esm.js
function hasErrorCode(e, errorCode) {
  return e instanceof FirebaseError && e.code.indexOf(errorCode) !== -1;
}
function getRemoteConfig(app13 = getApp(), options = {}) {
  app13 = getModularInstance(app13);
  const rcProvider = _getProvider(app13, RC_COMPONENT_NAME);
  if (rcProvider.isInitialized()) {
    const initialOptions = rcProvider.getOptions();
    if (deepEqual(initialOptions, options)) {
      return rcProvider.getImmediate();
    }
    throw ERROR_FACTORY3.create(
      "already-initialized"
      /* ErrorCode.ALREADY_INITIALIZED */
    );
  }
  rcProvider.initialize({ options });
  const rc = rcProvider.getImmediate();
  if (options.initialFetchResponse) {
    rc._initializePromise = Promise.all([
      rc._storage.setLastSuccessfulFetchResponse(options.initialFetchResponse),
      rc._storage.setActiveConfigEtag(options.initialFetchResponse?.eTag || ""),
      rc._storage.setActiveConfigTemplateVersion(options.initialFetchResponse.templateVersion || 0),
      rc._storageCache.setLastSuccessfulFetchTimestampMillis(Date.now()),
      rc._storageCache.setLastFetchStatus("success"),
      rc._storageCache.setActiveConfig(options.initialFetchResponse?.config || {})
    ]).then();
    rc._isInitializationComplete = true;
  }
  return rc;
}
async function activate(remoteConfig) {
  const rc = getModularInstance(remoteConfig);
  const [lastSuccessfulFetchResponse, activeConfigEtag] = await Promise.all([
    rc._storage.getLastSuccessfulFetchResponse(),
    rc._storage.getActiveConfigEtag()
  ]);
  if (!lastSuccessfulFetchResponse || !lastSuccessfulFetchResponse.config || !lastSuccessfulFetchResponse.eTag || !lastSuccessfulFetchResponse.templateVersion || lastSuccessfulFetchResponse.eTag === activeConfigEtag) {
    return false;
  }
  const experiment = new Experiment(rc);
  const updateActiveExperiments = experiment.updateActiveExperiments(lastSuccessfulFetchResponse.experiments || []);
  await Promise.all([
    rc._storageCache.setActiveConfig(lastSuccessfulFetchResponse.config),
    rc._storage.setActiveConfigEtag(lastSuccessfulFetchResponse.eTag),
    rc._storage.setActiveConfigTemplateVersion(lastSuccessfulFetchResponse.templateVersion),
    updateActiveExperiments
  ]);
  return true;
}
function ensureInitialized(remoteConfig) {
  const rc = getModularInstance(remoteConfig);
  if (!rc._initializePromise) {
    rc._initializePromise = rc._storageCache.loadFromStorage().then(() => {
      rc._isInitializationComplete = true;
    });
  }
  return rc._initializePromise;
}
async function fetchConfig(remoteConfig) {
  const rc = getModularInstance(remoteConfig);
  const abortSignal = new RemoteConfigAbortSignal();
  setTimeout(async () => {
    abortSignal.abort();
  }, rc.settings.fetchTimeoutMillis);
  const customSignals = rc._storageCache.getCustomSignals();
  if (customSignals) {
    rc._logger.debug(`Fetching config with custom signals: ${JSON.stringify(customSignals)}`);
  }
  try {
    await rc._client.fetch({
      cacheMaxAgeMillis: rc.settings.minimumFetchIntervalMillis,
      signal: abortSignal,
      customSignals
    });
    await rc._storageCache.setLastFetchStatus("success");
  } catch (e) {
    const lastFetchStatus = hasErrorCode(
      e,
      "fetch-throttle"
      /* ErrorCode.FETCH_THROTTLE */
    ) ? "throttle" : "failure";
    await rc._storageCache.setLastFetchStatus(lastFetchStatus);
    throw e;
  }
}
function getValue(remoteConfig, key) {
  const rc = getModularInstance(remoteConfig);
  if (!rc._isInitializationComplete) {
    rc._logger.debug(`A value was requested for key "${key}" before SDK initialization completed. Await on ensureInitialized if the intent was to get a previously activated value.`);
  }
  const activeConfig = rc._storageCache.getActiveConfig();
  if (activeConfig && activeConfig[key] !== void 0) {
    return new Value("remote", activeConfig[key]);
  } else if (rc.defaultConfig && rc.defaultConfig[key] !== void 0) {
    return new Value("default", String(rc.defaultConfig[key]));
  }
  rc._logger.debug(`Returning static value for key "${key}". Define a default or remote value if this is unintentional.`);
  return new Value("static");
}
function getUserLanguage(navigatorLanguage = navigator) {
  return (
    // Most reliable, but only supported in Chrome/Firefox.
    navigatorLanguage.languages && navigatorLanguage.languages[0] || // Supported in most browsers, but returns the language of the browser
    // UI, not the language set in browser settings.
    navigatorLanguage.language
  );
}
function setAbortableTimeout(signal, throttleEndTimeMillis) {
  return new Promise((resolve, reject) => {
    const backoffMillis = Math.max(throttleEndTimeMillis - Date.now(), 0);
    const timeout = setTimeout(resolve, backoffMillis);
    signal.addEventListener(() => {
      clearTimeout(timeout);
      reject(ERROR_FACTORY3.create("fetch-throttle", {
        throttleEndTimeMillis
      }));
    });
  });
}
function isRetriableError(e) {
  if (!(e instanceof FirebaseError) || !e.customData) {
    return false;
  }
  const httpStatus = Number(e.customData["httpStatus"]);
  return httpStatus === 429 || httpStatus === 500 || httpStatus === 503 || httpStatus === 504;
}
function toFirebaseError(event, errorCode) {
  const originalError = event.target.error || void 0;
  return ERROR_FACTORY3.create(errorCode, {
    originalErrorMessage: originalError && originalError?.message
  });
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME2, DB_VERSION2);
      request.onerror = (event) => {
        reject(toFirebaseError(
          event,
          "storage-open"
          /* ErrorCode.STORAGE_OPEN */
        ));
      };
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        switch (event.oldVersion) {
          case 0:
            db.createObjectStore(APP_NAMESPACE_STORE, {
              keyPath: "compositeKey"
            });
        }
      };
    } catch (error) {
      reject(ERROR_FACTORY3.create("storage-open", {
        originalErrorMessage: error?.message
      }));
    }
  });
}
function mergeCustomSignals(customSignals, storedSignals) {
  const combinedSignals = {
    ...storedSignals,
    ...customSignals
  };
  const updatedSignals = Object.fromEntries(Object.entries(combinedSignals).filter(([_, v]) => v !== null).map(([k, v]) => {
    if (typeof v === "number") {
      return [k, v.toString()];
    }
    return [k, v];
  }));
  if (Object.keys(updatedSignals).length > RC_CUSTOM_SIGNAL_MAX_ALLOWED_SIGNALS) {
    throw ERROR_FACTORY3.create("custom-signal-max-allowed-signals", {
      maxSignals: RC_CUSTOM_SIGNAL_MAX_ALLOWED_SIGNALS
    });
  }
  return updatedSignals;
}
function registerRemoteConfig() {
  _registerComponent(new Component(
    RC_COMPONENT_NAME,
    remoteConfigFactory,
    "PUBLIC"
    /* ComponentType.PUBLIC */
  ).setMultipleInstances(true));
  registerVersion(name3, version3);
  registerVersion(name3, version3, "esm2020");
  function remoteConfigFactory(container, { options }) {
    const app13 = container.getProvider("app").getImmediate();
    const installations = container.getProvider("installations-internal").getImmediate();
    const analyticsProvider = container.getProvider("analytics-internal");
    const { projectId, apiKey, appId } = app13.options;
    if (!projectId) {
      throw ERROR_FACTORY3.create(
        "registration-project-id"
        /* ErrorCode.REGISTRATION_PROJECT_ID */
      );
    }
    if (!apiKey) {
      throw ERROR_FACTORY3.create(
        "registration-api-key"
        /* ErrorCode.REGISTRATION_API_KEY */
      );
    }
    if (!appId) {
      throw ERROR_FACTORY3.create(
        "registration-app-id"
        /* ErrorCode.REGISTRATION_APP_ID */
      );
    }
    const namespace = options?.templateId || "firebase";
    const storage = isIndexedDBAvailable() ? new IndexedDbStorage(appId, app13.name, namespace) : new InMemoryStorage();
    const storageCache = new StorageCache(storage);
    const logger2 = new Logger(name3);
    logger2.logLevel = LogLevel4.ERROR;
    const restClient = new RestClient(
      installations,
      // Uses the JS SDK version, by which the RC package version can be deduced, if necessary.
      SDK_VERSION,
      namespace,
      projectId,
      apiKey,
      appId
    );
    const retryingClient = new RetryingClient(restClient, storage);
    const cachingClient = new CachingClient(retryingClient, storage, storageCache, logger2);
    const realtimeHandler = new RealtimeHandler(installations, storage, SDK_VERSION, namespace, projectId, apiKey, appId, logger2, storageCache, cachingClient);
    const remoteConfigInstance = new RemoteConfig(app13, cachingClient, storageCache, storage, logger2, realtimeHandler, analyticsProvider);
    ensureInitialized(remoteConfigInstance);
    return remoteConfigInstance;
  }
}
async function fetchAndActivate(remoteConfig) {
  remoteConfig = getModularInstance(remoteConfig);
  await fetchConfig(remoteConfig);
  return activate(remoteConfig);
}
var name3, version3, RemoteConfigAbortSignal, RC_COMPONENT_NAME, RC_CUSTOM_SIGNAL_MAX_ALLOWED_SIGNALS, ERROR_DESCRIPTION_MAP2, ERROR_FACTORY3, DEFAULT_VALUE_FOR_BOOLEAN, DEFAULT_VALUE_FOR_STRING, DEFAULT_VALUE_FOR_NUMBER, BOOLEAN_TRUTHY_VALUES, Value, Experiment, CachingClient, RestClient, RetryingClient, DEFAULT_FETCH_TIMEOUT_MILLIS, DEFAULT_CACHE_MAX_AGE_MILLIS, RemoteConfig, APP_NAMESPACE_STORE, DB_NAME2, DB_VERSION2, Storage, IndexedDbStorage, InMemoryStorage, StorageCache, EventEmitter, VisibilityMonitor, API_KEY_HEADER, INSTALLATIONS_AUTH_TOKEN_HEADER, ORIGINAL_RETRIES, MAXIMUM_FETCH_ATTEMPTS, NO_BACKOFF_TIME_IN_MILLIS, NO_FAILED_REALTIME_STREAMS, REALTIME_DISABLED_KEY, REALTIME_RETRY_INTERVAL, TEMPLATE_VERSION_KEY, RealtimeHandler;
var init_index_esm5 = __esm({
  "../../StreamingCore-Client/node_modules/@firebase/remote-config/dist/esm/index.esm.js"() {
    init_index_esm3();
    init_index_node_esm();
    init_index_esm();
    init_index_esm2();
    init_index_esm4();
    name3 = "@firebase/remote-config";
    version3 = "0.8.4";
    RemoteConfigAbortSignal = class {
      constructor() {
        this.listeners = [];
      }
      addEventListener(listener) {
        this.listeners.push(listener);
      }
      abort() {
        this.listeners.forEach((listener) => listener());
      }
    };
    RC_COMPONENT_NAME = "remote-config";
    RC_CUSTOM_SIGNAL_MAX_ALLOWED_SIGNALS = 100;
    ERROR_DESCRIPTION_MAP2 = {
      [
        "already-initialized"
        /* ErrorCode.ALREADY_INITIALIZED */
      ]: "Remote Config already initialized",
      [
        "registration-window"
        /* ErrorCode.REGISTRATION_WINDOW */
      ]: "Undefined window object. This SDK only supports usage in a browser environment.",
      [
        "registration-project-id"
        /* ErrorCode.REGISTRATION_PROJECT_ID */
      ]: "Undefined project identifier. Check Firebase app initialization.",
      [
        "registration-api-key"
        /* ErrorCode.REGISTRATION_API_KEY */
      ]: "Undefined API key. Check Firebase app initialization.",
      [
        "registration-app-id"
        /* ErrorCode.REGISTRATION_APP_ID */
      ]: "Undefined app identifier. Check Firebase app initialization.",
      [
        "storage-open"
        /* ErrorCode.STORAGE_OPEN */
      ]: "Error thrown when opening storage. Original error: {$originalErrorMessage}.",
      [
        "storage-get"
        /* ErrorCode.STORAGE_GET */
      ]: "Error thrown when reading from storage. Original error: {$originalErrorMessage}.",
      [
        "storage-set"
        /* ErrorCode.STORAGE_SET */
      ]: "Error thrown when writing to storage. Original error: {$originalErrorMessage}.",
      [
        "storage-delete"
        /* ErrorCode.STORAGE_DELETE */
      ]: "Error thrown when deleting from storage. Original error: {$originalErrorMessage}.",
      [
        "fetch-client-network"
        /* ErrorCode.FETCH_NETWORK */
      ]: "Fetch client failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.",
      [
        "fetch-timeout"
        /* ErrorCode.FETCH_TIMEOUT */
      ]: 'The config fetch request timed out.  Configure timeout using "fetchTimeoutMillis" SDK setting.',
      [
        "fetch-throttle"
        /* ErrorCode.FETCH_THROTTLE */
      ]: 'The config fetch request timed out while in an exponential backoff state. Configure timeout using "fetchTimeoutMillis" SDK setting. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.',
      [
        "fetch-client-parse"
        /* ErrorCode.FETCH_PARSE */
      ]: "Fetch client could not parse response. Original error: {$originalErrorMessage}.",
      [
        "fetch-status"
        /* ErrorCode.FETCH_STATUS */
      ]: "Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.",
      [
        "indexed-db-unavailable"
        /* ErrorCode.INDEXED_DB_UNAVAILABLE */
      ]: "Indexed DB is not supported by current browser",
      [
        "custom-signal-max-allowed-signals"
        /* ErrorCode.CUSTOM_SIGNAL_MAX_ALLOWED_SIGNALS */
      ]: "Setting more than {$maxSignals} custom signals is not supported.",
      [
        "stream-error"
        /* ErrorCode.CONFIG_UPDATE_STREAM_ERROR */
      ]: "The stream was not able to connect to the backend: {$originalErrorMessage}.",
      [
        "realtime-unavailable"
        /* ErrorCode.CONFIG_UPDATE_UNAVAILABLE */
      ]: "The Realtime service is unavailable: {$originalErrorMessage}",
      [
        "update-message-invalid"
        /* ErrorCode.CONFIG_UPDATE_MESSAGE_INVALID */
      ]: "The stream invalidation message was unparsable: {$originalErrorMessage}",
      [
        "update-not-fetched"
        /* ErrorCode.CONFIG_UPDATE_NOT_FETCHED */
      ]: "Unable to fetch the latest config: {$originalErrorMessage}",
      [
        "analytics-unavailable"
        /* ErrorCode.ANALYTICS_UNAVAILABLE */
      ]: "Connection to Firebase Analytics failed: {$originalErrorMessage}"
    };
    ERROR_FACTORY3 = new ErrorFactory("remoteconfig", "Remote Config", ERROR_DESCRIPTION_MAP2);
    DEFAULT_VALUE_FOR_BOOLEAN = false;
    DEFAULT_VALUE_FOR_STRING = "";
    DEFAULT_VALUE_FOR_NUMBER = 0;
    BOOLEAN_TRUTHY_VALUES = ["1", "true", "t", "yes", "y", "on"];
    Value = class {
      constructor(_source, _value = DEFAULT_VALUE_FOR_STRING) {
        this._source = _source;
        this._value = _value;
      }
      asString() {
        return this._value;
      }
      asBoolean() {
        if (this._source === "static") {
          return DEFAULT_VALUE_FOR_BOOLEAN;
        }
        return BOOLEAN_TRUTHY_VALUES.indexOf(this._value.toLowerCase()) >= 0;
      }
      asNumber() {
        if (this._source === "static") {
          return DEFAULT_VALUE_FOR_NUMBER;
        }
        let num = Number(this._value);
        if (isNaN(num)) {
          num = DEFAULT_VALUE_FOR_NUMBER;
        }
        return num;
      }
      getSource() {
        return this._source;
      }
    };
    Experiment = class {
      constructor(rc) {
        this.storage = rc._storage;
        this.logger = rc._logger;
        this.analyticsProvider = rc._analyticsProvider;
      }
      async updateActiveExperiments(latestExperiments) {
        const currentActiveExperiments = await this.storage.getActiveExperiments() || /* @__PURE__ */ new Set();
        const experimentInfoMap = this.createExperimentInfoMap(latestExperiments);
        this.addActiveExperiments(experimentInfoMap);
        this.removeInactiveExperiments(currentActiveExperiments, experimentInfoMap);
        return this.storage.setActiveExperiments(new Set(experimentInfoMap.keys()));
      }
      createExperimentInfoMap(latestExperiments) {
        const experimentInfoMap = /* @__PURE__ */ new Map();
        for (const experiment of latestExperiments) {
          experimentInfoMap.set(experiment.experimentId, experiment);
        }
        return experimentInfoMap;
      }
      addActiveExperiments(experimentInfoMap) {
        const customProperty = {};
        for (const [experimentId, experimentInfo] of experimentInfoMap.entries()) {
          customProperty[`firebase${experimentId}`] = experimentInfo.variantId;
        }
        this.addExperimentToAnalytics(customProperty);
      }
      removeInactiveExperiments(currentActiveExperiments, experimentInfoMap) {
        const customProperty = {};
        for (const experimentId of currentActiveExperiments) {
          if (!experimentInfoMap.has(experimentId)) {
            customProperty[`firebase${experimentId}`] = null;
          }
        }
        this.addExperimentToAnalytics(customProperty);
      }
      addExperimentToAnalytics(customProperty) {
        if (Object.keys(customProperty).length === 0) {
          return;
        }
        try {
          const analytics = this.analyticsProvider.getImmediate({ optional: true });
          if (analytics) {
            analytics.setUserProperties(customProperty);
            analytics.logEvent(`set_firebase_experiment_state`);
          } else {
            this.logger.warn(`Analytics import failed. Verify if you have imported Firebase Analytics in your app code.`);
          }
        } catch (error) {
          throw ERROR_FACTORY3.create("analytics-unavailable", {
            originalErrorMessage: error?.message
          });
        }
      }
    };
    CachingClient = class {
      constructor(client3, storage, storageCache, logger2) {
        this.client = client3;
        this.storage = storage;
        this.storageCache = storageCache;
        this.logger = logger2;
      }
      /**
       * Returns true if the age of the cached fetched configs is less than or equal to
       * {@link Settings#minimumFetchIntervalInSeconds}.
       *
       * <p>This is comparable to passing `headers = { 'Cache-Control': max-age <maxAge> }` to the
       * native Fetch API.
       *
       * <p>Visible for testing.
       */
      isCachedDataFresh(cacheMaxAgeMillis, lastSuccessfulFetchTimestampMillis) {
        if (!lastSuccessfulFetchTimestampMillis) {
          this.logger.debug("Config fetch cache check. Cache unpopulated.");
          return false;
        }
        const cacheAgeMillis = Date.now() - lastSuccessfulFetchTimestampMillis;
        const isCachedDataFresh = cacheAgeMillis <= cacheMaxAgeMillis;
        this.logger.debug(`Config fetch cache check. Cache age millis: ${cacheAgeMillis}. Cache max age millis (minimumFetchIntervalMillis setting): ${cacheMaxAgeMillis}. Is cache hit: ${isCachedDataFresh}.`);
        return isCachedDataFresh;
      }
      async fetch(request) {
        const [lastSuccessfulFetchTimestampMillis, lastSuccessfulFetchResponse] = await Promise.all([
          this.storage.getLastSuccessfulFetchTimestampMillis(),
          this.storage.getLastSuccessfulFetchResponse()
        ]);
        if (lastSuccessfulFetchResponse && this.isCachedDataFresh(request.cacheMaxAgeMillis, lastSuccessfulFetchTimestampMillis)) {
          return lastSuccessfulFetchResponse;
        }
        request.eTag = lastSuccessfulFetchResponse && lastSuccessfulFetchResponse.eTag;
        const response = await this.client.fetch(request);
        const storageOperations = [
          // Uses write-through cache for consistency with synchronous public API.
          this.storageCache.setLastSuccessfulFetchTimestampMillis(Date.now())
        ];
        if (response.status === 200) {
          storageOperations.push(this.storage.setLastSuccessfulFetchResponse(response));
        }
        await Promise.all(storageOperations);
        return response;
      }
    };
    RestClient = class {
      constructor(firebaseInstallations, sdkVersion, namespace, projectId, apiKey, appId) {
        this.firebaseInstallations = firebaseInstallations;
        this.sdkVersion = sdkVersion;
        this.namespace = namespace;
        this.projectId = projectId;
        this.apiKey = apiKey;
        this.appId = appId;
      }
      /**
       * Fetches from the Remote Config REST API.
       *
       * @throws a {@link ErrorCode.FETCH_NETWORK} error if {@link GlobalFetch#fetch} can't
       * connect to the network.
       * @throws a {@link ErrorCode.FETCH_PARSE} error if {@link Response#json} can't parse the
       * fetch response.
       * @throws a {@link ErrorCode.FETCH_STATUS} error if the service returns an HTTP error status.
       */
      async fetch(request) {
        const [installationId, installationToken] = await Promise.all([
          this.firebaseInstallations.getId(),
          this.firebaseInstallations.getToken()
        ]);
        const urlBase = window.FIREBASE_REMOTE_CONFIG_URL_BASE || "https://firebaseremoteconfig.googleapis.com";
        const url = `${urlBase}/v1/projects/${this.projectId}/namespaces/${this.namespace}:fetch?key=${this.apiKey}`;
        const headers = {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          // Deviates from pure decorator by not passing max-age header since we don't currently have
          // service behavior using that header.
          "If-None-Match": request.eTag || "*"
          // TODO: Add this header once CORS error is fixed internally.
          //'X-Firebase-RC-Fetch-Type': `${fetchType}/${fetchAttempt}`
        };
        const requestBody = {
          /* eslint-disable camelcase */
          sdk_version: this.sdkVersion,
          app_instance_id: installationId,
          app_instance_id_token: installationToken,
          app_id: this.appId,
          language_code: getUserLanguage(),
          custom_signals: request.customSignals
          /* eslint-enable camelcase */
        };
        const options = {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody)
        };
        const fetchPromise = fetch(url, options);
        const timeoutPromise = new Promise((_resolve, reject) => {
          request.signal.addEventListener(() => {
            const error = new Error("The operation was aborted.");
            error.name = "AbortError";
            reject(error);
          });
        });
        let response;
        try {
          await Promise.race([fetchPromise, timeoutPromise]);
          response = await fetchPromise;
        } catch (originalError) {
          let errorCode = "fetch-client-network";
          if (originalError?.name === "AbortError") {
            errorCode = "fetch-timeout";
          }
          throw ERROR_FACTORY3.create(errorCode, {
            originalErrorMessage: originalError?.message
          });
        }
        let status = response.status;
        const responseEtag = response.headers.get("ETag") || void 0;
        let config;
        let state;
        let templateVersion;
        let experiments;
        if (response.status === 200) {
          let responseBody;
          try {
            responseBody = await response.json();
          } catch (originalError) {
            throw ERROR_FACTORY3.create("fetch-client-parse", {
              originalErrorMessage: originalError?.message
            });
          }
          config = responseBody["entries"];
          state = responseBody["state"];
          templateVersion = responseBody["templateVersion"];
          experiments = responseBody["experimentDescriptions"];
        }
        if (state === "INSTANCE_STATE_UNSPECIFIED") {
          status = 500;
        } else if (state === "NO_CHANGE") {
          status = 304;
        } else if (state === "NO_TEMPLATE" || state === "EMPTY_CONFIG") {
          config = {};
          experiments = [];
        }
        if (status !== 304 && status !== 200) {
          throw ERROR_FACTORY3.create("fetch-status", {
            httpStatus: status
          });
        }
        return { status, eTag: responseEtag, config, templateVersion, experiments };
      }
    };
    RetryingClient = class {
      constructor(client3, storage) {
        this.client = client3;
        this.storage = storage;
      }
      async fetch(request) {
        const throttleMetadata = await this.storage.getThrottleMetadata() || {
          backoffCount: 0,
          throttleEndTimeMillis: Date.now()
        };
        return this.attemptFetch(request, throttleMetadata);
      }
      /**
       * A recursive helper for attempting a fetch request repeatedly.
       *
       * @throws any non-retriable errors.
       */
      async attemptFetch(request, { throttleEndTimeMillis, backoffCount }) {
        await setAbortableTimeout(request.signal, throttleEndTimeMillis);
        try {
          const response = await this.client.fetch(request);
          await this.storage.deleteThrottleMetadata();
          return response;
        } catch (e) {
          if (!isRetriableError(e)) {
            throw e;
          }
          const throttleMetadata = {
            throttleEndTimeMillis: Date.now() + calculateBackoffMillis(backoffCount),
            backoffCount: backoffCount + 1
          };
          await this.storage.setThrottleMetadata(throttleMetadata);
          return this.attemptFetch(request, throttleMetadata);
        }
      }
    };
    DEFAULT_FETCH_TIMEOUT_MILLIS = 60 * 1e3;
    DEFAULT_CACHE_MAX_AGE_MILLIS = 12 * 60 * 60 * 1e3;
    RemoteConfig = class {
      get fetchTimeMillis() {
        return this._storageCache.getLastSuccessfulFetchTimestampMillis() || -1;
      }
      get lastFetchStatus() {
        return this._storageCache.getLastFetchStatus() || "no-fetch-yet";
      }
      constructor(app13, _client, _storageCache, _storage, _logger, _realtimeHandler, _analyticsProvider) {
        this.app = app13;
        this._client = _client;
        this._storageCache = _storageCache;
        this._storage = _storage;
        this._logger = _logger;
        this._realtimeHandler = _realtimeHandler;
        this._analyticsProvider = _analyticsProvider;
        this._isInitializationComplete = false;
        this.settings = {
          fetchTimeoutMillis: DEFAULT_FETCH_TIMEOUT_MILLIS,
          minimumFetchIntervalMillis: DEFAULT_CACHE_MAX_AGE_MILLIS
        };
        this.defaultConfig = {};
      }
    };
    APP_NAMESPACE_STORE = "app_namespace_store";
    DB_NAME2 = "firebase_remote_config";
    DB_VERSION2 = 1;
    Storage = class {
      getLastFetchStatus() {
        return this.get("last_fetch_status");
      }
      setLastFetchStatus(status) {
        return this.set("last_fetch_status", status);
      }
      // This is comparable to a cache entry timestamp. If we need to expire other data, we could
      // consider adding timestamp to all storage records and an optional max age arg to getters.
      getLastSuccessfulFetchTimestampMillis() {
        return this.get("last_successful_fetch_timestamp_millis");
      }
      setLastSuccessfulFetchTimestampMillis(timestamp) {
        return this.set("last_successful_fetch_timestamp_millis", timestamp);
      }
      getLastSuccessfulFetchResponse() {
        return this.get("last_successful_fetch_response");
      }
      setLastSuccessfulFetchResponse(response) {
        return this.set("last_successful_fetch_response", response);
      }
      getActiveConfig() {
        return this.get("active_config");
      }
      setActiveConfig(config) {
        return this.set("active_config", config);
      }
      getActiveConfigEtag() {
        return this.get("active_config_etag");
      }
      setActiveConfigEtag(etag) {
        return this.set("active_config_etag", etag);
      }
      getActiveExperiments() {
        return this.get("active_experiments");
      }
      setActiveExperiments(experiments) {
        return this.set("active_experiments", experiments);
      }
      getThrottleMetadata() {
        return this.get("throttle_metadata");
      }
      setThrottleMetadata(metadata) {
        return this.set("throttle_metadata", metadata);
      }
      deleteThrottleMetadata() {
        return this.delete("throttle_metadata");
      }
      getCustomSignals() {
        return this.get("custom_signals");
      }
      getRealtimeBackoffMetadata() {
        return this.get("realtime_backoff_metadata");
      }
      setRealtimeBackoffMetadata(realtimeMetadata) {
        return this.set("realtime_backoff_metadata", realtimeMetadata);
      }
      getActiveConfigTemplateVersion() {
        return this.get("last_known_template_version");
      }
      setActiveConfigTemplateVersion(version4) {
        return this.set("last_known_template_version", version4);
      }
    };
    IndexedDbStorage = class extends Storage {
      /**
       * @param appId enables storage segmentation by app (ID + name).
       * @param appName enables storage segmentation by app (ID + name).
       * @param namespace enables storage segmentation by namespace.
       */
      constructor(appId, appName, namespace, openDbPromise = openDatabase()) {
        super();
        this.appId = appId;
        this.appName = appName;
        this.namespace = namespace;
        this.openDbPromise = openDbPromise;
      }
      async setCustomSignals(customSignals) {
        const db = await this.openDbPromise;
        const transaction = db.transaction([APP_NAMESPACE_STORE], "readwrite");
        const storedSignals = await this.getWithTransaction("custom_signals", transaction);
        const updatedSignals = mergeCustomSignals(customSignals, storedSignals || {});
        await this.setWithTransaction("custom_signals", updatedSignals, transaction);
        return updatedSignals;
      }
      /**
       * Gets a value from the database using the provided transaction.
       *
       * @param key The key of the value to get.
       * @param transaction The transaction to use for the operation.
       * @returns The value associated with the key, or undefined if no such value exists.
       */
      async getWithTransaction(key, transaction) {
        return new Promise((resolve, reject) => {
          const objectStore = transaction.objectStore(APP_NAMESPACE_STORE);
          const compositeKey = this.createCompositeKey(key);
          try {
            const request = objectStore.get(compositeKey);
            request.onerror = (event) => {
              reject(toFirebaseError(
                event,
                "storage-get"
                /* ErrorCode.STORAGE_GET */
              ));
            };
            request.onsuccess = (event) => {
              const result = event.target.result;
              if (result) {
                resolve(result.value);
              } else {
                resolve(void 0);
              }
            };
          } catch (e) {
            reject(ERROR_FACTORY3.create("storage-get", {
              originalErrorMessage: e?.message
            }));
          }
        });
      }
      /**
       * Sets a value in the database using the provided transaction.
       *
       * @param key The key of the value to set.
       * @param value The value to set.
       * @param transaction The transaction to use for the operation.
       * @returns A promise that resolves when the operation is complete.
       */
      async setWithTransaction(key, value, transaction) {
        return new Promise((resolve, reject) => {
          const objectStore = transaction.objectStore(APP_NAMESPACE_STORE);
          const compositeKey = this.createCompositeKey(key);
          try {
            const request = objectStore.put({
              compositeKey,
              value
            });
            request.onerror = (event) => {
              reject(toFirebaseError(
                event,
                "storage-set"
                /* ErrorCode.STORAGE_SET */
              ));
            };
            request.onsuccess = () => {
              resolve();
            };
          } catch (e) {
            reject(ERROR_FACTORY3.create("storage-set", {
              originalErrorMessage: e?.message
            }));
          }
        });
      }
      async get(key) {
        const db = await this.openDbPromise;
        const transaction = db.transaction([APP_NAMESPACE_STORE], "readonly");
        return this.getWithTransaction(key, transaction);
      }
      async set(key, value) {
        const db = await this.openDbPromise;
        const transaction = db.transaction([APP_NAMESPACE_STORE], "readwrite");
        return this.setWithTransaction(key, value, transaction);
      }
      async delete(key) {
        const db = await this.openDbPromise;
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([APP_NAMESPACE_STORE], "readwrite");
          const objectStore = transaction.objectStore(APP_NAMESPACE_STORE);
          const compositeKey = this.createCompositeKey(key);
          try {
            const request = objectStore.delete(compositeKey);
            request.onerror = (event) => {
              reject(toFirebaseError(
                event,
                "storage-delete"
                /* ErrorCode.STORAGE_DELETE */
              ));
            };
            request.onsuccess = () => {
              resolve();
            };
          } catch (e) {
            reject(ERROR_FACTORY3.create("storage-delete", {
              originalErrorMessage: e?.message
            }));
          }
        });
      }
      // Facilitates composite key functionality (which is unsupported in IE).
      createCompositeKey(key) {
        return [this.appId, this.appName, this.namespace, key].join();
      }
    };
    InMemoryStorage = class extends Storage {
      constructor() {
        super(...arguments);
        this.storage = {};
      }
      async get(key) {
        return Promise.resolve(this.storage[key]);
      }
      async set(key, value) {
        this.storage[key] = value;
        return Promise.resolve(void 0);
      }
      async delete(key) {
        this.storage[key] = void 0;
        return Promise.resolve();
      }
      async setCustomSignals(customSignals) {
        const storedSignals = this.storage["custom_signals"] || {};
        this.storage["custom_signals"] = mergeCustomSignals(customSignals, storedSignals);
        return Promise.resolve(this.storage["custom_signals"]);
      }
    };
    StorageCache = class {
      constructor(storage) {
        this.storage = storage;
      }
      /**
       * Memory-only getters
       */
      getLastFetchStatus() {
        return this.lastFetchStatus;
      }
      getLastSuccessfulFetchTimestampMillis() {
        return this.lastSuccessfulFetchTimestampMillis;
      }
      getActiveConfig() {
        return this.activeConfig;
      }
      getCustomSignals() {
        return this.customSignals;
      }
      /**
       * Read-ahead getter
       */
      async loadFromStorage() {
        const lastFetchStatusPromise = this.storage.getLastFetchStatus();
        const lastSuccessfulFetchTimestampMillisPromise = this.storage.getLastSuccessfulFetchTimestampMillis();
        const activeConfigPromise = this.storage.getActiveConfig();
        const customSignalsPromise = this.storage.getCustomSignals();
        const lastFetchStatus = await lastFetchStatusPromise;
        if (lastFetchStatus) {
          this.lastFetchStatus = lastFetchStatus;
        }
        const lastSuccessfulFetchTimestampMillis = await lastSuccessfulFetchTimestampMillisPromise;
        if (lastSuccessfulFetchTimestampMillis) {
          this.lastSuccessfulFetchTimestampMillis = lastSuccessfulFetchTimestampMillis;
        }
        const activeConfig = await activeConfigPromise;
        if (activeConfig) {
          this.activeConfig = activeConfig;
        }
        const customSignals = await customSignalsPromise;
        if (customSignals) {
          this.customSignals = customSignals;
        }
      }
      /**
       * Write-through setters
       */
      setLastFetchStatus(status) {
        this.lastFetchStatus = status;
        return this.storage.setLastFetchStatus(status);
      }
      setLastSuccessfulFetchTimestampMillis(timestampMillis) {
        this.lastSuccessfulFetchTimestampMillis = timestampMillis;
        return this.storage.setLastSuccessfulFetchTimestampMillis(timestampMillis);
      }
      setActiveConfig(activeConfig) {
        this.activeConfig = activeConfig;
        return this.storage.setActiveConfig(activeConfig);
      }
      async setCustomSignals(customSignals) {
        this.customSignals = await this.storage.setCustomSignals(customSignals);
      }
    };
    EventEmitter = class {
      constructor(allowedEvents_) {
        this.allowedEvents_ = allowedEvents_;
        this.listeners_ = {};
        assert(Array.isArray(allowedEvents_) && allowedEvents_.length > 0, "Requires a non-empty array");
      }
      /**
       * To be called by derived classes to trigger events.
       */
      trigger(eventType, ...varArgs) {
        if (Array.isArray(this.listeners_[eventType])) {
          const listeners = [...this.listeners_[eventType]];
          for (let i = 0; i < listeners.length; i++) {
            listeners[i].callback.apply(listeners[i].context, varArgs);
          }
        }
      }
      on(eventType, callback, context) {
        this.validateEventType_(eventType);
        this.listeners_[eventType] = this.listeners_[eventType] || [];
        this.listeners_[eventType].push({ callback, context });
        const eventData = this.getInitialEvent(eventType);
        if (eventData) {
          callback.apply(context, eventData);
        }
      }
      off(eventType, callback, context) {
        this.validateEventType_(eventType);
        const listeners = this.listeners_[eventType] || [];
        for (let i = 0; i < listeners.length; i++) {
          if (listeners[i].callback === callback && (!context || context === listeners[i].context)) {
            listeners.splice(i, 1);
            return;
          }
        }
      }
      validateEventType_(eventType) {
        assert(this.allowedEvents_.find((et) => {
          return et === eventType;
        }), "Unknown event: " + eventType);
      }
    };
    VisibilityMonitor = class _VisibilityMonitor extends EventEmitter {
      static getInstance() {
        return new _VisibilityMonitor();
      }
      constructor() {
        super(["visible"]);
        let hidden;
        let visibilityChange;
        if (typeof document !== "undefined" && typeof document.addEventListener !== "undefined") {
          if (typeof document["hidden"] !== "undefined") {
            visibilityChange = "visibilitychange";
            hidden = "hidden";
          } else if (typeof document["mozHidden"] !== "undefined") {
            visibilityChange = "mozvisibilitychange";
            hidden = "mozHidden";
          } else if (typeof document["msHidden"] !== "undefined") {
            visibilityChange = "msvisibilitychange";
            hidden = "msHidden";
          } else if (typeof document["webkitHidden"] !== "undefined") {
            visibilityChange = "webkitvisibilitychange";
            hidden = "webkitHidden";
          }
        }
        this.visible_ = true;
        if (visibilityChange) {
          document.addEventListener(visibilityChange, () => {
            const visible = !document[hidden];
            if (visible !== this.visible_) {
              this.visible_ = visible;
              this.trigger("visible", visible);
            }
          }, false);
        }
      }
      getInitialEvent(eventType) {
        assert(eventType === "visible", "Unknown event type: " + eventType);
        return [this.visible_];
      }
    };
    API_KEY_HEADER = "X-Goog-Api-Key";
    INSTALLATIONS_AUTH_TOKEN_HEADER = "X-Goog-Firebase-Installations-Auth";
    ORIGINAL_RETRIES = 8;
    MAXIMUM_FETCH_ATTEMPTS = 3;
    NO_BACKOFF_TIME_IN_MILLIS = -1;
    NO_FAILED_REALTIME_STREAMS = 0;
    REALTIME_DISABLED_KEY = "featureDisabled";
    REALTIME_RETRY_INTERVAL = "retryIntervalSeconds";
    TEMPLATE_VERSION_KEY = "latestTemplateVersionNumber";
    RealtimeHandler = class {
      constructor(firebaseInstallations, storage, sdkVersion, namespace, projectId, apiKey, appId, logger2, storageCache, cachingClient) {
        this.firebaseInstallations = firebaseInstallations;
        this.storage = storage;
        this.sdkVersion = sdkVersion;
        this.namespace = namespace;
        this.projectId = projectId;
        this.apiKey = apiKey;
        this.appId = appId;
        this.logger = logger2;
        this.storageCache = storageCache;
        this.cachingClient = cachingClient;
        this.observers = /* @__PURE__ */ new Set();
        this.isConnectionActive = false;
        this.isRealtimeDisabled = false;
        this.httpRetriesRemaining = ORIGINAL_RETRIES;
        this.isInBackground = false;
        this.decoder = new TextDecoder("utf-8");
        this.isClosingConnection = false;
        this.propagateError = (e) => this.observers.forEach((o) => o.error?.(e));
        this.isStatusCodeRetryable = (statusCode) => {
          const retryableStatusCodes = [
            408,
            // Request Timeout
            429,
            // Too Many Requests
            502,
            // Bad Gateway
            503,
            // Service Unavailable
            504
            // Gateway Timeout
          ];
          return !statusCode || retryableStatusCodes.includes(statusCode);
        };
        void this.setRetriesRemaining();
        void VisibilityMonitor.getInstance().on("visible", this.onVisibilityChange, this);
      }
      async setRetriesRemaining() {
        const metadata = await this.storage.getRealtimeBackoffMetadata();
        const numFailedStreams = metadata?.numFailedStreams || 0;
        this.httpRetriesRemaining = Math.max(ORIGINAL_RETRIES - numFailedStreams, 1);
      }
      /**
       * Increment the number of failed stream attempts, increase the backoff duration, set the backoff
       * end time to "backoff duration" after `lastFailedStreamTime` and persist the new
       * values to storage metadata.
       */
      async updateBackoffMetadataWithLastFailedStreamConnectionTime(lastFailedStreamTime) {
        const numFailedStreams = ((await this.storage.getRealtimeBackoffMetadata())?.numFailedStreams || 0) + 1;
        const backoffMillis = calculateBackoffMillis(numFailedStreams, 6e4, 2);
        await this.storage.setRealtimeBackoffMetadata({
          backoffEndTimeMillis: new Date(lastFailedStreamTime.getTime() + backoffMillis),
          numFailedStreams
        });
      }
      /**
       * Increase the backoff duration with a new end time based on Retry Interval.
       */
      async updateBackoffMetadataWithRetryInterval(retryIntervalSeconds) {
        const currentTime = Date.now();
        const backoffDurationInMillis = retryIntervalSeconds * 1e3;
        const backoffEndTime = new Date(currentTime + backoffDurationInMillis);
        const numFailedStreams = 0;
        await this.storage.setRealtimeBackoffMetadata({
          backoffEndTimeMillis: backoffEndTime,
          numFailedStreams
        });
        await this.retryHttpConnectionWhenBackoffEnds();
      }
      /**
       * Closes the realtime HTTP connection.
       * Note: This method is designed to be called only once at a time.
       * If a call is already in progress, subsequent calls will be ignored.
       */
      async closeRealtimeHttpConnection() {
        if (this.isClosingConnection) {
          return;
        }
        this.isClosingConnection = true;
        try {
          if (this.reader) {
            await this.reader.cancel();
          }
        } catch (e) {
          this.logger.debug("Failed to cancel the reader, connection was lost.");
        } finally {
          this.reader = void 0;
        }
        if (this.controller) {
          await this.controller.abort();
          this.controller = void 0;
        }
        this.isClosingConnection = false;
      }
      async resetRealtimeBackoff() {
        await this.storage.setRealtimeBackoffMetadata({
          backoffEndTimeMillis: /* @__PURE__ */ new Date(-1),
          numFailedStreams: 0
        });
      }
      resetRetryCount() {
        this.httpRetriesRemaining = ORIGINAL_RETRIES;
      }
      /**
       * Assembles the request headers and body and executes the fetch request to
       * establish the real-time streaming connection. This is the "worker" method
       * that performs the actual network communication.
       */
      async establishRealtimeConnection(url, installationId, installationTokenResult, signal) {
        const eTagValue = await this.storage.getActiveConfigEtag();
        const lastKnownVersionNumber = await this.storage.getActiveConfigTemplateVersion();
        const headers = {
          [API_KEY_HEADER]: this.apiKey,
          [INSTALLATIONS_AUTH_TOKEN_HEADER]: installationTokenResult,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "If-None-Match": eTagValue || "*",
          "Content-Encoding": "gzip"
        };
        const requestBody = {
          project: this.projectId,
          namespace: this.namespace,
          lastKnownVersionNumber,
          appId: this.appId,
          sdkVersion: this.sdkVersion,
          appInstanceId: installationId
        };
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal
        });
        return response;
      }
      getRealtimeUrl() {
        const urlBase = window.FIREBASE_REMOTE_CONFIG_URL_BASE || "https://firebaseremoteconfigrealtime.googleapis.com";
        const urlString = `${urlBase}/v1/projects/${this.projectId}/namespaces/${this.namespace}:streamFetchInvalidations?key=${this.apiKey}`;
        return new URL(urlString);
      }
      async createRealtimeConnection() {
        const [installationId, installationTokenResult] = await Promise.all([
          this.firebaseInstallations.getId(),
          this.firebaseInstallations.getToken(false)
        ]);
        this.controller = new AbortController();
        const url = this.getRealtimeUrl();
        const realtimeConnection = await this.establishRealtimeConnection(url, installationId, installationTokenResult, this.controller.signal);
        return realtimeConnection;
      }
      /**
       * Retries HTTP stream connection asyncly in random time intervals.
       */
      async retryHttpConnectionWhenBackoffEnds() {
        let backoffMetadata = await this.storage.getRealtimeBackoffMetadata();
        if (!backoffMetadata) {
          backoffMetadata = {
            backoffEndTimeMillis: new Date(NO_BACKOFF_TIME_IN_MILLIS),
            numFailedStreams: NO_FAILED_REALTIME_STREAMS
          };
        }
        const backoffEndTime = new Date(backoffMetadata.backoffEndTimeMillis).getTime();
        const currentTime = Date.now();
        const retryMillis = Math.max(0, backoffEndTime - currentTime);
        await this.makeRealtimeHttpConnection(retryMillis);
      }
      setIsHttpConnectionRunning(connectionRunning) {
        this.isConnectionActive = connectionRunning;
      }
      /**
       * Combines the check and set operations to prevent multiple asynchronous
       * calls from redundantly starting an HTTP connection. This ensures that
       * only one attempt is made at a time.
       */
      checkAndSetHttpConnectionFlagIfNotRunning() {
        const canMakeConnection = this.canEstablishStreamConnection();
        if (canMakeConnection) {
          this.setIsHttpConnectionRunning(true);
        }
        return canMakeConnection;
      }
      fetchResponseIsUpToDate(fetchResponse, lastKnownVersion) {
        if (fetchResponse.config != null && fetchResponse.templateVersion) {
          return fetchResponse.templateVersion >= lastKnownVersion;
        }
        return this.storageCache.getLastFetchStatus() === "success";
      }
      parseAndValidateConfigUpdateMessage(message) {
        const left = message.indexOf("{");
        const right = message.indexOf("}", left);
        if (left < 0 || right < 0) {
          return "";
        }
        return left >= right ? "" : message.substring(left, right + 1);
      }
      isEventListenersEmpty() {
        return this.observers.size === 0;
      }
      getRandomInt(max) {
        return Math.floor(Math.random() * max);
      }
      executeAllListenerCallbacks(configUpdate) {
        this.observers.forEach((observer) => observer.next(configUpdate));
      }
      /**
       * Compares two configuration objects and returns a set of keys that have changed.
       * A key is considered changed if it's new, removed, or has a different value.
       */
      getChangedParams(newConfig, oldConfig) {
        const changedKeys = /* @__PURE__ */ new Set();
        const newKeys = new Set(Object.keys(newConfig || {}));
        const oldKeys = new Set(Object.keys(oldConfig || {}));
        for (const key of newKeys) {
          if (!oldKeys.has(key) || newConfig[key] !== oldConfig[key]) {
            changedKeys.add(key);
          }
        }
        for (const key of oldKeys) {
          if (!newKeys.has(key)) {
            changedKeys.add(key);
          }
        }
        return changedKeys;
      }
      async fetchLatestConfig(remainingAttempts, targetVersion) {
        const remainingAttemptsAfterFetch = remainingAttempts - 1;
        const currentAttempt = MAXIMUM_FETCH_ATTEMPTS - remainingAttemptsAfterFetch;
        const customSignals = this.storageCache.getCustomSignals();
        if (customSignals) {
          this.logger.debug(`Fetching config with custom signals: ${JSON.stringify(customSignals)}`);
        }
        const abortSignal = new RemoteConfigAbortSignal();
        try {
          const fetchRequest = {
            cacheMaxAgeMillis: 0,
            signal: abortSignal,
            customSignals,
            fetchType: "REALTIME",
            fetchAttempt: currentAttempt
          };
          const fetchResponse = await this.cachingClient.fetch(fetchRequest);
          let activatedConfigs = await this.storage.getActiveConfig();
          if (!this.fetchResponseIsUpToDate(fetchResponse, targetVersion)) {
            this.logger.debug("Fetched template version is the same as SDK's current version. Retrying fetch.");
            await this.autoFetch(remainingAttemptsAfterFetch, targetVersion);
            return;
          }
          if (fetchResponse.config == null) {
            this.logger.debug("The fetch succeeded, but the backend had no updates.");
            return;
          }
          if (activatedConfigs == null) {
            activatedConfigs = {};
          }
          const updatedKeys = this.getChangedParams(fetchResponse.config, activatedConfigs);
          if (updatedKeys.size === 0) {
            this.logger.debug("Config was fetched, but no params changed.");
            return;
          }
          const configUpdate = {
            getUpdatedKeys() {
              return new Set(updatedKeys);
            }
          };
          this.executeAllListenerCallbacks(configUpdate);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          const error = ERROR_FACTORY3.create("update-not-fetched", {
            originalErrorMessage: `Failed to auto-fetch config update: ${errorMessage}`
          });
          this.propagateError(error);
        }
      }
      async autoFetch(remainingAttempts, targetVersion) {
        if (remainingAttempts === 0) {
          const error = ERROR_FACTORY3.create("update-not-fetched", {
            originalErrorMessage: "Unable to fetch the latest version of the template."
          });
          this.propagateError(error);
          return;
        }
        const timeTillFetchSeconds = this.getRandomInt(4);
        const timeTillFetchInMiliseconds = timeTillFetchSeconds * 1e3;
        await new Promise((resolve) => setTimeout(resolve, timeTillFetchInMiliseconds));
        await this.fetchLatestConfig(remainingAttempts, targetVersion);
      }
      /**
       * Processes a stream of real-time messages for configuration updates.
       * This method reassembles fragmented messages, validates and parses the JSON,
       * and automatically fetches a new config if a newer template version is available.
       * It also handles server-specified retry intervals and propagates errors for
       * invalid messages or when real-time updates are disabled.
       */
      async handleNotifications(reader) {
        let partialConfigUpdateMessage;
        let currentConfigUpdateMessage = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          partialConfigUpdateMessage = this.decoder.decode(value, { stream: true });
          currentConfigUpdateMessage += partialConfigUpdateMessage;
          if (partialConfigUpdateMessage.includes("}")) {
            currentConfigUpdateMessage = this.parseAndValidateConfigUpdateMessage(currentConfigUpdateMessage);
            if (currentConfigUpdateMessage.length === 0) {
              continue;
            }
            try {
              const jsonObject = JSON.parse(currentConfigUpdateMessage);
              if (this.isEventListenersEmpty()) {
                break;
              }
              if (REALTIME_DISABLED_KEY in jsonObject && jsonObject[REALTIME_DISABLED_KEY] === true) {
                const error = ERROR_FACTORY3.create("realtime-unavailable", {
                  originalErrorMessage: "The server is temporarily unavailable. Try again in a few minutes."
                });
                this.propagateError(error);
                break;
              }
              if (TEMPLATE_VERSION_KEY in jsonObject) {
                const oldTemplateVersion = await this.storage.getActiveConfigTemplateVersion();
                const targetTemplateVersion = Number(jsonObject[TEMPLATE_VERSION_KEY]);
                if (oldTemplateVersion && targetTemplateVersion > oldTemplateVersion) {
                  await this.autoFetch(MAXIMUM_FETCH_ATTEMPTS, targetTemplateVersion);
                }
              }
              if (REALTIME_RETRY_INTERVAL in jsonObject) {
                const retryIntervalSeconds = Number(jsonObject[REALTIME_RETRY_INTERVAL]);
                await this.updateBackoffMetadataWithRetryInterval(retryIntervalSeconds);
              }
            } catch (e) {
              this.logger.debug("Unable to parse latest config update message.", e);
              const errorMessage = e instanceof Error ? e.message : String(e);
              this.propagateError(ERROR_FACTORY3.create("update-message-invalid", {
                originalErrorMessage: errorMessage
              }));
            }
            currentConfigUpdateMessage = "";
          }
        }
      }
      async listenForNotifications(reader) {
        try {
          await this.handleNotifications(reader);
        } catch (e) {
          if (!this.isInBackground) {
            this.logger.debug("Real-time connection was closed due to an exception.");
          }
        }
      }
      /**
       * Open the real-time connection, begin listening for updates, and auto-fetch when an update is
       * received.
       *
       * If the connection is successful, this method will block on its thread while it reads the
       * chunk-encoded HTTP body. When the connection closes, it attempts to reestablish the stream.
       */
      async prepareAndBeginRealtimeHttpStream() {
        if (!this.checkAndSetHttpConnectionFlagIfNotRunning()) {
          return;
        }
        let backoffMetadata = await this.storage.getRealtimeBackoffMetadata();
        if (!backoffMetadata) {
          backoffMetadata = {
            backoffEndTimeMillis: new Date(NO_BACKOFF_TIME_IN_MILLIS),
            numFailedStreams: NO_FAILED_REALTIME_STREAMS
          };
        }
        const backoffEndTime = backoffMetadata.backoffEndTimeMillis.getTime();
        if (Date.now() < backoffEndTime) {
          await this.retryHttpConnectionWhenBackoffEnds();
          return;
        }
        let response;
        let responseCode;
        try {
          response = await this.createRealtimeConnection();
          responseCode = response.status;
          if (response.ok && response.body) {
            this.resetRetryCount();
            await this.resetRealtimeBackoff();
            const reader = response.body.getReader();
            this.reader = reader;
            await this.listenForNotifications(reader);
          }
        } catch (error) {
          if (this.isInBackground) {
            this.resetRetryCount();
          } else {
            this.logger.debug("Exception connecting to real-time RC backend. Retrying the connection...:", error);
          }
        } finally {
          await this.closeRealtimeHttpConnection();
          this.setIsHttpConnectionRunning(false);
          const connectionFailed = !this.isInBackground && (responseCode === void 0 || this.isStatusCodeRetryable(responseCode));
          if (connectionFailed) {
            await this.updateBackoffMetadataWithLastFailedStreamConnectionTime(/* @__PURE__ */ new Date());
          }
          if (connectionFailed || response?.ok) {
            await this.retryHttpConnectionWhenBackoffEnds();
          } else {
            const errorMessage = `Unable to connect to the server. HTTP status code: ${responseCode}`;
            const firebaseError = ERROR_FACTORY3.create("stream-error", {
              originalErrorMessage: errorMessage
            });
            this.propagateError(firebaseError);
          }
        }
      }
      /**
       * Checks whether connection can be made or not based on some conditions
       * @returns booelean
       */
      canEstablishStreamConnection() {
        const hasActiveListeners = this.observers.size > 0;
        const isNotDisabled = !this.isRealtimeDisabled;
        const isNoConnectionActive = !this.isConnectionActive;
        const inForeground = !this.isInBackground;
        return hasActiveListeners && isNotDisabled && isNoConnectionActive && inForeground;
      }
      async makeRealtimeHttpConnection(delayMillis) {
        if (!this.canEstablishStreamConnection()) {
          return;
        }
        if (this.httpRetriesRemaining > 0) {
          this.httpRetriesRemaining--;
          await new Promise((resolve) => setTimeout(resolve, delayMillis));
          void this.prepareAndBeginRealtimeHttpStream();
        } else if (!this.isInBackground) {
          const error = ERROR_FACTORY3.create("stream-error", {
            originalErrorMessage: "Unable to connect to the server. Check your connection and try again."
          });
          this.propagateError(error);
        }
      }
      async beginRealtime() {
        if (this.observers.size > 0) {
          await this.makeRealtimeHttpConnection(0);
        }
      }
      /**
       * Adds an observer to the realtime updates.
       * @param observer The observer to add.
       */
      addObserver(observer) {
        this.observers.add(observer);
        void this.beginRealtime();
      }
      /**
       * Removes an observer from the realtime updates.
       * @param observer The observer to remove.
       */
      removeObserver(observer) {
        if (this.observers.has(observer)) {
          this.observers.delete(observer);
        }
      }
      /**
       * Handles changes to the application's visibility state, managing the real-time connection.
       *
       * When the application is moved to the background, this method closes the existing
       * real-time connection to save resources. When the application returns to the
       * foreground, it attempts to re-establish the connection.
       */
      async onVisibilityChange(visible) {
        this.isInBackground = !visible;
        if (!visible) {
          await this.closeRealtimeHttpConnection();
        } else if (visible) {
          await this.beginRealtime();
        }
      }
    };
    registerRemoteConfig();
  }
});

// ../../StreamingCore-Client/node_modules/firebase/remote-config/dist/index.mjs
var init_dist = __esm({
  "../../StreamingCore-Client/node_modules/firebase/remote-config/dist/index.mjs"() {
    init_index_esm5();
  }
});

// ../../StreamingCore-Client/src/core-ts/globals/eventsBus/globalsEventsBus.ts
var globalsEventsBus_default;
var init_globalsEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/globals/eventsBus/globalsEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    globalsEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/core-ts/ads/adsEventBus.ts
var adsEventBus_default;
var init_adsEventBus = __esm({
  "../../StreamingCore-Client/src/core-ts/ads/adsEventBus.ts"() {
    "use strict";
    init_eventsBus();
    adsEventBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/web/remoteConfig/index.ts
var guard16, instance, onSyncPremiumGates, adsUnsubscribe, globalsUnsubscribe, isElectron2, richPlaybackDefault, builtInDefaults, fallbackGlobalsConfig, initRemoteConfigAdapter, buildAdsRemoteConfig, disposeRemoteConfigAdapter;
var init_remoteConfig = __esm({
  "../../StreamingCore-Client/src/adapters/web/remoteConfig/index.ts"() {
    "use strict";
    init_dist();
    init_globalsEventsBus();
    init_adsEventBus();
    init_adapterRegistry();
    guard16 = createBoundGuard();
    instance = null;
    onSyncPremiumGates = null;
    adsUnsubscribe = null;
    globalsUnsubscribe = null;
    isElectron2 = () => typeof window !== "undefined" && !!window.electronAPI;
    richPlaybackDefault = () => !isElectron2();
    builtInDefaults = {
      enablePurchases: false,
      get enableRichPlayback() {
        return richPlaybackDefault();
      },
      enableRichPlayback2: false,
      enableFastPlayback: true,
      enableFastPlayback2: true,
      enableAdaptivePlayback: true,
      enablePremiumGates: false,
      enableOrbit: true,
      enableLiveListeners: true,
      // Comma/space-separated ISO country codes where lyrics are hidden. Empty =
      // available everywhere. Geo-target it with a Remote Config condition.
      echoRegions: "",
      // Search "Top result" ranking tuning — defaults mirror computeTopResult's.
      searchTopResultPopularityWeight: 0.25,
      searchTopResultThreshold: 0.6,
      searchTopResultPersonalizationWeight: 0.2
    };
    fallbackGlobalsConfig = () => ({
      enablePurchases: false,
      enableRichPlayback: richPlaybackDefault(),
      enableRichPlayback2: false,
      enableFastPlayback: true,
      enableFastPlayback2: true,
      enableAdaptivePlayback: true,
      enableOrbit: true,
      enableLiveListeners: true,
      echoRegions: ""
    });
    initRemoteConfigAdapter = async (ctx) => {
      if (!guard16.bind()) return;
      onSyncPremiumGates = ctx.onSyncPremiumGates ?? null;
      try {
        const app13 = ctx.getFirebaseApp();
        if (app13) {
          instance = getRemoteConfig(app13);
          instance.settings.minimumFetchIntervalMillis = ctx.settings?.minimumFetchIntervalMillis ?? 0;
          instance.settings.fetchTimeoutMillis = ctx.settings?.fetchTimeoutMillis ?? 6e4;
          instance.defaultConfig = { ...builtInDefaults, ...ctx.defaults ?? {} };
          fetchAndActivate(instance).catch(() => {
          });
        }
      } catch (e) {
        console.warn("Firebase Remote Config not available:", e);
        instance = null;
      }
      globalsUnsubscribe = globalsEventsBus_default.addListener(async (event) => {
        if (event.name !== "fetchConfig") return;
        try {
          if (!instance) {
            event.resolve(fallbackGlobalsConfig());
            return;
          }
          await fetchAndActivate(instance).catch(() => {
          });
          try {
            if (onSyncPremiumGates) {
              onSyncPremiumGates(getValue(instance, "enablePremiumGates").asBoolean());
            }
          } catch {
          }
          event.resolve({
            enablePurchases: getValue(instance, "enablePurchases").asBoolean() ?? false,
            enableRichPlayback: getValue(instance, "enableRichPlayback").asBoolean() ?? richPlaybackDefault(),
            enableRichPlayback2: getValue(instance, "enableRichPlayback2").asBoolean() ?? false,
            enableFastPlayback: getValue(instance, "enableFastPlayback").asBoolean() ?? true,
            enableFastPlayback2: getValue(instance, "enableFastPlayback2").asBoolean() ?? true,
            enableAdaptivePlayback: getValue(instance, "enableAdaptivePlayback").asBoolean() ?? true,
            // Orbit is now always on — the rollout flag is retired. Hard-coded
            // true so a stale Firebase Remote Config entry can't disable the
            // feature for users on older app builds.
            enableOrbit: true,
            enableLiveListeners: getValue(instance, "enableLiveListeners").asBoolean() ?? true,
            echoRegions: getValue(instance, "echoRegions").asString() ?? "",
            // Numeric search-ranking tunables; builtInDefaults backs the unset case.
            searchTopResultPopularityWeight: getValue(instance, "searchTopResultPopularityWeight").asNumber(),
            searchTopResultThreshold: getValue(instance, "searchTopResultThreshold").asNumber(),
            searchTopResultPersonalizationWeight: getValue(instance, "searchTopResultPersonalizationWeight").asNumber()
          });
        } catch (err) {
          event.reject(err);
        }
      });
      adsUnsubscribe = adsEventBus_default.addListener(async (event) => {
        if (event.name !== "fetchConfig") return;
        try {
          if (!instance) {
            event.resolve({});
            return;
          }
          await fetchAndActivate(instance).catch(() => {
          });
          event.resolve(buildAdsRemoteConfig(instance));
        } catch (err) {
          event.reject(err);
        }
      });
    };
    buildAdsRemoteConfig = (rc) => ({
      adCacheMaxDurationAppOpen: getValue(rc, "adCacheMaxDurationAppOpen").asNumber(),
      adCacheMaxDurationAudio: getValue(rc, "adCacheMaxDurationAudio").asNumber(),
      adCacheMaxDurationInterstitials: getValue(rc, "adCacheMaxDurationInterstitials").asNumber(),
      adCacheMaxDurationRewardedVideo: getValue(rc, "adCacheMaxDurationRewardedVideo").asNumber(),
      adIntensityAppOpen: getValue(rc, "adIntensityAppOpen").asNumber(),
      adIntensityAudio: getValue(rc, "adIntensityAudio").asNumber(),
      adIntensityInterstitials: getValue(rc, "adIntensityInterstitials").asNumber(),
      adIntensityRewardedVideos: getValue(rc, "adIntensityRewardedVideos").asNumber(),
      adsAppopenToInterstitial: getValue(rc, "adsAppopenToInterstitial").asBoolean(),
      adsBehaviorAppOpen: getValue(rc, "adsBehaviorAppOpen").asNumber(),
      adsBehaviorAudio: getValue(rc, "adsBehaviorAudio").asNumber(),
      adsBehaviorInterstitials: getValue(rc, "adsBehaviorInterstitials").asNumber(),
      adsBehaviorRewardedVideo: getValue(rc, "adsBehaviorRewardedVideo").asNumber(),
      adsEnabledDaysLogin: getValue(rc, "adsEnabledDaysLogin").asNumber(),
      adsEnableTrackCount: getValue(rc, "adsEnableTrackCount").asNumber(),
      adsInterruptPlayback: getValue(rc, "adsInterruptPlayback").asBoolean(),
      adsMaxAmountAudio: getValue(rc, "adsMaxAmountAudio").asNumber(),
      adsMaxDurationAudio: getValue(rc, "adsMaxDurationAudio").asNumber(),
      adsMinDurationAudio: getValue(rc, "adsMinDurationAudio").asNumber(),
      appOpenAdsEnabled: getValue(rc, "appOpenAdsEnabled").asBoolean(),
      adsEnabledGlobal: getValue(rc, "adsEnabledGlobal").asBoolean(),
      adsEnabledInterstitial: getValue(rc, "adsEnabledInterstitial").asBoolean(),
      adsEnabledRewardedVideo: getValue(rc, "adsEnabledRewardedVideo").asBoolean(),
      // 86c93qeu8 — audio ad enablement + cooldown are server-driven so
      // ops can match legacy master behaviour. Without these keys mapped
      // here, `audioAdsEnabled` would always be the default false and the
      // inter-track audio ad gate would silently reject every ad even
      // when Firebase Remote Config says otherwise. Web doesn't currently
      // ship audio ads but the mapping keeps both adapters symmetric.
      audioAdsEnabled: getValue(rc, "audioAdsEnabled").asBoolean(),
      cooldownAudio: getValue(rc, "cooldownAudio").asNumber(),
      showAdsAtFirst: getValue(rc, "showAdsAtFirst").asBoolean(),
      // Forward the remaining "showAdsAt*" flags so the host app can
      // decide which screens trigger an ad — these were already declared
      // on the AdsRemoteConfig interface but never mapped, so a server
      // override had no effect on the new core.
      showAdsAtFirstPlay: getValue(rc, "showAdsAtFirstPlay").asBoolean(),
      showAdsInArtistPagesMount: getValue(rc, "showAdsInArtistPagesMount").asBoolean(),
      showAdsInEditorialPagesMount: getValue(rc, "showAdsInEditorialPagesMount").asBoolean(),
      showAdsInPlaylistPagesMount: getValue(rc, "showAdsInPlaylistPagesMount").asBoolean(),
      showAdsInUserPagesMount: getValue(rc, "showAdsInUserPagesMount").asBoolean(),
      showAdsReturnFromBackground: getValue(rc, "showAdsReturnFromBackground").asBoolean(),
      bannersEnabled: getValue(rc, "staticBannerEnabled").asBoolean(),
      loadTimeoutAds: getValue(rc, "loadTimeoutAds").asNumber(),
      loadTimeoutAudio: getValue(rc, "loadTimeoutAudio").asNumber(),
      loadTimeoutInterstitials: getValue(rc, "loadTimeoutInterstitials").asNumber(),
      loadTimeoutRewardedVideo: getValue(rc, "loadTimeoutRewardedVideo").asNumber()
    });
    disposeRemoteConfigAdapter = () => {
      if (!guard16.dispose()) return;
      if (adsUnsubscribe) {
        adsUnsubscribe();
        adsUnsubscribe = null;
      }
      if (globalsUnsubscribe) {
        globalsUnsubscribe();
        globalsUnsubscribe = null;
      }
      instance = null;
      onSyncPremiumGates = null;
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/remoteConfig/index.ts
var remoteConfig_exports = {};
__export(remoteConfig_exports, {
  disposeRemoteConfigAdapter: () => disposeRemoteConfigAdapter,
  initRemoteConfigAdapter: () => initRemoteConfigAdapter
});
var init_remoteConfig2 = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/remoteConfig/index.ts"() {
    "use strict";
    init_remoteConfig();
  }
});

// ../../StreamingCore-Client/src/core-ts/updates/eventsBus/updatesEventsBus.ts
var updatesEventsBus_default;
var init_updatesEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/updates/eventsBus/updatesEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    updatesEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/updates/index.ts
var updates_exports = {};
__export(updates_exports, {
  disposeUpdatesAdapter: () => disposeUpdatesAdapter,
  initUpdatesAdapter: () => initUpdatesAdapter
});
var import_electron10, guard17, currentStatus, lastManifest, lastError, lastCheckHadUpdate, buildInfo, setStatus, initUpdatesAdapter, disposeUpdatesAdapter;
var init_updates = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/updates/index.ts"() {
    "use strict";
    import_electron10 = require("electron");
    init_updatesEventsBus();
    init_adapterRegistry();
    guard17 = createBoundGuard();
    currentStatus = "idle";
    lastManifest = null;
    lastError = null;
    lastCheckHadUpdate = false;
    buildInfo = () => ({
      status: currentStatus,
      manifest: lastManifest,
      error: lastError,
      isUpdateAvailable: currentStatus === "available" || currentStatus === "ready",
      isUpdatePending: currentStatus === "ready"
    });
    setStatus = (status, manifest, error) => {
      currentStatus = status;
      if (manifest !== void 0) lastManifest = manifest;
      if (error !== void 0) lastError = error;
      void updatesEventsBus_default.notify({ name: "updateStatusChanged", data: buildInfo() });
    };
    initUpdatesAdapter = async (ctx) => {
      if (!guard17.bind()) return;
      const updater = ctx?.autoUpdater;
      const broadcast = ctx?.broadcast;
      if (updater) {
        updater.autoDownload = false;
        updater.on("update-available", (info) => {
          lastCheckHadUpdate = true;
          setStatus("available", info ?? null);
          broadcast?.("updateAvailable", info);
        });
        updater.on("update-not-available", () => {
          lastCheckHadUpdate = false;
          setStatus("no-update");
        });
        updater.on("update-downloaded", (info) => {
          setStatus("ready", info ?? null);
          broadcast?.("updateDownloaded", info);
        });
        updater.on("error", (err) => {
          const message = err instanceof Error ? err.message : String(err);
          setStatus("error", null, message);
          broadcast?.("updateError", { message });
        });
        updater.on("download-progress", (progress) => {
          if (currentStatus !== "downloading") setStatus("downloading");
          broadcast?.("updateProgress", progress);
        });
        import_electron10.ipcMain.handle("service:updates:check", async () => {
          lastCheckHadUpdate = false;
          try {
            const result = await updater.checkForUpdates();
            if (lastCheckHadUpdate && result?.updateInfo) {
              return { updateInfo: result.updateInfo };
            }
            return null;
          } catch {
            return null;
          }
        });
        import_electron10.ipcMain.handle("service:updates:download", async () => {
          try {
            await updater.downloadUpdate();
            return { success: true };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
          }
        });
        import_electron10.ipcMain.handle("service:updates:install", () => {
          updater.quitAndInstall();
        });
      }
      updatesEventsBus_default.addListener(async (event) => {
        try {
          switch (event.name) {
            case "checkForUpdate": {
              if (!updater) {
                event.resolve(buildInfo());
                break;
              }
              lastCheckHadUpdate = false;
              setStatus("checking");
              try {
                await updater.checkForUpdates();
              } catch {
              }
              event.resolve(buildInfo());
              break;
            }
            case "downloadUpdate": {
              if (!updater || currentStatus !== "available") {
                event.resolve(buildInfo());
                break;
              }
              setStatus("downloading");
              try {
                await updater.downloadUpdate();
              } catch {
              }
              event.resolve(buildInfo());
              break;
            }
            case "checkAndDownloadUpdate": {
              if (!updater) {
                event.resolve(buildInfo());
                break;
              }
              lastCheckHadUpdate = false;
              setStatus("checking");
              try {
                await updater.checkForUpdates();
                if (lastCheckHadUpdate) {
                  setStatus("downloading");
                  await updater.downloadUpdate();
                }
              } catch {
              }
              event.resolve(buildInfo());
              break;
            }
            case "reloadApp":
              updater?.quitAndInstall();
              event.resolve();
              break;
            case "getUpdateInfo":
              event.resolve(buildInfo());
              break;
            case "rateApp":
              event.resolve();
              break;
            case "updateStatusChanged":
              event.resolve();
              break;
          }
        } catch (err) {
          event.reject(err);
        }
      });
    };
    disposeUpdatesAdapter = () => {
      guard17.dispose();
      try {
        import_electron10.ipcMain.removeHandler("service:updates:check");
        import_electron10.ipcMain.removeHandler("service:updates:download");
        import_electron10.ipcMain.removeHandler("service:updates:install");
      } catch {
      }
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/ads/index.ts
var ads_exports = {};
__export(ads_exports, {
  disposeAdsAdapter: () => disposeAdsAdapter,
  initAdsAdapter: () => initAdsAdapter
});
var guard18, initAdsAdapter, disposeAdsAdapter;
var init_ads = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/ads/index.ts"() {
    "use strict";
    init_adsEventBus();
    init_adapterRegistry();
    guard18 = createBoundGuard();
    initAdsAdapter = async () => {
      if (!guard18.bind()) return;
      adsEventBus_default.addListener((event) => {
        switch (event.name) {
          case "getSupportedAdNetworks":
            event.resolve([]);
            break;
          case "loadAd":
          case "showAd":
            event.resolve(false);
            break;
          case "showAskAdsConsent":
          case "showAskAdsTracking":
            event.resolve(true);
            break;
          default:
            event.resolve(void 0);
        }
      });
    };
    disposeAdsAdapter = () => {
      guard18.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/pushNotifications/eventsBus/pushNotificationsEventsBus.ts
var pushNotificationsEventsBus_default;
var init_pushNotificationsEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/pushNotifications/eventsBus/pushNotificationsEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    pushNotificationsEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/pushNotifications/index.ts
var pushNotifications_exports = {};
__export(pushNotifications_exports, {
  disposePushNotificationsAdapter: () => disposePushNotificationsAdapter,
  initPushNotificationsAdapter: () => initPushNotificationsAdapter
});
var guard19, initPushNotificationsAdapter, disposePushNotificationsAdapter;
var init_pushNotifications = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/pushNotifications/index.ts"() {
    "use strict";
    init_pushNotificationsEventsBus();
    init_adapterRegistry();
    guard19 = createBoundGuard();
    initPushNotificationsAdapter = async () => {
      if (!guard19.bind()) return;
      pushNotificationsEventsBus_default.addListener((event) => {
        switch (event.name) {
          case "requestPermissionAndRegister":
            event.resolve(false);
            break;
          case "getPermissionStatus":
            event.resolve("unknown");
            break;
          default:
            event.resolve(void 0);
        }
      });
    };
    disposePushNotificationsAdapter = () => {
      guard19.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/discordRpc/eventsBus/discordRpcEventsBus.ts
var discordRpcEventsBus_default;
var init_discordRpcEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/discordRpc/eventsBus/discordRpcEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    discordRpcEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/discordRpc/index.ts
var discordRpc_exports = {};
__export(discordRpc_exports, {
  disposeDiscordRpcAdapter: () => disposeDiscordRpcAdapter,
  initDiscordRpcAdapter: () => initDiscordRpcAdapter
});
var import_electron11, guard20, client, clientReady, clientLoading, artworkCache, connect, defaultValidate, applyActivity, setPresence, clearPresence, destroyClient, initDiscordRpcAdapter, disposeDiscordRpcAdapter;
var init_discordRpc = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/discordRpc/index.ts"() {
    "use strict";
    import_electron11 = require("electron");
    init_discordRpcEventsBus();
    init_adapterRegistry();
    guard20 = createBoundGuard();
    client = null;
    clientReady = false;
    clientLoading = false;
    artworkCache = { orig: "", applied: "" };
    connect = (ctx) => {
      return new Promise((resolve) => {
        if (!ctx.discordRpc || !ctx.clientId) {
          resolve();
          return;
        }
        if (clientReady || clientLoading) {
          resolve();
          return;
        }
        clientLoading = true;
        try {
          client = new ctx.discordRpc.Client({ transport: "ipc" });
          client.login({ clientId: ctx.clientId }).catch(() => {
            clientReady = false;
            clientLoading = false;
            resolve();
          });
          client.on("ready", () => {
            clientReady = true;
            clientLoading = false;
            resolve();
          });
        } catch {
          clientLoading = false;
          resolve();
        }
      });
    };
    defaultValidate = async (url) => {
      try {
        const response = await fetch(url);
        return response.ok;
      } catch {
        return false;
      }
    };
    applyActivity = (data, productName, fallbackImageKey) => {
      if (!clientReady || !client) return;
      const body = {
        details: data.title,
        type: 2,
        largeImageKey: artworkCache.applied || fallbackImageKey,
        largeImageText: productName,
        instance: true
      };
      if (data.artist) body.state = data.artist;
      if (artworkCache.applied) {
        body.smallImageKey = fallbackImageKey;
        body.smallImageText = productName;
      }
      if (data.playing && data.duration) {
        const now = Date.now();
        const elapsed = (data.position ?? 0) * 1e3;
        body.startTimestamp = now - elapsed;
        body.endTimestamp = now - elapsed + data.duration * 1e3;
      }
      client.setActivity(body);
    };
    setPresence = async (ctx, data) => {
      if (!ctx.discordRpc || !ctx.clientId) return;
      if (!clientReady) {
        if (clientLoading) return;
        await connect(ctx);
        if (!clientReady) return;
      }
      const productName = ctx.productName ?? "";
      const fallbackImageKey = ctx.fallbackImageKey ?? "logo";
      if (data.artworkUrl) {
        if (data.artworkUrl !== artworkCache.orig) {
          artworkCache.orig = data.artworkUrl;
          const validator = ctx.validateArtworkUrl ?? defaultValidate;
          artworkCache.applied = await validator(data.artworkUrl) ? data.artworkUrl : "";
        }
      } else {
        artworkCache.orig = "";
        artworkCache.applied = "";
      }
      applyActivity(data, productName, fallbackImageKey);
    };
    clearPresence = () => {
      if (!clientReady || !client) return;
      client.clearActivity();
      artworkCache = { orig: "", applied: "" };
    };
    destroyClient = () => {
      if (client) {
        try {
          client.clearActivity();
          client.destroy();
        } catch {
        }
      }
      client = null;
      clientReady = false;
      clientLoading = false;
      artworkCache = { orig: "", applied: "" };
    };
    initDiscordRpcAdapter = async (ctx) => {
      if (!guard20.bind()) return;
      const effective = ctx ?? {};
      import_electron11.ipcMain.handle(
        "service:discord:setPresence",
        (_event, data) => setPresence(effective, data)
      );
      import_electron11.ipcMain.handle("service:discord:clearPresence", () => clearPresence());
      import_electron11.ipcMain.handle("service:discord:destroy", () => destroyClient());
      discordRpcEventsBus_default.addListener(async (event) => {
        try {
          switch (event.name) {
            case "setPresence":
              await setPresence(effective, event.data);
              event.resolve();
              break;
            case "clearPresence":
              clearPresence();
              event.resolve();
              break;
            case "destroyClient":
              destroyClient();
              event.resolve();
              break;
          }
        } catch (err) {
          event.reject(err);
        }
      });
    };
    disposeDiscordRpcAdapter = () => {
      if (!guard20.dispose()) return;
      destroyClient();
      try {
        import_electron11.ipcMain.removeHandler("service:discord:setPresence");
        import_electron11.ipcMain.removeHandler("service:discord:clearPresence");
        import_electron11.ipcMain.removeHandler("service:discord:destroy");
      } catch {
      }
    };
  }
});

// ../../StreamingCore-Client/src/core-ts/menuBar/eventsBus/menuBarEventsBus.ts
var menuBarEventsBus_default;
var init_menuBarEventsBus = __esm({
  "../../StreamingCore-Client/src/core-ts/menuBar/eventsBus/menuBarEventsBus.ts"() {
    "use strict";
    init_eventsBus();
    menuBarEventsBus_default = new EventsBus();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/menuBar/index.ts
var menuBar_exports = {};
__export(menuBar_exports, {
  disposeMenuBarAdapter: () => disposeMenuBarAdapter,
  initMenuBarAdapter: () => initMenuBarAdapter
});
var import_electron12, guard21, tray, findWindow, buildMenuTemplate, setApplicationMenu, setDockMenu, createTray, updateTray, destroyTray, setThumbarButtons, clearThumbarButtons, setWindowTitle, initMenuBarAdapter, disposeMenuBarAdapter;
var init_menuBar = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/menuBar/index.ts"() {
    "use strict";
    import_electron12 = require("electron");
    init_menuBarEventsBus();
    init_adapterRegistry();
    guard21 = createBoundGuard();
    tray = null;
    findWindow = (ctx) => {
      return ctx.getWindow?.() ?? import_electron12.BrowserWindow.getFocusedWindow() ?? import_electron12.BrowserWindow.getAllWindows()[0] ?? null;
    };
    buildMenuTemplate = (template, win2) => {
      return template.map((item) => {
        if (item.type === "separator") return { type: "separator" };
        if (item.role) {
          const r = {};
          r.role = item.role;
          return r;
        }
        const result = {};
        if (item.label !== void 0) result.label = item.label;
        if (item.type) result.type = item.type;
        if (item.checked !== void 0) result.checked = item.checked;
        if (item.enabled !== void 0) result.enabled = item.enabled;
        if (item.accelerator) result.accelerator = item.accelerator;
        if (item.submenu) result.submenu = buildMenuTemplate(item.submenu, win2);
        if (item.action) {
          result.click = () => {
            win2?.webContents.send("onMenuAction", item.action);
            void menuBarEventsBus_default.notify({
              name: "menuActionTriggered",
              data: { action: item.action }
            });
          };
        }
        return result;
      });
    };
    setApplicationMenu = (template, ctx) => {
      const win2 = findWindow(ctx);
      import_electron12.Menu.setApplicationMenu(import_electron12.Menu.buildFromTemplate(buildMenuTemplate(template, win2)));
    };
    setDockMenu = (template, ctx) => {
      if (process.platform !== "darwin") return;
      const win2 = findWindow(ctx);
      import_electron12.app.dock?.setMenu(import_electron12.Menu.buildFromTemplate(buildMenuTemplate(template, win2)));
    };
    createTray = (options, ctx) => {
      if (tray) tray.destroy();
      if (!ctx.trayIconPath) return;
      const icon = import_electron12.nativeImage.createFromPath(ctx.trayIconPath);
      if (process.platform === "darwin") icon.setTemplateImage(true);
      tray = new import_electron12.Tray(icon);
      if (options.tooltip) tray.setToolTip(options.tooltip);
      if (options.template) {
        const win2 = findWindow(ctx);
        tray.setContextMenu(import_electron12.Menu.buildFromTemplate(buildMenuTemplate(options.template, win2)));
      }
      tray.on("click", () => {
        const win2 = findWindow(ctx);
        win2?.show();
        win2?.focus();
      });
    };
    updateTray = (options, ctx) => {
      if (!tray) return;
      if (options.tooltip !== void 0) tray.setToolTip(options.tooltip);
      if (options.template) {
        const win2 = findWindow(ctx);
        tray.setContextMenu(import_electron12.Menu.buildFromTemplate(buildMenuTemplate(options.template, win2)));
      }
    };
    destroyTray = () => {
      if (tray) {
        tray.destroy();
        tray = null;
      }
    };
    setThumbarButtons = (buttons, ctx) => {
      if (process.platform !== "win32") return;
      const win2 = findWindow(ctx);
      if (!win2) return;
      win2.setThumbarButtons(buttons.map((btn) => {
        const tb = {
          icon: import_electron12.nativeImage.createFromDataURL(btn.icon),
          tooltip: btn.tooltip,
          click: () => {
            win2.webContents.send("onMenuAction", btn.action);
            void menuBarEventsBus_default.notify({ name: "menuActionTriggered", data: { action: btn.action } });
          }
        };
        if (btn.enabled === false) tb.flags = ["disabled"];
        return tb;
      }));
    };
    clearThumbarButtons = (ctx) => {
      if (process.platform !== "win32") return;
      const win2 = findWindow(ctx);
      win2?.setThumbarButtons([]);
    };
    setWindowTitle = (title, ctx) => {
      const win2 = findWindow(ctx);
      win2?.setTitle(title || ctx.defaultWindowTitle || "");
    };
    initMenuBarAdapter = async (ctx) => {
      if (!guard21.bind()) return;
      const effective = ctx ?? {};
      menuBarEventsBus_default.addListener((event) => {
        try {
          switch (event.name) {
            case "setApplicationMenu":
              setApplicationMenu(event.data.template, effective);
              event.resolve();
              break;
            case "setDockMenu":
              setDockMenu(event.data.template, effective);
              event.resolve();
              break;
            case "createTray":
              createTray(event.data, effective);
              event.resolve();
              break;
            case "updateTray":
              updateTray(event.data, effective);
              event.resolve();
              break;
            case "destroyTray":
              destroyTray();
              event.resolve();
              break;
            case "setThumbarButtons":
              setThumbarButtons(event.data.buttons, effective);
              event.resolve();
              break;
            case "clearThumbarButtons":
              clearThumbarButtons(effective);
              event.resolve();
              break;
            case "setWindowTitle":
              setWindowTitle(event.data.title, effective);
              event.resolve();
              break;
            case "menuActionTriggered":
              event.resolve();
              break;
          }
        } catch (err) {
          event.reject(err);
        }
      });
      import_electron12.ipcMain.handle(
        "service:menuBar:setApplicationMenu",
        (_e, template) => setApplicationMenu(template, effective)
      );
      import_electron12.ipcMain.handle(
        "service:menuBar:setDockMenu",
        (_e, template) => setDockMenu(template, effective)
      );
      import_electron12.ipcMain.handle(
        "service:menuBar:createTray",
        (_e, options) => createTray(options, effective)
      );
      import_electron12.ipcMain.handle(
        "service:menuBar:updateTray",
        (_e, options) => updateTray(options, effective)
      );
      import_electron12.ipcMain.handle("service:menuBar:destroyTray", () => destroyTray());
      import_electron12.ipcMain.handle(
        "service:menuBar:setThumbarButtons",
        (_e, buttons) => setThumbarButtons(buttons, effective)
      );
      import_electron12.ipcMain.handle("service:menuBar:clearThumbarButtons", () => clearThumbarButtons(effective));
      import_electron12.ipcMain.handle(
        "service:menuBar:setWindowTitle",
        (_e, title) => setWindowTitle(title, effective)
      );
    };
    disposeMenuBarAdapter = () => {
      if (!guard21.dispose()) return;
      destroyTray();
      try {
        import_electron12.ipcMain.removeHandler("service:menuBar:setApplicationMenu");
        import_electron12.ipcMain.removeHandler("service:menuBar:setDockMenu");
        import_electron12.ipcMain.removeHandler("service:menuBar:createTray");
        import_electron12.ipcMain.removeHandler("service:menuBar:updateTray");
        import_electron12.ipcMain.removeHandler("service:menuBar:destroyTray");
        import_electron12.ipcMain.removeHandler("service:menuBar:setThumbarButtons");
        import_electron12.ipcMain.removeHandler("service:menuBar:clearThumbarButtons");
        import_electron12.ipcMain.removeHandler("service:menuBar:setWindowTitle");
      } catch {
      }
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/playback/index.ts
var playback_exports = {};
__export(playback_exports, {
  disposePlaybackAdapter: () => disposePlaybackAdapter,
  initPlaybackAdapter: () => initPlaybackAdapter
});
var guard22, initPlaybackAdapter, disposePlaybackAdapter;
var init_playback = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/playback/index.ts"() {
    "use strict";
    init_adapterRegistry();
    guard22 = createBoundGuard();
    initPlaybackAdapter = async () => {
      if (!guard22.bind()) return;
    };
    disposePlaybackAdapter = () => {
      guard22.dispose();
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/desktopEvents.ts
var desktopEvents_exports = {};
__export(desktopEvents_exports, {
  bindDesktopAppEvents: () => bindDesktopAppEvents,
  bindDesktopWindowEvents: () => bindDesktopWindowEvents
});
var import_electron13, import_fs5, import_path5, defaultIconDir, powerSaveBlockerId, tray2, buildMenuTemplate2, bindDesktopAppEvents, bindDesktopWindowEvents;
var init_desktopEvents = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/desktopEvents.ts"() {
    "use strict";
    import_electron13 = require("electron");
    import_fs5 = __toESM(require("fs"));
    import_path5 = __toESM(require("path"));
    defaultIconDir = () => import_electron13.app.isPackaged ? import_path5.default.join(process.resourcesPath, "icons") : import_path5.default.join(__dirname, "..", "..", "src", "assets", "icons");
    powerSaveBlockerId = null;
    tray2 = null;
    buildMenuTemplate2 = (items, win2, actionChannel) => {
      return items.map((item) => {
        if (item.role) {
          const entry2 = { role: item.role };
          if (item.label) entry2.label = item.label;
          if (item.submenu) entry2.submenu = buildMenuTemplate2(item.submenu, win2, actionChannel);
          return entry2;
        }
        if (item.type === "separator") {
          return { type: "separator" };
        }
        const entry = {
          label: item.label,
          enabled: item.enabled !== false
        };
        if (item.accelerator) entry.accelerator = item.accelerator;
        if (item.type === "checkbox") {
          entry.type = "checkbox";
          entry.checked = !!item.checked;
        }
        if (item.submenu) entry.submenu = buildMenuTemplate2(item.submenu, win2, actionChannel);
        if (item.action) {
          entry.click = () => {
            win2.webContents.send(actionChannel, item.action);
          };
        }
        return entry;
      });
    };
    bindDesktopAppEvents = (ctx) => {
      const distribution = ctx.distribution ?? "other";
      const updater = ctx.autoUpdater;
      if (updater) {
        updater.autoDownload = false;
      }
      const musicMetadata = ctx.musicMetadata;
      const getMachineId = ctx.getMachineId;
      import_electron13.ipcMain.handle("getSpotifyWebviewPreloadPath", () => import_path5.default.join(__dirname, "spotifyWebviewPreload.js"));
      import_electron13.ipcMain.handle("getEmbedWebviewPreloadPath", () => import_path5.default.join(__dirname, "embedWebviewPreload.js"));
      const embedBootstraps = /* @__PURE__ */ new Map();
      import_electron13.ipcMain.handle("setEmbedWebviewBootstrap", (event, code) => {
        embedBootstraps.set(event.sender.id, code);
      });
      import_electron13.ipcMain.on("getEmbedWebviewBootstrap", (event) => {
        const hostId = event.sender.hostWebContents?.id;
        event.returnValue = (hostId != null ? embedBootstraps.get(hostId) : void 0) ?? "";
      });
      import_electron13.ipcMain.handle("getDistribution", () => distribution);
      import_electron13.ipcMain.handle("getIsPackaged", () => import_electron13.app.isPackaged);
      import_electron13.ipcMain.handle("getAppVersion", () => import_electron13.app.getVersion());
      import_electron13.ipcMain.handle("getLocale", () => import_electron13.app.getLocale());
      import_electron13.ipcMain.handle("getPath", (_, type) => {
        const validPaths = ["home", "appData", "userData", "temp", "exe", "module", "desktop", "documents", "downloads", "music", "pictures", "videos", "logs"];
        if (validPaths.includes(type)) {
          return import_electron13.app.getPath(type);
        }
        return null;
      });
      import_electron13.ipcMain.handle("getMachineId", async () => {
        if (!getMachineId) return "unknown";
        try {
          return await getMachineId();
        } catch {
          return "unknown";
        }
      });
      import_electron13.ipcMain.handle("getShouldUseDarkColors", () => import_electron13.nativeTheme.shouldUseDarkColors);
      import_electron13.ipcMain.handle("getProcessBrief", () => ({
        platform: process.platform,
        arch: process.arch,
        version: process.version
      }));
      import_electron13.ipcMain.handle("writeFile", async (_, filePath, content, encoding) => {
        await import_fs5.default.promises.writeFile(filePath, content, { encoding });
        return true;
      });
      import_electron13.ipcMain.handle("readFile", async (_, filePath, options) => {
        return await import_fs5.default.promises.readFile(filePath, options);
      });
      import_electron13.ipcMain.handle("fileExists", async (_, filePath) => {
        try {
          await import_fs5.default.promises.access(filePath);
          return true;
        } catch {
          return false;
        }
      });
      import_electron13.ipcMain.handle("readDirectory", async (_, dirPath, options) => {
        return await import_fs5.default.promises.readdir(dirPath, options);
      });
      import_electron13.ipcMain.handle("readDirectoryWithStats", async (_, dirPath) => {
        const names = await import_fs5.default.promises.readdir(dirPath);
        return await Promise.all(names.map(async (name4) => {
          const full = import_path5.default.join(dirPath, name4);
          try {
            const stat = await import_fs5.default.promises.stat(full);
            return {
              name: name4,
              path: full,
              ctime: stat.ctime.toISOString(),
              mtime: stat.mtime.toISOString(),
              size: stat.size
            };
          } catch {
            return { name: name4, path: full, ctime: void 0, mtime: void 0, size: void 0 };
          }
        }));
      });
      import_electron13.ipcMain.handle("makeDirectory", async (_, dirPath, options) => {
        await import_fs5.default.promises.mkdir(dirPath, { recursive: true, ...options });
        return true;
      });
      import_electron13.ipcMain.handle("unlinkFile", async (_, filePath) => {
        await import_fs5.default.promises.unlink(filePath);
        return true;
      });
      import_electron13.ipcMain.handle("unlinkFiles", async (_, filePaths) => {
        await Promise.all(filePaths.map((fp) => import_fs5.default.promises.unlink(fp).catch(() => {
        })));
        return true;
      });
      import_electron13.ipcMain.handle("unlinkDirectory", async (_, dirPath) => {
        await import_fs5.default.promises.rm(dirPath, { recursive: true, force: true });
        return true;
      });
      import_electron13.ipcMain.handle("copyFile", async (_, src, dest) => {
        await import_fs5.default.promises.copyFile(src, dest);
        return true;
      });
      import_electron13.ipcMain.handle("renameFile", async (_, oldPath, newPath) => {
        await import_fs5.default.promises.rename(oldPath, newPath);
        return true;
      });
      import_electron13.ipcMain.handle("fileStat", async (_, filePath) => {
        const stat = await import_fs5.default.promises.stat(filePath);
        return {
          size: stat.size,
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory(),
          mtime: stat.mtime.toISOString(),
          ctime: stat.ctime.toISOString()
        };
      });
      import_electron13.ipcMain.handle("setCookie", async (_, cookie) => {
        await import_electron13.session.defaultSession.cookies.set(cookie);
        return true;
      });
      import_electron13.ipcMain.handle("removeCookie", async (_, url, name4) => {
        await import_electron13.session.defaultSession.cookies.remove(url, name4);
        return true;
      });
      import_electron13.ipcMain.handle("getCookies", async (_, filter) => {
        return await import_electron13.session.defaultSession.cookies.get(filter || {});
      });
      import_electron13.ipcMain.handle("getMusicMetadata", async (_, filePath) => {
        if (!musicMetadata) return null;
        try {
          const metadata = await musicMetadata.parseFile(filePath);
          return {
            title: metadata.common.title,
            artist: metadata.common.artist,
            album: metadata.common.album,
            year: metadata.common.year,
            track: metadata.common.track,
            duration: metadata.format.duration,
            picture: metadata.common.picture?.[0]
          };
        } catch {
          return null;
        }
      });
      const activeDownloads2 = /* @__PURE__ */ new Map();
      import_electron13.ipcMain.handle("downloadFile", async (event, url, filePath, headers) => {
        const dir = import_path5.default.dirname(filePath);
        await import_fs5.default.promises.mkdir(dir, { recursive: true });
        const controller = new AbortController();
        activeDownloads2.set(filePath, controller);
        const response = await fetch(url, {
          headers: headers || {},
          signal: controller.signal
        });
        if (!response.ok || !response.body) {
          activeDownloads2.delete(filePath);
          return { statusCode: response.status, bytesWritten: 0 };
        }
        const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
        const fileStream = import_fs5.default.createWriteStream(filePath);
        const reader = response.body.getReader();
        let bytesWritten = 0;
        const win2 = import_electron13.BrowserWindow.fromWebContents(event.sender);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fileStream.write(Buffer.from(value));
            bytesWritten += value.byteLength;
            if (win2 && contentLength > 0) {
              win2.webContents.send("downloadProgress", { path: filePath, progress: bytesWritten / contentLength });
            }
          }
        } finally {
          fileStream.end();
          activeDownloads2.delete(filePath);
        }
        return { statusCode: response.status, bytesWritten };
      });
      import_electron13.ipcMain.handle("downloadFileChunked", async (event, opts) => {
        const filePath = opts.toFile;
        const chunkSize = Math.max(64 * 1024, opts.chunkSize || 2 * 1024 * 1024);
        await import_fs5.default.promises.mkdir(import_path5.default.dirname(filePath), { recursive: true });
        const controller = new AbortController();
        activeDownloads2.set(filePath, controller);
        const handle = await import_fs5.default.promises.open(filePath, "w");
        const win2 = import_electron13.BrowserWindow.fromWebContents(event.sender);
        let totalWritten = 0;
        try {
          await handle.truncate(opts.contentLength);
          const numChunks = Math.ceil(opts.contentLength / chunkSize);
          await Promise.all(
            Array.from({ length: numChunks }, async (_unused, i) => {
              const start = i * chunkSize;
              const end = Math.min(start + chunkSize - 1, opts.contentLength - 1);
              const res = await fetch(opts.fromUrl, {
                headers: { ...opts.headers || {}, Range: `bytes=${start}-${end}` },
                signal: controller.signal
              });
              if (!res.ok || !res.body) {
                throw new Error(`chunk ${i} failed: HTTP ${res.status}`);
              }
              const buf = Buffer.from(await res.arrayBuffer());
              await handle.write(buf, 0, buf.length, start);
              totalWritten += buf.length;
              if (win2) {
                win2.webContents.send("downloadProgress", {
                  path: filePath,
                  progress: totalWritten / opts.contentLength
                });
              }
            })
          );
          return { statusCode: 200, bytesWritten: totalWritten };
        } finally {
          await handle.close().catch(() => {
          });
          activeDownloads2.delete(filePath);
        }
      });
      import_electron13.ipcMain.handle("stopDownload", async (_, filePath) => {
        const controller = activeDownloads2.get(filePath);
        if (controller) {
          controller.abort();
          activeDownloads2.delete(filePath);
        }
      });
      import_electron13.ipcMain.handle("readFileBase64", async (_, filePath) => {
        const content = await import_fs5.default.promises.readFile(filePath);
        return content.toString("base64");
      });
      import_electron13.ipcMain.handle("openLink", async (_, url) => {
        await import_electron13.shell.openExternal(url);
        return true;
      });
      import_electron13.ipcMain.handle("openAuthWindow", async (event, args) => {
        const { url, redirectUrlPrefix } = args;
        const parent = import_electron13.BrowserWindow.fromWebContents(event.sender) || void 0;
        const { title, backgroundColor, partition } = ctx.authWindow;
        return new Promise((resolve, reject) => {
          const browserWindowOpts = {
            ...parent ? { parent } : {},
            // NOTE: intentionally NOT modal — macOS would render a sheet.
            // Unlike the main window (which is frameless with hiddenInset), the
            // auth window uses a standard native frame + title bar so users see
            // the tenant title, a visible close button, and can drag it like any
            // other native window.
            width: 1040,
            height: 720,
            minWidth: 840,
            minHeight: 600,
            resizable: true,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            autoHideMenuBar: true,
            title,
            backgroundColor,
            darkTheme: true,
            show: false,
            frame: true,
            titleBarStyle: "default",
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true,
              partition
            }
          };
          const authWin = new import_electron13.BrowserWindow(browserWindowOpts);
          const defaultUA = authWin.webContents.getUserAgent();
          const appName = import_electron13.app.getName();
          const escapedName = appName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const cleanUA = defaultUA.replace(/\s?Electron\/[\d.]+/g, "").replace(new RegExp(`\\s?${escapedName}\\/[\\d.]+`, "gi"), "").replace(/\s+/g, " ").trim();
          authWin.webContents.setUserAgent(cleanUA);
          authWin.once("ready-to-show", () => authWin.show());
          let settled = false;
          const finish = (result) => {
            if (settled) return;
            settled = true;
            if (!authWin.isDestroyed()) authWin.destroy();
            if (result.url) resolve(result.url);
            else reject(result.error || new Error("Auth window closed"));
          };
          const tryCapture = (candidate, electronEvent) => {
            if (candidate.startsWith(redirectUrlPrefix)) {
              electronEvent?.preventDefault?.();
              finish({ url: candidate });
            }
          };
          authWin.webContents.on("will-navigate", (e, u) => tryCapture(u, e));
          authWin.webContents.on("will-redirect", (e, u) => tryCapture(u, e));
          authWin.webContents.on("did-fail-load", (_e, _code, _desc, validatedURL) => {
            if (validatedURL) tryCapture(validatedURL);
          });
          authWin.webContents.setWindowOpenHandler(() => ({ action: "allow" }));
          authWin.webContents.on("did-create-window", (childWin) => {
            childWin.webContents.on("will-navigate", (e, u) => tryCapture(u, e));
            childWin.webContents.on("will-redirect", (e, u) => tryCapture(u, e));
            childWin.webContents.on("did-fail-load", (_e, _code, _desc, validatedURL) => {
              if (validatedURL) tryCapture(validatedURL);
            });
          });
          authWin.on("closed", () => finish({ error: new Error("Auth window closed by user") }));
          authWin.loadURL(url).catch((err) => finish({ error: err instanceof Error ? err : new Error(String(err)) }));
        });
      });
      import_electron13.ipcMain.handle("showOpenDialog", async (_, options) => {
        const result = await import_electron13.dialog.showOpenDialog(options);
        return result;
      });
      import_electron13.ipcMain.handle("togglePowerSaveBlocker", (_, enable) => {
        if (enable && powerSaveBlockerId === null) {
          powerSaveBlockerId = import_electron13.powerSaveBlocker.start("prevent-app-suspension");
        } else if (!enable && powerSaveBlockerId !== null) {
          import_electron13.powerSaveBlocker.stop(powerSaveBlockerId);
          powerSaveBlockerId = null;
        }
        return true;
      });
      import_electron13.ipcMain.handle("quitApp", () => {
        import_electron13.app.quit();
      });
      let lastCheckHadUpdate2 = false;
      if (updater) {
        updater.on("update-available", () => {
          lastCheckHadUpdate2 = true;
        });
        updater.on("update-not-available", () => {
          lastCheckHadUpdate2 = false;
        });
      }
      import_electron13.ipcMain.handle("checkForUpdates", async () => {
        if (!updater) return null;
        try {
          lastCheckHadUpdate2 = false;
          const result = await updater.checkForUpdates();
          if (lastCheckHadUpdate2 && result?.updateInfo) {
            return { updateInfo: result.updateInfo, versionInfo: result.versionInfo };
          }
          return null;
        } catch {
          return null;
        }
      });
      import_electron13.ipcMain.handle("downloadAutoUpdate", async () => {
        if (!updater) return { success: false, error: "No autoUpdater configured" };
        try {
          await updater.downloadUpdate();
          return { success: true };
        } catch (error) {
          return { success: false, error: error?.message ?? String(error) };
        }
      });
      import_electron13.ipcMain.handle("installAutoUpdate", () => {
        updater?.quitAndInstall();
      });
      import_electron13.nativeTheme.on("updated", () => {
        import_electron13.BrowserWindow.getAllWindows().forEach((win2) => {
          win2.webContents.send("onThemeChanged", import_electron13.nativeTheme.shouldUseDarkColors);
        });
      });
    };
    bindDesktopWindowEvents = (win2, ctx = {}) => {
      const updater = ctx.autoUpdater;
      const getIconDir = ctx.getIconDir ?? defaultIconDir;
      import_electron13.ipcMain.handle("closeWindow", () => {
        win2.close();
      });
      import_electron13.ipcMain.handle("minimizeWindow", () => {
        win2.minimize();
      });
      import_electron13.ipcMain.handle("maximizeWindow", () => {
        win2.maximize();
      });
      import_electron13.ipcMain.handle("unmaximizeWindow", () => {
        win2.unmaximize();
      });
      import_electron13.ipcMain.handle("focusWindow", () => {
        win2.focus();
      });
      import_electron13.ipcMain.handle("setFullscreenWindow", (_, fullscreen) => {
        win2.setFullScreen(fullscreen);
      });
      import_electron13.ipcMain.handle("isWindowMaximized", () => {
        return win2.isMaximized();
      });
      import_electron13.ipcMain.handle("isWindowFullscreen", () => {
        return win2.isFullScreen();
      });
      import_electron13.ipcMain.handle("reloadApp", () => {
        const startUrl = import_electron13.app.isPackaged ? "app://localhost/index.html" : "http://localhost:3000";
        win2.loadURL(startUrl);
      });
      import_electron13.ipcMain.handle("setZoomLevel", (_, level) => {
        win2.webContents.setZoomLevel(level);
      });
      import_electron13.ipcMain.handle("getZoomLevel", () => {
        return win2.webContents.getZoomLevel();
      });
      import_electron13.ipcMain.handle("setApplicationMenu", (_, template) => {
        const menu = import_electron13.Menu.buildFromTemplate(buildMenuTemplate2(template, win2, "onMenuAction"));
        import_electron13.Menu.setApplicationMenu(menu);
      });
      import_electron13.ipcMain.handle("setWindowTitle", (_, title) => {
        win2.setTitle(title);
      });
      import_electron13.ipcMain.handle("setDockMenu", (_, template) => {
        if (process.platform !== "darwin") return;
        const menu = import_electron13.Menu.buildFromTemplate(buildMenuTemplate2(template, win2, "onMenuAction"));
        import_electron13.app.dock?.setMenu(menu);
      });
      import_electron13.ipcMain.handle("createTray", (_, options) => {
        if (tray2) tray2.destroy();
        const iconPath = import_path5.default.join(getIconDir(), "logo.png");
        const icon = import_electron13.nativeImage.createFromPath(iconPath);
        if (process.platform === "darwin") icon.setTemplateImage(true);
        tray2 = new import_electron13.Tray(icon);
        if (options.tooltip) tray2.setToolTip(options.tooltip);
        if (options.template) {
          tray2.setContextMenu(import_electron13.Menu.buildFromTemplate(buildMenuTemplate2(options.template, win2, "onMenuAction")));
        }
        tray2.on("click", () => {
          win2.show();
          win2.focus();
        });
      });
      import_electron13.ipcMain.handle("updateTray", (_, options) => {
        if (!tray2) return;
        if (options.tooltip !== void 0) tray2.setToolTip(options.tooltip);
        if (options.template) {
          tray2.setContextMenu(import_electron13.Menu.buildFromTemplate(buildMenuTemplate2(options.template, win2, "onMenuAction")));
        }
      });
      import_electron13.ipcMain.handle("destroyTray", () => {
        if (tray2) {
          tray2.destroy();
          tray2 = null;
        }
      });
      import_electron13.ipcMain.handle("setThumbarButtons", (_, buttons) => {
        if (process.platform !== "win32") return;
        const thumbButtons = buttons.map((btn) => ({
          icon: import_electron13.nativeImage.createFromDataURL(btn.icon),
          tooltip: btn.tooltip,
          click: () => {
            win2.webContents.send("onMenuAction", btn.action);
          },
          ...btn.enabled === false ? { flags: ["disabled"] } : {}
        }));
        win2.setThumbarButtons(thumbButtons);
      });
      import_electron13.ipcMain.handle("clearThumbarButtons", () => {
        if (process.platform !== "win32") return;
        win2.setThumbarButtons([]);
      });
      import_electron13.ipcMain.handle("setAppIcon", (_, iconPath) => {
        const icon = import_electron13.nativeImage.createFromPath(iconPath);
        if (process.platform === "darwin") {
          import_electron13.app.dock?.setIcon(icon);
        } else {
          win2.setIcon(icon);
        }
      });
      import_electron13.ipcMain.handle("resetAppIcon", () => {
        if (process.platform === "darwin") {
          import_electron13.app.dock?.setIcon(import_electron13.nativeImage.createFromPath(import_path5.default.join(getIconDir(), "icon_512x512.png")));
        }
      });
      win2.on("resize", () => {
        win2.webContents.send("onWindowResize");
      });
      if (updater) {
        updater.on("update-available", (info) => {
          win2.webContents.send("updateAvailable", info);
        });
        updater.on("update-downloaded", (info) => {
          win2.webContents.send("updateDownloaded", info);
        });
        updater.on("error", (error) => {
          const serialized = { message: error?.message ?? String(error), stack: error?.stack };
          win2.webContents.send("updateError", serialized);
        });
        updater.on("download-progress", (progress) => {
          win2.webContents.send("updateProgress", progress);
        });
      }
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/desktopPreload.ts
var desktopPreload_exports = {};
__export(desktopPreload_exports, {
  exposeDesktopElectronAPI: () => exposeDesktopElectronAPI
});
var import_electron14, exposeDesktopElectronAPI;
var init_desktopPreload = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/desktopPreload.ts"() {
    "use strict";
    import_electron14 = require("electron");
    exposeDesktopElectronAPI = () => {
      import_electron14.contextBridge.exposeInMainWorld("electronAPI", {
        // Spotify WebView preload path
        getSpotifyWebviewPreloadPath: () => import_electron14.ipcRenderer.invoke("getSpotifyWebviewPreloadPath"),
        // YouTube embed <webview> preload path. Its presence is also what
        // BloomEmbed's ElectronWebView uses to detect "we are on desktop".
        getEmbedWebviewPreloadPath: () => import_electron14.ipcRenderer.invoke("getEmbedWebviewPreloadPath"),
        // Park the embed's bootstrap in the main process so the guest preload can
        // re-run it on every navigation, not just the first page.
        setEmbedWebviewBootstrap: (code) => import_electron14.ipcRenderer.invoke("setEmbedWebviewBootstrap", code),
        // Window minimised / hidden. The embed guest cannot work this out for
        // itself — we deliberately make it believe it is always visible — so the
        // main process is the only honest source, and the embed needs the truth to
        // defend its playback (see BloomEmbed's electronWebviewPreload).
        onWindowHiddenChanged: (callback) => {
          import_electron14.ipcRenderer.on("windowHiddenChanged", callback);
          return () => import_electron14.ipcRenderer.removeListener("windowHiddenChanged", callback);
        },
        // Distribution
        getDistribution: () => import_electron14.ipcRenderer.invoke("getDistribution"),
        getIsPackaged: () => import_electron14.ipcRenderer.invoke("getIsPackaged"),
        getAppVersion: () => import_electron14.ipcRenderer.invoke("getAppVersion"),
        // Deep linking
        onDeepLinkReceived: (callback) => {
          import_electron14.ipcRenderer.on("onDeepLinkReceived", callback);
        },
        // Window controls
        closeWindow: () => import_electron14.ipcRenderer.invoke("closeWindow"),
        minimizeWindow: () => import_electron14.ipcRenderer.invoke("minimizeWindow"),
        maximizeWindow: () => import_electron14.ipcRenderer.invoke("maximizeWindow"),
        unmaximizeWindow: () => import_electron14.ipcRenderer.invoke("unmaximizeWindow"),
        focusWindow: () => import_electron14.ipcRenderer.invoke("focusWindow"),
        setFullscreenWindow: (fullscreen) => import_electron14.ipcRenderer.invoke("setFullscreenWindow", fullscreen),
        isWindowMaximized: () => import_electron14.ipcRenderer.invoke("isWindowMaximized"),
        isWindowFullscreen: () => import_electron14.ipcRenderer.invoke("isWindowFullscreen"),
        // Window events
        onWindowResize: (callback) => {
          import_electron14.ipcRenderer.on("onWindowResize", callback);
        },
        onThemeChanged: (callback) => {
          import_electron14.ipcRenderer.on("onThemeChanged", callback);
        },
        // File system operations
        writeFile: (filePath, content, encoding) => import_electron14.ipcRenderer.invoke("writeFile", filePath, content, encoding),
        readFile: (filePath, options) => import_electron14.ipcRenderer.invoke("readFile", filePath, options),
        fileExists: (filePath) => import_electron14.ipcRenderer.invoke("fileExists", filePath),
        readDirectory: (dirPath, options) => import_electron14.ipcRenderer.invoke("readDirectory", dirPath, options),
        readDirectoryWithStats: (dirPath) => import_electron14.ipcRenderer.invoke("readDirectoryWithStats", dirPath),
        makeDirectory: (dirPath, options) => import_electron14.ipcRenderer.invoke("makeDirectory", dirPath, options),
        unlinkFile: (filePath) => import_electron14.ipcRenderer.invoke("unlinkFile", filePath),
        unlinkFiles: (filePaths) => import_electron14.ipcRenderer.invoke("unlinkFiles", filePaths),
        unlinkDirectory: (dirPath) => import_electron14.ipcRenderer.invoke("unlinkDirectory", dirPath),
        copyFile: (src, dest) => import_electron14.ipcRenderer.invoke("copyFile", src, dest),
        renameFile: (oldPath, newPath) => import_electron14.ipcRenderer.invoke("renameFile", oldPath, newPath),
        fileStat: (filePath) => import_electron14.ipcRenderer.invoke("fileStat", filePath),
        // Downloads
        downloadFile: (url, filePath, headers) => import_electron14.ipcRenderer.invoke("downloadFile", url, filePath, headers),
        downloadFileChunked: (opts) => import_electron14.ipcRenderer.invoke("downloadFileChunked", opts),
        stopDownload: (filePath) => import_electron14.ipcRenderer.invoke("stopDownload", filePath),
        readFileBase64: (filePath) => import_electron14.ipcRenderer.invoke("readFileBase64", filePath),
        onDownloadProgress: (callback) => {
          import_electron14.ipcRenderer.on("downloadProgress", callback);
        },
        // Cookies
        setCookie: (cookie) => import_electron14.ipcRenderer.invoke("setCookie", cookie),
        removeCookie: (url, name4) => import_electron14.ipcRenderer.invoke("removeCookie", url, name4),
        getCookies: (filter) => import_electron14.ipcRenderer.invoke("getCookies", filter),
        // Inline YouTube sign-in (top-level WebContentsView overlay). Used by the
        // YouTube account screen on desktop, where Google blocks <webview> sign-in.
        ytLogin: {
          open: (bounds) => import_electron14.ipcRenderer.invoke("ytLogin:open", bounds),
          setBounds: (bounds) => import_electron14.ipcRenderer.invoke("ytLogin:setBounds", bounds),
          close: () => import_electron14.ipcRenderer.invoke("ytLogin:close"),
          clearCookies: () => import_electron14.ipcRenderer.invoke("ytLogin:clearCookies"),
          onResult: (callback) => {
            import_electron14.ipcRenderer.on("ytLogin:result", callback);
            return () => {
              import_electron14.ipcRenderer.removeListener("ytLogin:result", callback);
            };
          },
          onNavigate: (callback) => {
            import_electron14.ipcRenderer.on("ytLogin:navigate", callback);
            return () => {
              import_electron14.ipcRenderer.removeListener("ytLogin:navigate", callback);
            };
          }
        },
        // System info
        getLocale: () => import_electron14.ipcRenderer.invoke("getLocale"),
        getPath: (type) => import_electron14.ipcRenderer.invoke("getPath", type),
        getMachineId: () => import_electron14.ipcRenderer.invoke("getMachineId"),
        getShouldUseDarkColors: () => import_electron14.ipcRenderer.invoke("getShouldUseDarkColors"),
        getProcessBrief: () => import_electron14.ipcRenderer.invoke("getProcessBrief"),
        // Media metadata
        getMusicMetadata: (filePath) => import_electron14.ipcRenderer.invoke("getMusicMetadata", filePath),
        // Zoom
        setZoomLevel: (level) => import_electron14.ipcRenderer.invoke("setZoomLevel", level),
        getZoomLevel: () => import_electron14.ipcRenderer.invoke("getZoomLevel"),
        // Media controls
        setControls: (options) => import_electron14.ipcRenderer.invoke("setControls", options),
        dismissControls: () => import_electron14.ipcRenderer.invoke("dismissControls"),
        onCommand: (callback) => {
          import_electron14.ipcRenderer.on("onCommand", callback);
        },
        // OS hardware media keys (F7/F8/F9, BT headset buttons) bounced from the
        // main process via globalShortcut → 'mediaKey' channel. Returns the
        // unsubscribe to remove the listener; the subscribed channel mirrors
        // mediaKeys.ts:bindMediaKeyShortcuts so the event names stay in sync.
        onMediaKey: (callback) => {
          import_electron14.ipcRenderer.on("mediaKey", callback);
          return () => {
            import_electron14.ipcRenderer.removeListener("mediaKey", callback);
          };
        },
        // Desktop menus
        setApplicationMenu: (template) => import_electron14.ipcRenderer.invoke("setApplicationMenu", template),
        onMenuAction: (callback) => {
          import_electron14.ipcRenderer.on("onMenuAction", callback);
        },
        setWindowTitle: (title) => import_electron14.ipcRenderer.invoke("setWindowTitle", title),
        // Dock menu (macOS)
        setDockMenu: (template) => import_electron14.ipcRenderer.invoke("setDockMenu", template),
        // System tray
        createTray: (options) => import_electron14.ipcRenderer.invoke("createTray", options),
        updateTray: (options) => import_electron14.ipcRenderer.invoke("updateTray", options),
        destroyTray: () => import_electron14.ipcRenderer.invoke("destroyTray"),
        // Thumbnail toolbar (Windows)
        setThumbarButtons: (buttons) => import_electron14.ipcRenderer.invoke("setThumbarButtons", buttons),
        clearThumbarButtons: () => import_electron14.ipcRenderer.invoke("clearThumbarButtons"),
        // Power save
        togglePowerSaveBlocker: (enable) => import_electron14.ipcRenderer.invoke("togglePowerSaveBlocker", enable),
        // External links
        openLink: (url) => import_electron14.ipcRenderer.invoke("openLink", url),
        openAuthWindow: (args) => import_electron14.ipcRenderer.invoke("openAuthWindow", args),
        showOpenDialog: (options) => import_electron14.ipcRenderer.invoke("showOpenDialog", options),
        // Auto-update
        checkForUpdates: () => import_electron14.ipcRenderer.invoke("checkForUpdates"),
        downloadAutoUpdate: () => import_electron14.ipcRenderer.invoke("downloadAutoUpdate"),
        installAutoUpdate: () => import_electron14.ipcRenderer.invoke("installAutoUpdate"),
        onUpdateAvailable: (callback) => {
          import_electron14.ipcRenderer.on("updateAvailable", callback);
        },
        onUpdateDownloaded: (callback) => {
          import_electron14.ipcRenderer.on("updateDownloaded", callback);
        },
        onUpdateError: (callback) => {
          import_electron14.ipcRenderer.on("updateError", callback);
        },
        onUpdateProgress: (callback) => {
          import_electron14.ipcRenderer.on("updateProgress", callback);
        },
        // App controls
        reloadApp: () => import_electron14.ipcRenderer.invoke("reloadApp"),
        quitApp: () => import_electron14.ipcRenderer.invoke("quitApp"),
        setAppIcon: (iconPath) => import_electron14.ipcRenderer.invoke("setAppIcon", iconPath),
        resetAppIcon: () => import_electron14.ipcRenderer.invoke("resetAppIcon"),
        // FCM push (desktop). Main process speaks Google MCS via @aracna/fcm; the
        // renderer drives the lifecycle and registers the token with the server.
        fcm: {
          register: (config) => import_electron14.ipcRenderer.invoke("fcm:register", config),
          connect: () => import_electron14.ipcRenderer.invoke("fcm:connect"),
          disconnect: () => import_electron14.ipcRenderer.invoke("fcm:disconnect"),
          getToken: () => import_electron14.ipcRenderer.invoke("fcm:get-token"),
          isRegistered: () => import_electron14.ipcRenderer.invoke("fcm:is-registered"),
          setBackgroundMode: (enabled) => import_electron14.ipcRenderer.invoke("fcm:set-background-mode", enabled),
          showConfirmation: (n) => import_electron14.ipcRenderer.invoke("fcm:show-confirmation", n),
          onMessageData: (callback) => {
            import_electron14.ipcRenderer.on("fcm:message-data", callback);
            return () => {
              import_electron14.ipcRenderer.removeListener("fcm:message-data", callback);
            };
          }
        },
        // ==========================================
        // Native Services Bridge
        // ==========================================
        services: {
          // SQL Storage
          sql: {
            open: (database) => import_electron14.ipcRenderer.invoke("service:sql:open", database),
            execute: (request) => import_electron14.ipcRenderer.invoke("service:sql:execute", request),
            close: (database) => import_electron14.ipcRenderer.invoke("service:sql:close", database)
          },
          // Key-Value Storage
          kv: {
            create: (storage) => import_electron14.ipcRenderer.invoke("service:kv:create", storage),
            set: (request) => import_electron14.ipcRenderer.invoke("service:kv:set", request),
            get: (request) => import_electron14.ipcRenderer.invoke("service:kv:get", request),
            delete: (storage, key) => import_electron14.ipcRenderer.invoke("service:kv:delete", { storage, key }),
            deleteStorage: (storage) => import_electron14.ipcRenderer.invoke("service:kv:deleteStorage", storage)
          },
          // NoSQL Storage
          nosql: {
            createCollection: (database, collection) => import_electron14.ipcRenderer.invoke("service:nosql:createCollection", { database, collection }),
            set: (database, collection, id, record) => import_electron14.ipcRenderer.invoke("service:nosql:set", { database, collection, id, record }),
            bulkSet: (database, collection, records) => import_electron14.ipcRenderer.invoke("service:nosql:bulkSet", { database, collection, records }),
            getById: (database, collection, id) => import_electron14.ipcRenderer.invoke("service:nosql:getById", { database, collection, id }),
            getByIds: (database, collection, ids) => import_electron14.ipcRenderer.invoke("service:nosql:getByIds", { database, collection, ids }),
            remove: (database, collection, id) => import_electron14.ipcRenderer.invoke("service:nosql:remove", { database, collection, id }),
            bulkRemove: (database, collection, ids, filters) => import_electron14.ipcRenderer.invoke("service:nosql:bulkRemove", { database, collection, ids, filters }),
            clear: (database, collection) => import_electron14.ipcRenderer.invoke("service:nosql:clear", { database, collection }),
            query: (request) => import_electron14.ipcRenderer.invoke("service:nosql:query", request),
            count: (database, collection, filters) => import_electron14.ipcRenderer.invoke("service:nosql:count", { database, collection, filters })
          },
          // Crypto
          crypto: {
            hash: (data, algorithm) => import_electron14.ipcRenderer.invoke("service:crypto:hash", { data, algorithm }),
            xxhash: (data, algorithm) => import_electron14.ipcRenderer.invoke("service:crypto:xxhash", { data, algorithm }),
            randomBytes: (size) => import_electron14.ipcRenderer.invoke("service:crypto:randomBytes", size),
            decryptAES256: (data, keyString, ivString) => import_electron14.ipcRenderer.invoke("service:crypto:decryptAES256", { data, keyString, ivString })
          },
          // Discord Rich Presence
          discord: {
            setPresence: (data) => import_electron14.ipcRenderer.invoke("service:discord:setPresence", data),
            clearPresence: () => import_electron14.ipcRenderer.invoke("service:discord:clearPresence"),
            destroy: () => import_electron14.ipcRenderer.invoke("service:discord:destroy")
          },
          // File System
          fs: {
            writeFile: (request) => import_electron14.ipcRenderer.invoke("service:fs:writeFile", request),
            appendFile: (request) => import_electron14.ipcRenderer.invoke("service:fs:appendFile", request),
            readFile: (request) => import_electron14.ipcRenderer.invoke("service:fs:readFile", request),
            fileExists: (path11) => import_electron14.ipcRenderer.invoke("service:fs:fileExists", path11),
            readDir: (path11) => import_electron14.ipcRenderer.invoke("service:fs:readDir", path11),
            makeDir: (path11) => import_electron14.ipcRenderer.invoke("service:fs:makeDir", path11),
            unlinkFile: (path11) => import_electron14.ipcRenderer.invoke("service:fs:unlinkFile", path11),
            unlinkFiles: (paths) => import_electron14.ipcRenderer.invoke("service:fs:unlinkFiles", paths),
            copyFile: (request) => import_electron14.ipcRenderer.invoke("service:fs:copyFile", request),
            fileStat: (path11) => import_electron14.ipcRenderer.invoke("service:fs:fileStat", path11),
            getMediaTags: (path11) => import_electron14.ipcRenderer.invoke("service:fs:getMediaTags", path11),
            encodeBase64: (data) => import_electron14.ipcRenderer.invoke("service:fs:encodeBase64", data),
            decodeBase64: (data) => import_electron14.ipcRenderer.invoke("service:fs:decodeBase64", data),
            downloadFile: (request) => import_electron14.ipcRenderer.invoke("service:fs:downloadFile", request),
            stopDownload: (request) => import_electron14.ipcRenderer.invoke("service:fs:stopDownload", request),
            onDownloadBegin: (callback) => {
              const listener = (_e, data) => callback(data);
              import_electron14.ipcRenderer.on("service:fs:downloadBegin", listener);
              return () => import_electron14.ipcRenderer.removeListener("service:fs:downloadBegin", listener);
            },
            onDownloadProgress: (callback) => {
              const listener = (_e, data) => callback(data);
              import_electron14.ipcRenderer.on("service:fs:downloadProgress", listener);
              return () => import_electron14.ipcRenderer.removeListener("service:fs:downloadProgress", listener);
            }
          },
          // Chunked downloader: HTTP Range-based, bypasses per-connection throttles.
          chunked: {
            download: (request) => import_electron14.ipcRenderer.invoke("service:chunked:download", request),
            stopDownload: (request) => import_electron14.ipcRenderer.invoke("service:chunked:stopDownload", request),
            onDownloadProgress: (callback) => {
              const listener = (_e, data) => callback(data);
              import_electron14.ipcRenderer.on("service:chunked:downloadProgress", listener);
              return () => import_electron14.ipcRenderer.removeListener("service:chunked:downloadProgress", listener);
            }
          },
          // File picker — native OS dialog via main (electron-main filePicker adapter).
          // The renderer adapter (electron-renderer/filePicker) requires this bridge
          // and throws if it's missing, breaking avatar / artwork / import pickers.
          filePicker: {
            pickImage: (opts) => import_electron14.ipcRenderer.invoke("service:filePicker:pickImage", opts),
            pickMediaFiles: () => import_electron14.ipcRenderer.invoke("service:filePicker:pickMediaFiles"),
            pickFile: (opts) => import_electron14.ipcRenderer.invoke("service:filePicker:pickFile", opts)
          },
          // Image color extraction — nativeImage in main (electron-main images adapter).
          // Without this bridge getColorPalette resolves null and album-art tinting
          // silently never works on desktop.
          images: {
            getColorPalette: (imageUrl) => import_electron14.ipcRenderer.invoke("service:images:getColorPalette", imageUrl)
          },
          // Auto-update — maps to the top-level channels the desktop main process
          // registers via bindDesktopWindowEvents (checkForUpdates / downloadAutoUpdate
          // / installAutoUpdate + updateAvailable/Downloaded/Error/Progress events).
          // The renderer adapter (electron-renderer/updates) reads services.updates;
          // without it the update banner never appears and Reload no-ops.
          updates: {
            check: () => import_electron14.ipcRenderer.invoke("checkForUpdates"),
            download: () => import_electron14.ipcRenderer.invoke("downloadAutoUpdate"),
            install: () => import_electron14.ipcRenderer.invoke("installAutoUpdate"),
            onAvailable: (callback) => {
              import_electron14.ipcRenderer.on("updateAvailable", callback);
            },
            onDownloaded: (callback) => {
              import_electron14.ipcRenderer.on("updateDownloaded", callback);
            },
            onError: (callback) => {
              import_electron14.ipcRenderer.on("updateError", callback);
            },
            onProgress: (callback) => {
              import_electron14.ipcRenderer.on("updateProgress", callback);
            }
          }
        }
      });
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/mediaKeys.ts
var mediaKeys_exports = {};
__export(mediaKeys_exports, {
  bindMediaKeyShortcuts: () => bindMediaKeyShortcuts,
  enableMediaKeyFeatures: () => enableMediaKeyFeatures
});
function enableMediaKeyFeatures() {
  if (featuresEnabled) return;
  featuresEnabled = true;
  import_electron15.app.commandLine.appendSwitch("enable-features", FEATURE_LIST);
}
function bindMediaKeyShortcuts(getWin) {
  if (shortcutsBound) return;
  shortcutsBound = true;
  const doBind = () => {
    if (process.platform === "win32") return;
    for (const [accelerator, eventName] of ACCELERATORS) {
      try {
        const ok = import_electron15.globalShortcut.register(accelerator, () => {
          const win2 = getWin();
          if (!win2 || win2.isDestroyed()) return;
          win2.webContents.send("mediaKey", eventName);
        });
        if (!ok) {
          console.warn(`[mediaKeys] globalShortcut.register('${accelerator}') returned false`);
        }
      } catch (err) {
        console.error(`[mediaKeys] failed to register ${accelerator}`, err);
      }
    }
  };
  if (import_electron15.app.isReady()) {
    doBind();
  } else {
    import_electron15.app.whenReady().then(doBind).catch((err) => {
      console.error("[mediaKeys] whenReady doBind failed", err);
    });
  }
  import_electron15.app.on("will-quit", () => {
    for (const [accelerator] of ACCELERATORS) {
      try {
        import_electron15.globalShortcut.unregister(accelerator);
      } catch {
      }
    }
  });
}
var import_electron15, FEATURE_LIST, ACCELERATORS, featuresEnabled, shortcutsBound;
var init_mediaKeys = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/mediaKeys.ts"() {
    "use strict";
    import_electron15 = require("electron");
    FEATURE_LIST = "MediaSessionService,HardwareMediaKeyHandling";
    ACCELERATORS = [
      ["MediaPlayPause", "play-pause"],
      ["MediaNextTrack", "next"],
      ["MediaPreviousTrack", "previous"],
      ["MediaStop", "stop"]
    ];
    featuresEnabled = false;
    shortcutsBound = false;
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/desktopMain.ts
var desktopMain_exports = {};
__export(desktopMain_exports, {
  createDesktopMain: () => createDesktopMain,
  getMainWindow: () => getMainWindow
});
function getMainWindow() {
  return _mainWindow ?? null;
}
function createDesktopMain(opts) {
  const {
    productName,
    title = productName,
    backgroundColor,
    protocols,
    preloadPath,
    window: winSize = {},
    setGlobalDev = false,
    devToolsAlwaysOn = false,
    disableLinuxSandbox = false,
    installUnhandledRejectionTrap = true,
    installContextMenu = true,
    runDatabaseMigration = true,
    disableHardwareAcceleration: doDisableHwAccel = true,
    bindEvents: bindEvents2,
    bindWindowEvents: bindWindowEvents2,
    onWillQuit,
    requestHeaderInterceptors = [],
    packagedProtocolScheme = "app",
    appUserModelId
  } = opts;
  if (!Array.isArray(protocols) || protocols.length === 0) {
    throw new Error("createDesktopMain: opts.protocols must be a non-empty array");
  }
  const dev = isDev();
  if (setGlobalDev) {
    ;
    globalThis.__DEV__ = dev;
  }
  if (runDatabaseMigration) {
    migrateDatabasesDir();
  }
  let isQuitting2 = false;
  if (process.platform === "win32") {
    const aumid = appUserModelId ?? import_electron16.app.getName();
    try {
      import_electron16.app.setAppUserModelId(aumid);
    } catch {
    }
  }
  let pendingDeepLink2 = null;
  const platform2 = detectPlatform2();
  if (doDisableHwAccel) {
    import_electron16.app.disableHardwareAcceleration();
  }
  if (!dev) {
    import_electron16.protocol.registerSchemesAsPrivileged([{
      scheme: packagedProtocolScheme,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }]);
  }
  if (!dev && installUnhandledRejectionTrap) {
    (async () => {
      try {
        const unhandled2 = (await import("electron-unhandled")).default;
        unhandled2({ logger: () => {
        }, showDialog: false });
      } catch (e) {
        console.error(e);
      }
    })();
  }
  for (const scheme of protocols) {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        import_electron16.app.setAsDefaultProtocolClient(scheme, process.execPath, [import_path6.default.resolve(process.argv[1])]);
      }
    } else {
      import_electron16.app.setAsDefaultProtocolClient(scheme);
    }
  }
  const gotTheLock2 = import_electron16.app.requestSingleInstanceLock();
  bindEvents2();
  if (installContextMenu) {
    try {
      const contextMenu2 = require("electron-context-menu");
      contextMenu2({
        showCopyImage: false,
        showSaveImage: false,
        showInspectElement: dev,
        showServices: true
      });
    } catch {
    }
  }
  import_electron16.app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
  if (disableLinuxSandbox && process.platform === "linux") {
    import_electron16.app.commandLine.appendSwitch("no-sandbox");
  }
  const createWindow2 = () => {
    const windowStateKeeper2 = require("electron-window-state");
    const mainWindowState = windowStateKeeper2({
      defaultWidth: winSize.defaultWidth ?? 1200,
      defaultHeight: winSize.defaultHeight ?? 800
    });
    _mainWindow = new import_electron16.BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      minWidth: winSize.minWidth ?? 300,
      height: mainWindowState.height,
      minHeight: winSize.minHeight ?? 600,
      autoHideMenuBar: true,
      backgroundColor,
      darkTheme: true,
      frame: platform2 === "linux",
      titleBarStyle: platform2 === "linux" ? "default" : platform2 === "windows" ? "hidden" : "hiddenInset",
      ...platform2 === "windows" ? {
        titleBarOverlay: {
          color: backgroundColor,
          symbolColor: "#ffffff",
          height: 36
        }
      } : {},
      trafficLightPosition: { x: 16, y: 16 },
      title,
      webPreferences: {
        webSecurity: false,
        devTools: devToolsAlwaysOn || dev,
        preload: preloadPath,
        spellcheck: true,
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true
      }
    });
    bindWindowEvents2(_mainWindow);
    const startUrl = dev ? "http://localhost:3000" : `${packagedProtocolScheme}://localhost/index.html`;
    _mainWindow.loadURL(startUrl);
    _mainWindow.webContents.on("did-finish-load", () => {
      if (pendingDeepLink2 && _mainWindow && !_mainWindow.isDestroyed()) {
        _mainWindow.webContents.send("onDeepLinkReceived", pendingDeepLink2);
        pendingDeepLink2 = null;
      }
    });
    mainWindowState.manage(_mainWindow);
    _mainWindow.on("close", (event) => {
      if (process.platform === "darwin" && !isQuitting2) {
        event.preventDefault();
        _mainWindow?.hide();
      }
    });
    _mainWindow.on("closed", () => {
      _mainWindow = void 0;
    });
  };
  if (!gotTheLock2) {
    import_electron16.app.quit();
    return;
  }
  import_electron16.app.on("second-instance", (_event, argv) => {
    if (_mainWindow && !_mainWindow.isDestroyed()) {
      if (_mainWindow.isMinimized()) _mainWindow.restore();
      _mainWindow.focus();
    }
    const url = argv?.find((p) => protocols.some((scheme) => p?.startsWith(`${scheme}://`)));
    if (url) {
      if (_mainWindow && !_mainWindow.isDestroyed()) {
        _mainWindow.webContents.send("onDeepLinkReceived", url);
      } else {
        pendingDeepLink2 = url;
      }
    }
  });
  import_electron16.app.on("open-url", (event, url) => {
    event.preventDefault();
    if (url && _mainWindow && !_mainWindow.isDestroyed()) {
      _mainWindow.webContents.send("onDeepLinkReceived", url);
    } else if (url) {
      pendingDeepLink2 = url;
    }
  });
  import_electron16.app.whenReady().then(() => {
    if (!dev) {
      const buildPath = import_path6.default.join(__dirname, "..", "..", "build");
      import_electron16.protocol.handle(packagedProtocolScheme, (request) => {
        const url = new URL(request.url);
        const filePath = import_path6.default.normalize(import_path6.default.join(buildPath, decodeURIComponent(url.pathname)));
        return import_electron16.net.fetch(`file://${filePath}`);
      });
    }
    createWindow2();
    import_electron16.app.on("activate", () => {
      if (_mainWindow) {
        _mainWindow.show();
        _mainWindow.focus();
      } else if (import_electron16.BrowserWindow.getAllWindows().length === 0) {
        createWindow2();
      }
    });
  });
  import_electron16.app.on("before-quit", () => {
    isQuitting2 = true;
  });
  if (onWillQuit) {
    import_electron16.app.on("will-quit", () => {
      try {
        onWillQuit();
      } catch (err) {
        console.error("[desktopMain] onWillQuit failed", err);
      }
    });
  }
  import_electron16.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      import_electron16.app.quit();
    }
  });
  import_electron16.app.on("ready", () => {
    import_electron16.session.defaultSession.webRequest.onBeforeSendHeaders(async (details, callback) => {
      if (!details.requestHeaders) {
        details.requestHeaders = {};
      }
      const skipSessionCookies = details.requestHeaders["X-Skip-Session-Cookies"] || details.requestHeaders["x-skip-session-cookies"];
      if (skipSessionCookies) {
        delete details.requestHeaders["X-Skip-Session-Cookies"];
        delete details.requestHeaders["x-skip-session-cookies"];
        const ownCookies = {
          ...parseCookies(details.requestHeaders.Cookie || details.requestHeaders.cookie),
          ...parseCookies(details.requestHeaders["X-Cookie"] || details.requestHeaders["x-cookie"])
        };
        delete details.requestHeaders.cookie;
        delete details.requestHeaders["X-Cookie"];
        delete details.requestHeaders["x-cookie"];
        if (Object.keys(ownCookies).length > 0) {
          details.requestHeaders.Cookie = serializeCookies(ownCookies);
        } else {
          delete details.requestHeaders.Cookie;
        }
      } else {
        const sessionCookie = await import_electron16.session.defaultSession.cookies.get({ url: details.url });
        const requestCookie = details.requestHeaders.Cookie || details.requestHeaders.cookie;
        const requestRestrictedCookie = details.requestHeaders["X-Cookie"] || details.requestHeaders["x-cookie"];
        if (sessionCookie.length > 0 || !!requestCookie || !!requestRestrictedCookie) {
          const sessionCookieParsed = sessionCookie.reduce((acc, cookie) => {
            acc[cookie.name] = cookie.value;
            return acc;
          }, {});
          const requestCookieParsed = parseCookies(requestCookie);
          const requestRestrictedCookieParsed = parseCookies(requestRestrictedCookie);
          details.requestHeaders.Cookie = serializeCookies({
            ...sessionCookieParsed,
            ...requestCookieParsed,
            ...requestRestrictedCookieParsed
          });
          delete details.requestHeaders["X-Cookie"];
          delete details.requestHeaders["x-cookie"];
        }
      }
      for (const interceptor of requestHeaderInterceptors) {
        try {
          interceptor(details);
        } catch (err) {
          console.error("[desktopMain] header interceptor failed", err);
        }
      }
      const restrictedHeaders = ["Origin", "Referer", "User-Agent", "Sec-Fetch-Mode"];
      restrictedHeaders.forEach((restrictedHeader) => {
        const keys = [
          `X-${restrictedHeader}`,
          `x-${restrictedHeader.toLocaleLowerCase()}`,
          restrictedHeader
        ];
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const valueTmp = details.requestHeaders[key];
          if (key !== restrictedHeader) {
            delete details.requestHeaders[key];
          }
          if (valueTmp) {
            details.requestHeaders[restrictedHeader] = valueTmp;
            break;
          }
        }
      });
      callback({
        cancel: false,
        requestHeaders: details.requestHeaders
      });
    });
  });
}
var import_electron16, import_path6, import_fs6, isDev, detectPlatform2, migrateDatabasesDir, parseCookies, serializeCookies, _mainWindow;
var init_desktopMain = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/desktopMain.ts"() {
    "use strict";
    import_electron16 = require("electron");
    import_path6 = __toESM(require("path"));
    import_fs6 = __toESM(require("fs"));
    isDev = () => {
      return !import_electron16.app.isPackaged;
    };
    detectPlatform2 = () => {
      if (process?.platform === "win32") return "windows";
      if (process?.platform === "darwin") return "macOS";
      return "linux";
    };
    migrateDatabasesDir = () => {
      const userData = import_electron16.app.getPath("userData");
      const oldDir = import_path6.default.join(userData, "databases");
      const newDir = import_path6.default.join(userData, "sql-data");
      if (!import_fs6.default.existsSync(oldDir)) return;
      try {
        const files = import_fs6.default.readdirSync(oldDir).filter((f) => f.endsWith(".db"));
        if (files.length === 0) return;
        import_fs6.default.mkdirSync(newDir, { recursive: true });
        for (const file of files) {
          const src = import_path6.default.join(oldDir, file);
          const dest = import_path6.default.join(newDir, file);
          const srcSize = import_fs6.default.statSync(src).size;
          const destSize = import_fs6.default.existsSync(dest) ? import_fs6.default.statSync(dest).size : 0;
          if (srcSize > destSize) {
            import_fs6.default.copyFileSync(src, dest);
          }
          import_fs6.default.unlinkSync(src);
        }
      } catch {
      }
    };
    parseCookies = (cookieString = "") => cookieString.split(";").reduce((acc, pair) => {
      const [key, ...val] = pair.trim().split("=");
      if (key) acc[key] = val.join("=");
      return acc;
    }, {});
    serializeCookies = (cookieObj) => Object.entries(cookieObj).map(([k, v]) => `${k}=${v}`).join("; ");
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/embedAdBlocker/index.ts
var embedAdBlocker_exports = {};
__export(embedAdBlocker_exports, {
  installEmbedAdBlocker: () => installEmbedAdBlocker
});
var import_electron17, AD_URL_PATTERNS, isYouTubeHost, requestedByYouTube, installed2, installEmbedAdBlocker;
var init_embedAdBlocker = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/embedAdBlocker/index.ts"() {
    "use strict";
    import_electron17 = require("electron");
    AD_URL_PATTERNS = [
      "*://*.youtube.com/pagead/*",
      "*://*.youtube.com/youtubei/v1/player/ad_break*",
      "*://*.youtube.com/get_midroll_*",
      "*://*.youtube.com/get_video_info*adunit*",
      "*://*.doubleclick.net/*",
      "*://*.googlesyndication.com/*",
      "*://*.googleadservices.com/*",
      "*://*.google.com/pagead/*"
    ];
    isYouTubeHost = (host) => host === "youtube.com" || host.endsWith(".youtube.com");
    requestedByYouTube = (webContentsId) => {
      if (webContentsId == null) return false;
      try {
        const contents = import_electron17.webContents.fromId(webContentsId);
        const url = contents?.getURL();
        if (!url) return false;
        return isYouTubeHost(new URL(url).hostname);
      } catch {
        return false;
      }
    };
    installed2 = false;
    installEmbedAdBlocker = () => {
      if (installed2) return;
      installed2 = true;
      try {
        import_electron17.session.defaultSession.webRequest.onBeforeRequest(
          { urls: AD_URL_PATTERNS },
          (details, callback) => callback({ cancel: requestedByYouTube(details.webContentsId) })
        );
      } catch {
        installed2 = false;
      }
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/rendererProtection.ts
var rendererProtection_exports = {};
__export(rendererProtection_exports, {
  contentTypeFor: () => contentTypeFor,
  decryptRendererAsset: () => decryptRendererAsset,
  isProtected: () => isProtected
});
var import_crypto2, MAGIC, IV_LEN, TAG_LEN, cachedKey, keyFor, isProtected, decryptRendererAsset, contentTypeFor;
var init_rendererProtection = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/rendererProtection.ts"() {
    "use strict";
    import_crypto2 = require("crypto");
    MAGIC = "BXR1";
    IV_LEN = 12;
    TAG_LEN = 16;
    keyFor = (buildPath) => {
      if (cachedKey !== void 0) return cachedKey;
      const fs9 = require("fs");
      const path11 = require("path");
      for (const dir of [buildPath, __dirname]) {
        try {
          const hex = fs9.readFileSync(path11.join(dir, ".renderer-key"), "utf8").trim();
          if (hex) {
            cachedKey = Buffer.from(hex, "hex");
            return cachedKey;
          }
        } catch {
        }
      }
      cachedKey = null;
      return cachedKey;
    };
    isProtected = (buf) => buf.length > MAGIC.length + IV_LEN + TAG_LEN && buf.subarray(0, 4).toString("latin1") === MAGIC;
    decryptRendererAsset = (buf, buildPath) => {
      if (!isProtected(buf)) return null;
      const key = keyFor(buildPath);
      if (!key) throw new Error("renderer asset is encrypted but this build carries no key");
      const iv = buf.subarray(4, 4 + IV_LEN);
      const tag = buf.subarray(4 + IV_LEN, 4 + IV_LEN + TAG_LEN);
      const body = buf.subarray(4 + IV_LEN + TAG_LEN);
      const decipher = (0, import_crypto2.createDecipheriv)("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(body), decipher.final()]);
    };
    contentTypeFor = (pathname) => {
      if (pathname.endsWith(".js") || pathname.endsWith(".mjs")) return "text/javascript; charset=utf-8";
      if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
      if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
      if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
      if (pathname.endsWith(".wasm")) return "application/wasm";
      return "application/octet-stream";
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/index.ts
var init_electron_main = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/index.ts"() {
    "use strict";
    init_keyValueStorage();
    init_nosqlStorage();
    init_sqlStorage();
    init_crypto();
    init_fileSystem();
    init_linking();
    init_sleepTimer();
    init_hapticFeedback();
    init_device();
    init_analytics();
    init_theme();
    init_images();
    init_filePicker();
    init_auth2();
    init_purchases2();
    init_remoteConfig2();
    init_updates();
    init_ads();
    init_pushNotifications();
    init_discordRpc();
    init_menuBar();
    init_playback();
    init_bootstrap();
    init_desktopEvents();
    init_desktopPreload();
    init_mediaKeys();
    init_desktopMain();
    init_embedAdBlocker();
    init_rendererProtection();
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/bootstrap.ts
var bootstrap_exports = {};
__export(bootstrap_exports, {
  prepareAppForPlatform: () => prepareAppForPlatform
});
var prepareAppForPlatform;
var init_bootstrap = __esm({
  "../../StreamingCore-Client/src/adapters/electron-main/bootstrap.ts"() {
    "use strict";
    init_electron_main();
    prepareAppForPlatform = async (contexts = {}) => {
      const all = [];
      if (contexts.keyValueStorage !== void 0) {
        all.push(
          contexts.keyValueStorage === true ? initKeyValueStorageAdapter() : initKeyValueStorageAdapter(contexts.keyValueStorage)
        );
      }
      if (contexts.nosqlStorage !== void 0) {
        all.push(
          contexts.nosqlStorage === true ? initNosqlStorageAdapter() : initNosqlStorageAdapter(contexts.nosqlStorage)
        );
      }
      if (contexts.sqlStorage !== void 0) {
        all.push(
          contexts.sqlStorage === true ? initSqlStorageAdapter() : initSqlStorageAdapter(contexts.sqlStorage)
        );
      }
      if (contexts.crypto) all.push(initCryptoAdapter());
      if (contexts.fileSystem) all.push(initFileSystemAdapter());
      if (contexts.images) all.push(initImagesAdapter());
      if (contexts.filePicker) all.push(initFilePickerAdapter());
      if (contexts.discordRpc !== void 0) {
        all.push(
          contexts.discordRpc === true ? initDiscordRpcAdapter() : initDiscordRpcAdapter(contexts.discordRpc)
        );
      }
      if (contexts.linking) all.push(initLinkingAdapter());
      if (contexts.sleepTimer) all.push(initSleepTimerAdapter());
      if (contexts.hapticFeedback) all.push(initHapticFeedbackAdapter());
      if (contexts.device) all.push(initDeviceAdapter());
      if (contexts.analytics) all.push(initAnalyticsAdapter());
      if (contexts.theme) all.push(initThemeAdapter());
      if (contexts.auth !== void 0) {
        all.push(
          contexts.auth === true ? initAuthAdapter() : initAuthAdapter(contexts.auth)
        );
      }
      if (contexts.purchases) all.push(initPurchasesAdapter());
      if (contexts.remoteConfig) {
        all.push(initRemoteConfigAdapter(contexts.remoteConfig));
      }
      if (contexts.updates !== void 0) {
        all.push(
          contexts.updates === true ? initUpdatesAdapter() : initUpdatesAdapter(contexts.updates)
        );
      }
      if (contexts.ads) all.push(initAdsAdapter());
      if (contexts.pushNotifications) all.push(initPushNotificationsAdapter());
      if (contexts.menuBar !== void 0) {
        all.push(
          contexts.menuBar === true ? initMenuBarAdapter() : initMenuBarAdapter(contexts.menuBar)
        );
      }
      if (contexts.playback) all.push(initPlaybackAdapter());
      await Promise.all(all);
    };
  }
});

// ../../StreamingCore-Client/src/adapters/electron-main/index.js
var require_electron_main = __commonJS({
  "../../StreamingCore-Client/src/adapters/electron-main/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.initLinkingAdapter = exports2.fsStopDownload = exports2.fsDownloadFile = exports2.fsGetMusicMetadata = exports2.fsFileStat = exports2.fsCopyFile = exports2.fsUnlinkFiles = exports2.fsUnlinkFile = exports2.fsMakeDirectory = exports2.fsReadDirectory = exports2.fsFileExists = exports2.fsReadFile = exports2.fsWriteFile = exports2.disposeFileSystemAdapter = exports2.initFileSystemAdapter = exports2.cryptoPbkdf2 = exports2.cryptoEncryptAES256 = exports2.cryptoDecryptAES256 = exports2.cryptoRandomBytesHex = exports2.cryptoRandomBytes = exports2.cryptoXxhash = exports2.cryptoHashBuffer = exports2.cryptoHash = exports2.disposeCryptoAdapter = exports2.initCryptoAdapter = exports2.closeAllSqlDatabases = exports2.closeSqlDatabase = exports2.executeSql = exports2.openSqlDatabase = exports2.disposeSqlStorageAdapter = exports2.initSqlStorageAdapter = exports2.getNosqlCount = exports2.queryNosqlCollection = exports2.clearNosqlCollection = exports2.bulkRemoveNosqlRecords = exports2.removeNosqlRecord = exports2.getNosqlRecordsByIds = exports2.getNosqlRecordById = exports2.bulkSetNosqlRecords = exports2.setNosqlRecord = exports2.createNosqlCollection = exports2.disposeNosqlStorageAdapter = exports2.initNosqlStorageAdapter = exports2.deleteKeyValueStorage = exports2.deleteKeyValueStorageItem = exports2.getKeyValueStorageItem = exports2.setKeyValueStorageItem = exports2.createKeyValueStorage = exports2.disposeKeyValueStorageAdapter = exports2.initKeyValueStorageAdapter = void 0;
    exports2.rendererAssetContentType = exports2.isRendererAssetProtected = exports2.decryptRendererAsset = exports2.installEmbedAdBlocker = exports2.getDesktopMainWindow = exports2.createDesktopMain = exports2.bindMediaKeyShortcuts = exports2.enableMediaKeyFeatures = exports2.exposeDesktopElectronAPI = exports2.bindDesktopWindowEvents = exports2.bindDesktopAppEvents = exports2.prepareAppForPlatform = exports2.disposePlaybackAdapter = exports2.initPlaybackAdapter = exports2.disposeMenuBarAdapter = exports2.initMenuBarAdapter = exports2.disposeDiscordRpcAdapter = exports2.initDiscordRpcAdapter = exports2.disposePushNotificationsAdapter = exports2.initPushNotificationsAdapter = exports2.disposeAdsAdapter = exports2.initAdsAdapter = exports2.disposeUpdatesAdapter = exports2.initUpdatesAdapter = exports2.disposeRemoteConfigAdapter = exports2.initRemoteConfigAdapter = exports2.disposePurchasesAdapter = exports2.initPurchasesAdapter = exports2.disposeAuthAdapter = exports2.initAuthAdapter = exports2.filePickerPickFile = exports2.filePickerPickMediaFiles = exports2.filePickerPickImage = exports2.disposeFilePickerAdapter = exports2.initFilePickerAdapter = exports2.clearImageColorCache = exports2.extractImageColorPalette = exports2.disposeImagesAdapter = exports2.initImagesAdapter = exports2.disposeThemeAdapter = exports2.initThemeAdapter = exports2.disposeAnalyticsAdapter = exports2.initAnalyticsAdapter = exports2.disposeDeviceAdapter = exports2.initDeviceAdapter = exports2.disposeHapticFeedbackAdapter = exports2.initHapticFeedbackAdapter = exports2.disposeSleepTimerAdapter = exports2.initSleepTimerAdapter = exports2.disposeLinkingAdapter = void 0;
    var index_1 = (init_keyValueStorage(), __toCommonJS(keyValueStorage_exports));
    Object.defineProperty(exports2, "initKeyValueStorageAdapter", { enumerable: true, get: function() {
      return index_1.initKeyValueStorageAdapter;
    } });
    Object.defineProperty(exports2, "disposeKeyValueStorageAdapter", { enumerable: true, get: function() {
      return index_1.disposeKeyValueStorageAdapter;
    } });
    Object.defineProperty(exports2, "createKeyValueStorage", { enumerable: true, get: function() {
      return index_1.createStorage;
    } });
    Object.defineProperty(exports2, "setKeyValueStorageItem", { enumerable: true, get: function() {
      return index_1.setItem;
    } });
    Object.defineProperty(exports2, "getKeyValueStorageItem", { enumerable: true, get: function() {
      return index_1.getItem;
    } });
    Object.defineProperty(exports2, "deleteKeyValueStorageItem", { enumerable: true, get: function() {
      return index_1.deleteItem;
    } });
    Object.defineProperty(exports2, "deleteKeyValueStorage", { enumerable: true, get: function() {
      return index_1.deleteStorage;
    } });
    var index_2 = (init_nosqlStorage(), __toCommonJS(nosqlStorage_exports));
    Object.defineProperty(exports2, "initNosqlStorageAdapter", { enumerable: true, get: function() {
      return index_2.initNosqlStorageAdapter;
    } });
    Object.defineProperty(exports2, "disposeNosqlStorageAdapter", { enumerable: true, get: function() {
      return index_2.disposeNosqlStorageAdapter;
    } });
    Object.defineProperty(exports2, "createNosqlCollection", { enumerable: true, get: function() {
      return index_2.createCollection;
    } });
    Object.defineProperty(exports2, "setNosqlRecord", { enumerable: true, get: function() {
      return index_2.set;
    } });
    Object.defineProperty(exports2, "bulkSetNosqlRecords", { enumerable: true, get: function() {
      return index_2.bulkSet;
    } });
    Object.defineProperty(exports2, "getNosqlRecordById", { enumerable: true, get: function() {
      return index_2.getById;
    } });
    Object.defineProperty(exports2, "getNosqlRecordsByIds", { enumerable: true, get: function() {
      return index_2.getByIds;
    } });
    Object.defineProperty(exports2, "removeNosqlRecord", { enumerable: true, get: function() {
      return index_2.remove;
    } });
    Object.defineProperty(exports2, "bulkRemoveNosqlRecords", { enumerable: true, get: function() {
      return index_2.bulkRemove;
    } });
    Object.defineProperty(exports2, "clearNosqlCollection", { enumerable: true, get: function() {
      return index_2.clear;
    } });
    Object.defineProperty(exports2, "queryNosqlCollection", { enumerable: true, get: function() {
      return index_2.query;
    } });
    Object.defineProperty(exports2, "getNosqlCount", { enumerable: true, get: function() {
      return index_2.getCount;
    } });
    var index_3 = (init_sqlStorage(), __toCommonJS(sqlStorage_exports));
    Object.defineProperty(exports2, "initSqlStorageAdapter", { enumerable: true, get: function() {
      return index_3.initSqlStorageAdapter;
    } });
    Object.defineProperty(exports2, "disposeSqlStorageAdapter", { enumerable: true, get: function() {
      return index_3.disposeSqlStorageAdapter;
    } });
    Object.defineProperty(exports2, "openSqlDatabase", { enumerable: true, get: function() {
      return index_3.openSqlDatabase;
    } });
    Object.defineProperty(exports2, "executeSql", { enumerable: true, get: function() {
      return index_3.executeSql;
    } });
    Object.defineProperty(exports2, "closeSqlDatabase", { enumerable: true, get: function() {
      return index_3.closeSqlDatabase;
    } });
    Object.defineProperty(exports2, "closeAllSqlDatabases", { enumerable: true, get: function() {
      return index_3.closeAllSqlDatabases;
    } });
    var index_4 = (init_crypto(), __toCommonJS(crypto_exports));
    Object.defineProperty(exports2, "initCryptoAdapter", { enumerable: true, get: function() {
      return index_4.initCryptoAdapter;
    } });
    Object.defineProperty(exports2, "disposeCryptoAdapter", { enumerable: true, get: function() {
      return index_4.disposeCryptoAdapter;
    } });
    Object.defineProperty(exports2, "cryptoHash", { enumerable: true, get: function() {
      return index_4.hash;
    } });
    Object.defineProperty(exports2, "cryptoHashBuffer", { enumerable: true, get: function() {
      return index_4.hashBuffer;
    } });
    Object.defineProperty(exports2, "cryptoXxhash", { enumerable: true, get: function() {
      return index_4.xxhashData;
    } });
    Object.defineProperty(exports2, "cryptoRandomBytes", { enumerable: true, get: function() {
      return index_4.randomBytes;
    } });
    Object.defineProperty(exports2, "cryptoRandomBytesHex", { enumerable: true, get: function() {
      return index_4.randomBytesHex;
    } });
    Object.defineProperty(exports2, "cryptoDecryptAES256", { enumerable: true, get: function() {
      return index_4.decryptAES256;
    } });
    Object.defineProperty(exports2, "cryptoEncryptAES256", { enumerable: true, get: function() {
      return index_4.encryptAES256;
    } });
    Object.defineProperty(exports2, "cryptoPbkdf2", { enumerable: true, get: function() {
      return index_4.pbkdf2;
    } });
    var index_5 = (init_fileSystem(), __toCommonJS(fileSystem_exports));
    Object.defineProperty(exports2, "initFileSystemAdapter", { enumerable: true, get: function() {
      return index_5.initFileSystemAdapter;
    } });
    Object.defineProperty(exports2, "disposeFileSystemAdapter", { enumerable: true, get: function() {
      return index_5.disposeFileSystemAdapter;
    } });
    Object.defineProperty(exports2, "fsWriteFile", { enumerable: true, get: function() {
      return index_5.writeFile;
    } });
    Object.defineProperty(exports2, "fsReadFile", { enumerable: true, get: function() {
      return index_5.readFile;
    } });
    Object.defineProperty(exports2, "fsFileExists", { enumerable: true, get: function() {
      return index_5.fileExists;
    } });
    Object.defineProperty(exports2, "fsReadDirectory", { enumerable: true, get: function() {
      return index_5.readDirectory;
    } });
    Object.defineProperty(exports2, "fsMakeDirectory", { enumerable: true, get: function() {
      return index_5.makeDirectory;
    } });
    Object.defineProperty(exports2, "fsUnlinkFile", { enumerable: true, get: function() {
      return index_5.unlinkFile;
    } });
    Object.defineProperty(exports2, "fsUnlinkFiles", { enumerable: true, get: function() {
      return index_5.unlinkFiles;
    } });
    Object.defineProperty(exports2, "fsCopyFile", { enumerable: true, get: function() {
      return index_5.copyFile;
    } });
    Object.defineProperty(exports2, "fsFileStat", { enumerable: true, get: function() {
      return index_5.fileStat;
    } });
    Object.defineProperty(exports2, "fsGetMusicMetadata", { enumerable: true, get: function() {
      return index_5.getMusicMetadata;
    } });
    Object.defineProperty(exports2, "fsDownloadFile", { enumerable: true, get: function() {
      return index_5.downloadFile;
    } });
    Object.defineProperty(exports2, "fsStopDownload", { enumerable: true, get: function() {
      return index_5.stopDownload;
    } });
    var index_6 = (init_linking(), __toCommonJS(linking_exports));
    Object.defineProperty(exports2, "initLinkingAdapter", { enumerable: true, get: function() {
      return index_6.initLinkingAdapter;
    } });
    Object.defineProperty(exports2, "disposeLinkingAdapter", { enumerable: true, get: function() {
      return index_6.disposeLinkingAdapter;
    } });
    var index_7 = (init_sleepTimer(), __toCommonJS(sleepTimer_exports));
    Object.defineProperty(exports2, "initSleepTimerAdapter", { enumerable: true, get: function() {
      return index_7.initSleepTimerAdapter;
    } });
    Object.defineProperty(exports2, "disposeSleepTimerAdapter", { enumerable: true, get: function() {
      return index_7.disposeSleepTimerAdapter;
    } });
    var index_8 = (init_hapticFeedback(), __toCommonJS(hapticFeedback_exports));
    Object.defineProperty(exports2, "initHapticFeedbackAdapter", { enumerable: true, get: function() {
      return index_8.initHapticFeedbackAdapter;
    } });
    Object.defineProperty(exports2, "disposeHapticFeedbackAdapter", { enumerable: true, get: function() {
      return index_8.disposeHapticFeedbackAdapter;
    } });
    var index_9 = (init_device(), __toCommonJS(device_exports));
    Object.defineProperty(exports2, "initDeviceAdapter", { enumerable: true, get: function() {
      return index_9.initDeviceAdapter;
    } });
    Object.defineProperty(exports2, "disposeDeviceAdapter", { enumerable: true, get: function() {
      return index_9.disposeDeviceAdapter;
    } });
    var index_10 = (init_analytics(), __toCommonJS(analytics_exports));
    Object.defineProperty(exports2, "initAnalyticsAdapter", { enumerable: true, get: function() {
      return index_10.initAnalyticsAdapter;
    } });
    Object.defineProperty(exports2, "disposeAnalyticsAdapter", { enumerable: true, get: function() {
      return index_10.disposeAnalyticsAdapter;
    } });
    var index_11 = (init_theme(), __toCommonJS(theme_exports));
    Object.defineProperty(exports2, "initThemeAdapter", { enumerable: true, get: function() {
      return index_11.initThemeAdapter;
    } });
    Object.defineProperty(exports2, "disposeThemeAdapter", { enumerable: true, get: function() {
      return index_11.disposeThemeAdapter;
    } });
    var index_12 = (init_images(), __toCommonJS(images_exports));
    Object.defineProperty(exports2, "initImagesAdapter", { enumerable: true, get: function() {
      return index_12.initImagesAdapter;
    } });
    Object.defineProperty(exports2, "disposeImagesAdapter", { enumerable: true, get: function() {
      return index_12.disposeImagesAdapter;
    } });
    Object.defineProperty(exports2, "extractImageColorPalette", { enumerable: true, get: function() {
      return index_12.extractColorPalette;
    } });
    Object.defineProperty(exports2, "clearImageColorCache", { enumerable: true, get: function() {
      return index_12.clearColorCache;
    } });
    var index_13 = (init_filePicker(), __toCommonJS(filePicker_exports));
    Object.defineProperty(exports2, "initFilePickerAdapter", { enumerable: true, get: function() {
      return index_13.initFilePickerAdapter;
    } });
    Object.defineProperty(exports2, "disposeFilePickerAdapter", { enumerable: true, get: function() {
      return index_13.disposeFilePickerAdapter;
    } });
    Object.defineProperty(exports2, "filePickerPickImage", { enumerable: true, get: function() {
      return index_13.pickImage;
    } });
    Object.defineProperty(exports2, "filePickerPickMediaFiles", { enumerable: true, get: function() {
      return index_13.pickMediaFiles;
    } });
    Object.defineProperty(exports2, "filePickerPickFile", { enumerable: true, get: function() {
      return index_13.pickFile;
    } });
    var index_14 = (init_auth2(), __toCommonJS(auth_exports));
    Object.defineProperty(exports2, "initAuthAdapter", { enumerable: true, get: function() {
      return index_14.initAuthAdapter;
    } });
    Object.defineProperty(exports2, "disposeAuthAdapter", { enumerable: true, get: function() {
      return index_14.disposeAuthAdapter;
    } });
    var index_15 = (init_purchases2(), __toCommonJS(purchases_exports));
    Object.defineProperty(exports2, "initPurchasesAdapter", { enumerable: true, get: function() {
      return index_15.initPurchasesAdapter;
    } });
    Object.defineProperty(exports2, "disposePurchasesAdapter", { enumerable: true, get: function() {
      return index_15.disposePurchasesAdapter;
    } });
    var index_16 = (init_remoteConfig2(), __toCommonJS(remoteConfig_exports));
    Object.defineProperty(exports2, "initRemoteConfigAdapter", { enumerable: true, get: function() {
      return index_16.initRemoteConfigAdapter;
    } });
    Object.defineProperty(exports2, "disposeRemoteConfigAdapter", { enumerable: true, get: function() {
      return index_16.disposeRemoteConfigAdapter;
    } });
    var index_17 = (init_updates(), __toCommonJS(updates_exports));
    Object.defineProperty(exports2, "initUpdatesAdapter", { enumerable: true, get: function() {
      return index_17.initUpdatesAdapter;
    } });
    Object.defineProperty(exports2, "disposeUpdatesAdapter", { enumerable: true, get: function() {
      return index_17.disposeUpdatesAdapter;
    } });
    var index_18 = (init_ads(), __toCommonJS(ads_exports));
    Object.defineProperty(exports2, "initAdsAdapter", { enumerable: true, get: function() {
      return index_18.initAdsAdapter;
    } });
    Object.defineProperty(exports2, "disposeAdsAdapter", { enumerable: true, get: function() {
      return index_18.disposeAdsAdapter;
    } });
    var index_19 = (init_pushNotifications(), __toCommonJS(pushNotifications_exports));
    Object.defineProperty(exports2, "initPushNotificationsAdapter", { enumerable: true, get: function() {
      return index_19.initPushNotificationsAdapter;
    } });
    Object.defineProperty(exports2, "disposePushNotificationsAdapter", { enumerable: true, get: function() {
      return index_19.disposePushNotificationsAdapter;
    } });
    var index_20 = (init_discordRpc(), __toCommonJS(discordRpc_exports));
    Object.defineProperty(exports2, "initDiscordRpcAdapter", { enumerable: true, get: function() {
      return index_20.initDiscordRpcAdapter;
    } });
    Object.defineProperty(exports2, "disposeDiscordRpcAdapter", { enumerable: true, get: function() {
      return index_20.disposeDiscordRpcAdapter;
    } });
    var index_21 = (init_menuBar(), __toCommonJS(menuBar_exports));
    Object.defineProperty(exports2, "initMenuBarAdapter", { enumerable: true, get: function() {
      return index_21.initMenuBarAdapter;
    } });
    Object.defineProperty(exports2, "disposeMenuBarAdapter", { enumerable: true, get: function() {
      return index_21.disposeMenuBarAdapter;
    } });
    var index_22 = (init_playback(), __toCommonJS(playback_exports));
    Object.defineProperty(exports2, "initPlaybackAdapter", { enumerable: true, get: function() {
      return index_22.initPlaybackAdapter;
    } });
    Object.defineProperty(exports2, "disposePlaybackAdapter", { enumerable: true, get: function() {
      return index_22.disposePlaybackAdapter;
    } });
    var bootstrap_1 = (init_bootstrap(), __toCommonJS(bootstrap_exports));
    Object.defineProperty(exports2, "prepareAppForPlatform", { enumerable: true, get: function() {
      return bootstrap_1.prepareAppForPlatform;
    } });
    var desktopEvents_1 = (init_desktopEvents(), __toCommonJS(desktopEvents_exports));
    Object.defineProperty(exports2, "bindDesktopAppEvents", { enumerable: true, get: function() {
      return desktopEvents_1.bindDesktopAppEvents;
    } });
    Object.defineProperty(exports2, "bindDesktopWindowEvents", { enumerable: true, get: function() {
      return desktopEvents_1.bindDesktopWindowEvents;
    } });
    var desktopPreload_1 = (init_desktopPreload(), __toCommonJS(desktopPreload_exports));
    Object.defineProperty(exports2, "exposeDesktopElectronAPI", { enumerable: true, get: function() {
      return desktopPreload_1.exposeDesktopElectronAPI;
    } });
    var mediaKeys_1 = (init_mediaKeys(), __toCommonJS(mediaKeys_exports));
    Object.defineProperty(exports2, "enableMediaKeyFeatures", { enumerable: true, get: function() {
      return mediaKeys_1.enableMediaKeyFeatures;
    } });
    Object.defineProperty(exports2, "bindMediaKeyShortcuts", { enumerable: true, get: function() {
      return mediaKeys_1.bindMediaKeyShortcuts;
    } });
    var desktopMain_1 = (init_desktopMain(), __toCommonJS(desktopMain_exports));
    Object.defineProperty(exports2, "createDesktopMain", { enumerable: true, get: function() {
      return desktopMain_1.createDesktopMain;
    } });
    Object.defineProperty(exports2, "getDesktopMainWindow", { enumerable: true, get: function() {
      return desktopMain_1.getMainWindow;
    } });
    var index_23 = (init_embedAdBlocker(), __toCommonJS(embedAdBlocker_exports));
    Object.defineProperty(exports2, "installEmbedAdBlocker", { enumerable: true, get: function() {
      return index_23.installEmbedAdBlocker;
    } });
    var rendererProtection_1 = (init_rendererProtection(), __toCommonJS(rendererProtection_exports));
    Object.defineProperty(exports2, "decryptRendererAsset", { enumerable: true, get: function() {
      return rendererProtection_1.decryptRendererAsset;
    } });
    Object.defineProperty(exports2, "isRendererAssetProtected", { enumerable: true, get: function() {
      return rendererProtection_1.isProtected;
    } });
    Object.defineProperty(exports2, "rendererAssetContentType", { enumerable: true, get: function() {
      return rendererProtection_1.contentTypeFor;
    } });
  }
});

// src/mainProcessCrashGuard.ts
var import_electron = require("electron");
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_node_os = __toESM(require("node:os"));
var alreadyHandledFatal = false;
var installed = false;
var crashLogPath = () => {
  try {
    return import_node_path.default.join(import_electron.app.getPath("userData"), "e-ge-vinyl-main-crash.log");
  } catch {
    return import_node_path.default.join(import_node_os.default.tmpdir(), "e-ge-vinyl-main-crash.log");
  }
};
var persistCrash = (label, error) => {
  const detail = error instanceof Error ? `${error.name}: ${error.message}
${error.stack ?? ""}` : String(error);
  const entry = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${label}
${detail}

`;
  try {
    import_node_fs.default.appendFileSync(crashLogPath(), entry);
  } catch (writeErr) {
    console.error("[crash-guard] failed to persist crash log", writeErr);
    console.error("[crash-guard] original crash was", entry);
  }
};
var showFatalDialog = (error) => {
  const reason = error instanceof Error ? error.message : String(error);
  const message = `E-GE Vinyl could not start because a required component failed to load.

This usually means the last update did not install completely. Please reinstall E-GE Vinyl from ege-vinyl.vercel.app \u2014 your library and settings are kept.

Technical detail: ${reason}

A diagnostic log was saved to:
` + crashLogPath();
  try {
    import_electron.dialog.showErrorBox("E-GE Vinyl failed to start", message);
  } catch (dialogErr) {
    console.error("[crash-guard] could not show fatal dialog", dialogErr);
  }
};
var installMainProcessCrashGuard = () => {
  if (installed) return;
  installed = true;
  process.on("uncaughtException", (error) => {
    persistCrash("uncaughtException", error);
    if (alreadyHandledFatal) return;
    alreadyHandledFatal = true;
    showFatalDialog(error);
    import_electron.app.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    persistCrash("unhandledRejection", reason);
  });
};
installMainProcessCrashGuard();

// electron-main.ts
var import_electron_main5 = __toESM(require_electron_main());

// src/electron.ts
var import_electron20 = require("electron");
var import_electron_window_state = __toESM(require("electron-window-state"));
var import_electron_is_dev = __toESM(require("electron-is-dev"));
var import_path7 = __toESM(require("path"));
var import_fs7 = __toESM(require("fs"));

// src/backgroundMode.ts
var import_electron18 = require("electron");
var import_node_path2 = __toESM(require("node:path"));
var backgroundModeEnabled = false;
var tray3 = null;
var isBackgroundModeEnabled = () => backgroundModeEnabled;
var iconDir = () => import_electron18.app.isPackaged ? import_node_path2.default.join(process.resourcesPath, "icons") : import_node_path2.default.join(__dirname, "..", "src", "assets", "icons");
var showMainWindow = () => {
  const win2 = getMainWindow2();
  if (!win2 || win2.isDestroyed()) return;
  if (win2.isMinimized()) win2.restore();
  win2.show();
  win2.focus();
};
var createTray2 = () => {
  if (tray3) return;
  const icon = import_electron18.nativeImage.createFromPath(import_node_path2.default.join(iconDir(), "logo.png"));
  if (process.platform === "darwin") icon.setTemplateImage(true);
  tray3 = new import_electron18.Tray(icon);
  tray3.setToolTip("E-GE Vinyl");
  tray3.setContextMenu(
    import_electron18.Menu.buildFromTemplate([
      { label: "Open E-GE Vinyl", click: () => showMainWindow() },
      { type: "separator" },
      { label: "Quit", click: () => import_electron18.app.quit() }
    ])
  );
  tray3.on("click", () => showMainWindow());
};
var destroyTray2 = () => {
  if (tray3) {
    tray3.destroy();
    tray3 = null;
  }
};
var applyBackgroundMode = (enabled) => {
  backgroundModeEnabled = enabled;
  try {
    import_electron18.app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
  } catch {
  }
  if (enabled) createTray2();
  else destroyTray2();
};
var initBackgroundMode = () => {
  import_electron18.ipcMain.handle("fcm:set-background-mode", (_event, enabled) => {
    applyBackgroundMode(!!enabled);
  });
};

// src/events.ts
var mm2 = __toESM(require("music-metadata"));
var import_electron_updater = require("electron-updater");
var import_node_machine_id = require("node-machine-id");
var import_electron_main = __toESM(require_electron_main());
function bindEvents() {
  (0, import_electron_main.bindDesktopAppEvents)({
    authWindow: {
      title: "Sign in to E-GE Vinyl",
      backgroundColor: "#121116",
      partition: "persist:ege-vinyl-auth"
    },
    autoUpdater: import_electron_updater.autoUpdater,
    getMachineId: import_node_machine_id.machineId,
    musicMetadata: mm2
  });
}
function bindWindowEvents(win2) {
  (0, import_electron_main.bindDesktopWindowEvents)(win2, { autoUpdater: import_electron_updater.autoUpdater });
}

// src/electron.ts
var import_electron_main2 = __toESM(require_electron_main());
var import_electron_main3 = __toESM(require_electron_main());
var import_electron_main4 = __toESM(require_electron_main());
var import_electron_unhandled = null;
var import_electron_context_menu = __toESM(require("electron-context-menu"));
globalThis.__DEV__ = import_electron_is_dev.default;
(() => {
  const userData = import_electron20.app.getPath("userData");
  const oldDir = import_path7.default.join(userData, "databases");
  const newDir = import_path7.default.join(userData, "sql-data");
  if (!import_fs7.default.existsSync(oldDir)) return;
  try {
    const files = import_fs7.default.readdirSync(oldDir).filter((f) => f.endsWith(".db"));
    if (files.length === 0) return;
    import_fs7.default.mkdirSync(newDir, { recursive: true });
    for (const file of files) {
      const src = import_path7.default.join(oldDir, file);
      const dest = import_path7.default.join(newDir, file);
      const srcSize = import_fs7.default.statSync(src).size;
      const destSize = import_fs7.default.existsSync(dest) ? import_fs7.default.statSync(dest).size : 0;
      if (srcSize > destSize) {
        import_fs7.default.copyFileSync(src, dest);
      }
      import_fs7.default.unlinkSync(src);
    }
  } catch {
  }
})();
(0, import_electron_main3.enableMediaKeyFeatures)();
var win;
var isQuitting = false;
var pendingDeepLink = null;
var platform = "linux";
if (process?.platform === "win32") platform = "windows";
else if (process?.platform === "darwin") platform = "macOS";
if (process.platform === "win32") {
  try {
    import_electron20.app.setAppUserModelId("com.ege.vinyl");
  } catch {
  }
}
if (process.platform === "linux") {
  import_electron20.app.commandLine.appendSwitch("class", "ege-vinyl-desktop");
}
if (process.env.EGE_VINYL_DISABLE_HW_ACCEL === "1") {
  import_electron20.app.disableHardwareAcceleration();
}
import_electron20.app.commandLine.appendSwitch("disable-renderer-backgrounding");
import_electron20.app.commandLine.appendSwitch("disable-background-timer-throttling");
import_electron20.app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
import_electron20.app.commandLine.appendSwitch("disable-background-media-suspend");
import_electron20.app.commandLine.appendSwitch("disable-features", "MediaSuspend,BackgroundVideoTrackOptimization,BackgroundVideoPauseOptimization,MacWebContentsOcclusion");
import_electron20.app.commandLine.appendSwitch("enable-features", "ResumeBackgroundVideo");
if (process.platform === "win32") {
  import_electron20.app.commandLine.appendSwitch("disable-gpu-driver-bug-workarounds");
}
if (!import_electron_is_dev.default) {
  import_electron20.protocol.registerSchemesAsPrivileged([{
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }]);
}
if (!import_electron_is_dev.default) {
  (async () => {
    try {
      const unhandled = (await import("electron-unhandled")).default;
      unhandled({ logger: () => {
      }, showDialog: false });
    } catch (e) {
      console.error(e);
    }
  })();
}
var PROTOCOL = "egevinyl";
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    import_electron20.app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [import_path7.default.resolve(process.argv[1])]);
  }
} else {
  import_electron20.app.setAsDefaultProtocolClient(PROTOCOL);
}
var gotTheLock = import_electron20.app.requestSingleInstanceLock();
bindEvents();
(0, import_electron_context_menu.default)({
  showCopyImage: false,
  showSaveImage: false,
  showInspectElement: import_electron_is_dev.default,
  showServices: true
});
import_electron20.app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
function resolvePreloadPath() {
  const candidates = [
    import_path7.default.join(__dirname, "src", "preload.js"),
    // bundled main → electron-build/
    import_path7.default.join(__dirname, "preload.js"),
    // unbundled electron.js → electron-build/src/
    import_path7.default.join(import_electron20.app.getAppPath(), "electron-build", "src", "preload.js")
    // packaged asar fallback
  ];
  const found = candidates.find((p) => import_fs7.default.existsSync(p));
  if (!found) {
    console.error("[electron] preload.js not found in any candidate:", candidates);
    return candidates[candidates.length - 1];
  }
  return found;
}
function createWindow() {
  const mainWindowState = (0, import_electron_window_state.default)({
    defaultWidth: 1200,
    defaultHeight: 800
  });
  win = new import_electron20.BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    // The renderer always uses the desktop layout in Electron (header bar +
    // library/player sidebars). Those sidebars are fixed-width, so below ~900px
    // the centre content gets crushed. Keep the window wide enough that the
    // three-pane layout stays usable (the renderer also clamps panel widths as
    // a safety net). minHeight stays 600 for vertical-monitor / half-snap use.
    minWidth: 900,
    height: mainWindowState.height,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: "#121116",
    darkTheme: true,
    frame: platform === "linux",
    titleBarStyle: platform === "linux" ? "default" : platform === "windows" ? "hidden" : "hiddenInset",
    ...platform === "windows" ? {
      titleBarOverlay: {
        color: "#121116",
        symbolColor: "#ffffff",
        height: 36
      }
    } : {},
    trafficLightPosition: { x: 16, y: 16 },
    title: "E-GE Vinyl",
    webPreferences: {
      webSecurity: false,
      devTools: true,
      // See resolvePreloadPath(): app.getAppPath() is NOT stable across launch
      // modes, so we probe the real candidates and use the first that exists.
      preload: resolvePreloadPath(),
      spellcheck: true,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      // This is a music player: a minimised window must keep running its
      // timers (progress, the embed engine's watchdogs), not be throttled to
      // once a minute like a background tab.
      backgroundThrottling: false
    }
  });
  bindWindowEvents(win);
  win.webContents.on("did-attach-webview", (_event, guest) => {
    try {
      guest.setBackgroundThrottling(false);
    } catch {
    }
  });
  try {
    (0, import_electron_main2.installEmbedAdBlocker)();
  } catch {
  }
  const sendWindowHidden = (hidden) => {
    try {
      win?.webContents.send("windowHiddenChanged", hidden);
    } catch {
    }
  };
  win.on("minimize", () => sendWindowHidden(true));
  win.on("restore", () => sendWindowHidden(false));
  win.on("hide", () => sendWindowHidden(true));
  win.on("show", () => sendWindowHidden(false));
  bindYoutubeLoginIpc();
  win.on("closed", destroyYtLoginView);
  if (process.platform === "win32") {
    const forceRepaint = () => {
      if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.invalidate();
      }
    };
    win.on("focus", forceRepaint);
    win.on("restore", forceRepaint);
    win.on("show", forceRepaint);
    win.webContents.on("did-finish-load", forceRepaint);
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void import_electron20.shell.openExternal(url);
    return { action: "deny" };
  });
  const startUrl = import_electron_is_dev.default ? "http://localhost:3000" : "app://localhost/index.html";
  if (import_electron_is_dev.default) {
    win.webContents.openDevTools();
    const ses = win.webContents.session;
    Promise.all([
      ses.clearCache(),
      ses.clearStorageData({ storages: ["serviceworkers", "cachestorage"] })
    ]).catch(() => {
    }).finally(() => {
      win?.loadURL(startUrl);
    });
  } else {
    win.loadURL(startUrl);
  }
  win.webContents.on("did-finish-load", () => {
    if (pendingDeepLink && win) {
      win.webContents.send("onDeepLinkReceived", pendingDeepLink);
      pendingDeepLink = null;
    }
  });
  mainWindowState.manage(win);
  win.on("close", (event) => {
    if ((process.platform === "darwin" || isBackgroundModeEnabled()) && !isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  win.on("closed", () => {
    win = void 0;
  });
}
if (!gotTheLock) {
  import_electron20.app.quit();
} else {
  if (process.platform !== "darwin") {
    const initialUrl = process.argv.find((arg) => arg?.startsWith(`${PROTOCOL}://`));
    if (initialUrl) pendingDeepLink = initialUrl;
  }
  import_electron20.app.on("second-instance", (_event, argv) => {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
    const url = argv?.find((param) => param?.startsWith(`${PROTOCOL}://`));
    if (url) {
      if (win && !win.isDestroyed()) {
        win.webContents.send("onDeepLinkReceived", url);
      } else {
        pendingDeepLink = url;
      }
    }
  });
  import_electron20.app.on("open-url", (event, url) => {
    event.preventDefault();
    if (url && win && !win.isDestroyed()) {
      win.webContents.send("onDeepLinkReceived", url);
    } else if (url) {
      pendingDeepLink = url;
    }
  });
  import_electron20.app.whenReady().then(() => {
    if (!import_electron_is_dev.default) {
      const buildPath = import_path7.default.join(import_electron20.app.getAppPath(), "build");
      import_electron20.protocol.handle("app", async (request) => {
        const url = new URL(request.url);
        const filePath = import_path7.default.normalize(import_path7.default.join(buildPath, decodeURIComponent(url.pathname)));
        try {
          const raw = await import_fs7.default.promises.readFile(filePath);
          const plain = (0, import_electron_main4.decryptRendererAsset)(raw, buildPath);
          if (plain) {
            return new Response(new Uint8Array(plain), {
              headers: { "content-type": (0, import_electron_main4.rendererAssetContentType)(url.pathname) }
            });
          }
        } catch (e) {
          if (e?.message?.includes("carries no key")) throw e;
        }
        return import_electron20.net.fetch(`file://${filePath}`);
      });
    }
    createWindow();
    (0, import_electron_main3.bindMediaKeyShortcuts)(() => win ?? null);
    import_electron20.app.on("activate", () => {
      if (win) {
        win.show();
        win.focus();
      } else if (import_electron20.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
  import_electron20.app.on("before-quit", () => {
    isQuitting = true;
  });
  import_electron20.app.on("will-quit", () => {
    (0, import_electron_main3.disposeDiscordRpcAdapter)();
  });
  import_electron20.app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && !isBackgroundModeEnabled()) {
      import_electron20.app.quit();
    }
  });
  import_electron20.app.on("ready", () => {
    const parseCookies2 = (cookieString = "") => {
      return cookieString.split(";").reduce((acc, pair) => {
        const [key, ...val] = pair.trim().split("=");
        if (key) acc[key] = val.join("=");
        return acc;
      }, {});
    };
    const serializeCookies2 = (cookieObj) => {
      return Object.entries(cookieObj).map(([k, v]) => `${k}=${v}`).join("; ");
    };
    import_electron20.session.defaultSession.webRequest.onBeforeSendHeaders(async (details, callback) => {
      if (!details.requestHeaders) {
        details.requestHeaders = {};
      }
      const skipSessionCookies = details.requestHeaders["X-Skip-Session-Cookies"] || details.requestHeaders["x-skip-session-cookies"];
      if (skipSessionCookies) {
        delete details.requestHeaders["X-Skip-Session-Cookies"];
        delete details.requestHeaders["x-skip-session-cookies"];
        const ownCookies = {
          ...parseCookies2(details.requestHeaders.Cookie || details.requestHeaders.cookie),
          ...parseCookies2(details.requestHeaders["X-Cookie"] || details.requestHeaders["x-cookie"])
        };
        delete details.requestHeaders.cookie;
        delete details.requestHeaders["X-Cookie"];
        delete details.requestHeaders["x-cookie"];
        if (Object.keys(ownCookies).length > 0) {
          details.requestHeaders.Cookie = serializeCookies2(ownCookies);
        } else {
          delete details.requestHeaders.Cookie;
        }
      } else {
        const sessionCookie = await import_electron20.session.defaultSession.cookies.get({ url: details.url });
        const requestCookie = details.requestHeaders.Cookie || details.requestHeaders.cookie;
        const requestRestrictedCookie = details.requestHeaders["X-Cookie"] || details.requestHeaders["x-cookie"];
        if (sessionCookie.length > 0 || !!requestCookie || !!requestRestrictedCookie) {
          const sessionCookieParsed = sessionCookie.reduce((acc, cookie) => {
            acc[cookie.name] = cookie.value;
            return acc;
          }, {});
          const requestCookieParsed = parseCookies2(requestCookie);
          const requestRestrictedCookieParsed = parseCookies2(requestRestrictedCookie);
          details.requestHeaders.Cookie = serializeCookies2({
            ...sessionCookieParsed,
            ...requestCookieParsed,
            ...requestRestrictedCookieParsed
          });
          delete details.requestHeaders["X-Cookie"];
          delete details.requestHeaders["x-cookie"];
        }
      }
      if (details.url.match(/music\.163\.com/)) {
        details.requestHeaders["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36";
        details.requestHeaders.Cookie = "NMTID=";
      } else if (details.url.match(/c\.y\.qq\.com/)) {
        details.requestHeaders.Referrer = "https://y.qq.com";
        details.requestHeaders["Accept-Language"] = "en-US,en;q=0.9,hr;q=0.8,en-GB;q=0.7";
        details.requestHeaders["Content-Type"] = "text/html; charset=utf-8";
        details.requestHeaders.Accept = "application/json";
        details.requestHeaders["Cache-Control"] = "no-cache";
        details.requestHeaders.Origin = "https://y.qq.com";
        details.requestHeaders.Referer = "https://y.qq.com";
        details.requestHeaders["Accept-Encoding"] = "gzip, deflate, br";
        details.referrer = "https://y.qq.com/";
      }
      const restrictedHeaders = ["Origin", "Referer", "User-Agent", "Sec-Fetch-Mode"];
      restrictedHeaders.forEach((restrictedHeader) => {
        const keys = [
          `X-${restrictedHeader}`,
          `x-${restrictedHeader.toLocaleLowerCase()}`,
          restrictedHeader
        ];
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const valueTmp = details.requestHeaders[key];
          if (key !== restrictedHeader) {
            delete details.requestHeaders[key];
          }
          if (valueTmp) {
            details.requestHeaders[restrictedHeader] = valueTmp;
            break;
          }
        }
      });
      callback({
        cancel: false,
        requestHeaders: details.requestHeaders
      });
    });
  });
}
var getMainWindow2 = () => win ?? null;
var YT_CHROME_VERSION = "146";
var YT_CHROME_FULL_VERSION = "146.0.7680.179";
var YT_LOGIN_UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${YT_CHROME_VERSION}.0.0.0 Safari/537.36`;
var YT_UA_METADATA = {
  brands: [
    { brand: "Chromium", version: YT_CHROME_VERSION },
    { brand: "Google Chrome", version: YT_CHROME_VERSION },
    { brand: "Not.A/Brand", version: "24" }
  ],
  fullVersionList: [
    { brand: "Chromium", version: YT_CHROME_FULL_VERSION },
    { brand: "Google Chrome", version: YT_CHROME_FULL_VERSION },
    { brand: "Not.A/Brand", version: "24.0.0.0" }
  ],
  fullVersion: YT_CHROME_FULL_VERSION,
  platform: process.platform === "win32" ? "Windows" : process.platform === "darwin" ? "macOS" : "Linux",
  platformVersion: "14.5.0",
  architecture: process.arch === "arm64" ? "arm64" : "x86",
  model: "",
  mobile: false
};
var YT_LOGIN_URL = "https://accounts.google.com/ServiceLogin?service=youtube";
var YT_SCRAPE_SCRIPT = `(function () {
  try {
    var html = document.documentElement.innerHTML
    function pick (re) { var m = html.match(re); return m ? m[2] : undefined }
    return JSON.stringify({
      idToken: pick(/(["'])ID_TOKEN\\1[:,]\\s?"([^"]+)"/),
      visitorData: pick(/(["'])VISITOR_DATA\\1[:,]\\s?"([^"]+)"/),
      loginInfo: pick(/(["'])LOGIN_INFO\\1[:,]\\s?"([^"]+)"/),
      dataSyncId: (function () { var m = html.match(/(["'])DATASYNC_ID\\1[:,]\\s?"([^|"]+)(?:\\|[^"]*)?"/); return m ? m[2] : undefined })(),
      url: location.href
    })
  } catch (e) { return JSON.stringify({ err: String(e) }) }
})()`;
var chList = (full) => YT_UA_METADATA[full ? "fullVersionList" : "brands"].map((b) => `"${b.brand}";v="${b.version}"`).join(", ");
var YT_CLIENT_HINTS = {
  "Sec-CH-UA": chList(false),
  "Sec-CH-UA-Full-Version-List": chList(true),
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": `"${YT_UA_METADATA.platform}"`,
  "Sec-CH-UA-Platform-Version": `"${YT_UA_METADATA.platformVersion}"`,
  "Sec-CH-UA-Arch": `"${YT_UA_METADATA.architecture}"`,
  "Sec-CH-UA-Full-Version": `"${YT_CHROME_FULL_VERSION}"`,
  "Sec-CH-UA-Bitness": '"64"',
  "Sec-CH-UA-Model": '""'
};
var YT_LOGIN_PARTITION = "persist:yt-login";
var YT_COOKIE_URLS = ["https://www.youtube.com", "https://youtube.com", "https://m.youtube.com", "https://accounts.google.com", "https://www.google.com", "https://google.com"];
var ytLoginView = null;
var ytLoginPoll = null;
var ytLoginIpcBound = false;
var ytLoginSessionReady = false;
var roundBounds = (b) => ({
  x: Math.round(b?.x ?? 0),
  y: Math.round(b?.y ?? 0),
  width: Math.max(1, Math.round(b?.width ?? 1)),
  height: Math.max(1, Math.round(b?.height ?? 1))
});
var getYtLoginSession = () => {
  const sess = import_electron20.session.fromPartition(YT_LOGIN_PARTITION);
  if (!ytLoginSessionReady) {
    ytLoginSessionReady = true;
    sess.setUserAgent(YT_LOGIN_UA);
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders["User-Agent"] = YT_LOGIN_UA;
      for (const [k, v] of Object.entries(YT_CLIENT_HINTS)) details.requestHeaders[k] = v;
      callback({ requestHeaders: details.requestHeaders });
    });
  }
  return sess;
};
var copyYtCookiesToDefault = async () => {
  const from = getYtLoginSession();
  for (const url of YT_COOKIE_URLS) {
    const cookies = await from.cookies.get({ url }).catch(() => []);
    for (const c of cookies) {
      const host = (c.domain || "").replace(/^\./, "");
      try {
        await import_electron20.session.defaultSession.cookies.set({
          url: `${c.secure === false ? "http" : "https"}://${host}${c.path || "/"}`,
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          expirationDate: c.expirationDate,
          sameSite: c.sameSite
        });
      } catch {
      }
    }
  }
};
var destroyYtLoginView = () => {
  if (ytLoginPoll) {
    clearInterval(ytLoginPoll);
    ytLoginPoll = null;
  }
  const mainWin = getMainWindow2();
  if (ytLoginView) {
    try {
      mainWin?.contentView.removeChildView(ytLoginView);
    } catch {
    }
    try {
      ytLoginView.webContents.destroy?.();
    } catch {
    }
    ytLoginView = null;
  }
};
var bindYoutubeLoginIpc = () => {
  if (ytLoginIpcBound) return;
  ytLoginIpcBound = true;
  import_electron20.ipcMain.handle("ytLogin:open", (_e, bounds) => {
    const mainWin = getMainWindow2();
    if (!mainWin) return false;
    destroyYtLoginView();
    const ytSession = getYtLoginSession();
    const view = new import_electron20.WebContentsView({
      webPreferences: {
        session: ytSession,
        // contextIsolation:false so ytLoginPreload runs in the page's MAIN world
        // and can override navigator.userAgentData before Google's scripts read it.
        contextIsolation: false,
        nodeIntegration: false,
        sandbox: false,
        preload: import_path7.default.join(__dirname, "ytLoginPreload.js")
      }
    });
    ytLoginView = view;
    view.setBackgroundColor("#ffffff");
    view.webContents.setUserAgent(YT_LOGIN_UA);
    mainWin.contentView.addChildView(view);
    view.setBounds(roundBounds(bounds));
    let lastSent = "";
    const scrapeAndReport = () => {
      const w = getMainWindow2();
      if (!w || !ytLoginView || ytLoginView.webContents.isDestroyed()) return;
      ytLoginView.webContents.executeJavaScript(YT_SCRAPE_SCRIPT, true).then(async (json) => {
        let data;
        try {
          data = JSON.parse(json);
        } catch {
          return;
        }
        if (!data) return;
        w.webContents.send("ytLogin:navigate", { url: data.url });
        if (!data.dataSyncId) return;
        const cookies = await ytSession.cookies.get({ url: "https://www.youtube.com" }).catch(() => []);
        const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
        if (!cookieString.includes("SAPISID=")) return;
        const payload = {
          idToken: data.idToken,
          visitorData: data.visitorData,
          loginInfo: data.loginInfo,
          dataSyncId: data.dataSyncId,
          cookies: cookieString
        };
        const sig = JSON.stringify(payload);
        if (sig === lastSent) return;
        lastSent = sig;
        await copyYtCookiesToDefault();
        w.webContents.send("ytLogin:result", payload);
      }).catch(() => {
      });
    };
    view.webContents.on("dom-ready", scrapeAndReport);
    view.webContents.on("did-navigate", scrapeAndReport);
    ytLoginPoll = setInterval(scrapeAndReport, 1e3);
    view.webContents.loadURL(YT_LOGIN_URL);
    return true;
  });
  import_electron20.ipcMain.handle("ytLogin:setBounds", (_e, bounds) => {
    if (ytLoginView) {
      try {
        ytLoginView.setBounds(roundBounds(bounds));
      } catch {
      }
    }
    return true;
  });
  import_electron20.ipcMain.handle("ytLogin:close", () => {
    destroyYtLoginView();
    return true;
  });
  import_electron20.ipcMain.handle("ytLogin:clearCookies", async () => {
    const sessions = [getYtLoginSession(), import_electron20.session.defaultSession];
    for (const sess of sessions) {
      for (const url of YT_COOKIE_URLS) {
        const cs = await sess.cookies.get({ url }).catch(() => []);
        for (const c of cs) {
          const host = (c.domain || "").replace(/^\./, "");
          const removalUrl = `${c.secure === false ? "http" : "https"}://${host}${c.path || "/"}`;
          await sess.cookies.remove(removalUrl, c.name).catch(() => {
          });
        }
      }
    }
    return true;
  });
};

// src/fcmPush.ts
var import_core = require("@aracna/core");
var import_fcm = require("@aracna/fcm");
var import_electron21 = require("electron");
var import_node_v8 = require("node:v8");
var import_promises = require("node:fs/promises");
var import_node_path3 = __toESM(require("node:path"));
var APP_ID = "com.ege.vinyl.desktop";
var STORAGE_KEY = "fcm";
var storageFile = () => import_node_path3.default.join(import_electron21.app.getPath("userData"), "fcm-credentials.v8");
var readStore = async () => {
  try {
    return (0, import_node_v8.deserialize)(await (0, import_promises.readFile)(storageFile()));
  } catch {
    return {};
  }
};
var writeStore = async (store) => {
  await (0, import_promises.writeFile)(storageFile(), (0, import_node_v8.serialize)(store));
};
var diskStorage = new import_core.AsyncStorage(
  "EgeVinylFcmStorage",
  async () => writeStore({}),
  async (key) => {
    const store = await readStore();
    return key in store ? store[key] : new Error("not_found");
  },
  async (key) => key in await readStore(),
  async (key) => {
    const store = await readStore();
    delete store[key];
    await writeStore(store);
  },
  async (key, item) => {
    const store = await readStore();
    store[key] = item;
    await writeStore(store);
  }
);
var client2 = new import_fcm.FcmClient({ storage: { instance: diskStorage } });
var listenersBound = false;
var shouldStayConnected = false;
var reconnectAttempts = 0;
var reconnectTimer = null;
var RECONNECT_BASE_MS = 5e3;
var RECONNECT_CAP_MS = 12e4;
var connectClient = async () => {
  if (!await loadCredentialsIntoClient()) throw new Error("fcm_not_registered");
  const connected = await client2.connect();
  if (connected instanceof Error) throw connected;
  reconnectAttempts = 0;
};
var scheduleReconnect = () => {
  if (!shouldStayConnected || reconnectTimer) return;
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_CAP_MS);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!shouldStayConnected) return;
    void connectClient().catch(() => scheduleReconnect());
  }, delay);
};
var showNativeNotification = (data) => {
  if (!import_electron21.Notification.isSupported()) return;
  const title = data.notification?.title ?? data.data?.title ?? "";
  const body = data.notification?.body ?? data.data?.body ?? "";
  if (!title && !body) return;
  const notification = new import_electron21.Notification({ title: title || body, body: title ? body : void 0 });
  notification.on("click", () => {
    const win2 = getMainWindow2();
    if (win2 && !win2.isDestroyed()) {
      if (win2.isMinimized()) win2.restore();
      if (!win2.isVisible()) win2.show();
      win2.focus();
    }
    const deeplink = data.data?.deeplink;
    if (deeplink && win2 && !win2.isDestroyed()) {
      win2.webContents.send("onDeepLinkReceived", deeplink);
    }
  });
  notification.show();
};
var bindClientListeners = () => {
  if (listenersBound) return;
  listenersBound = true;
  client2.on("message-data", (data) => {
    try {
      showNativeNotification(data);
    } catch {
    }
    const win2 = getMainWindow2();
    win2?.webContents.send("fcm:message-data", data);
  });
  client2.on("close", () => {
    scheduleReconnect();
  });
  import_electron21.powerMonitor.on("resume", () => {
    if (!shouldStayConnected) return;
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    void connectClient().catch(() => scheduleReconnect());
  });
};
var loadCredentialsIntoClient = async () => {
  const item = (await readStore())[STORAGE_KEY];
  if (!item) return false;
  client2.setAcgID(item.acg.id).setAcgSecurityToken(item.acg.securityToken).setAuthSecret(item.ece.authSecret).setEcdhPrivateKey(item.ece.privateKey);
  return true;
};
var initDesktopFcm = () => {
  bindClientListeners();
  import_electron21.ipcMain.handle("fcm:is-registered", () => diskStorage.has(STORAGE_KEY));
  import_electron21.ipcMain.handle("fcm:get-token", async () => {
    const item = (await readStore())[STORAGE_KEY];
    return item?.token;
  });
  import_electron21.ipcMain.handle("fcm:register", async (_event, config) => {
    if (await diskStorage.has(STORAGE_KEY)) return;
    if (!config?.apiKey || !config?.appID || !config?.projectID || !config?.vapidKey) {
      throw new Error("fcm_register_missing_config");
    }
    const authSecret = (0, import_fcm.generateFcmAuthSecret)();
    const ecdh = (0, import_fcm.createFcmECDH)();
    const registration = await (0, import_fcm.registerToFCM)({
      appID: APP_ID,
      ece: { authSecret, publicKey: ecdh.getPublicKey() },
      firebase: { apiKey: config.apiKey, appID: config.appID, projectID: config.projectID },
      vapidKey: config.vapidKey
    });
    if (registration instanceof Error) throw registration;
    const reg = registration;
    const store = await readStore();
    store[STORAGE_KEY] = {
      acg: { id: reg.acg.id, securityToken: reg.acg.securityToken },
      ece: { authSecret, privateKey: ecdh.getPrivateKey(), publicKey: ecdh.getPublicKey() },
      token: reg.token
    };
    await writeStore(store);
  });
  import_electron21.ipcMain.handle("fcm:connect", async () => {
    shouldStayConnected = true;
    await connectClient();
  });
  import_electron21.ipcMain.handle("fcm:disconnect", async () => {
    shouldStayConnected = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;
    await client2.disconnect();
  });
  import_electron21.ipcMain.handle("fcm:show-confirmation", (_event, n) => {
    if (!import_electron21.Notification.isSupported()) return;
    const title = n?.title || "";
    const body = n?.body || "";
    if (!title && !body) return;
    new import_electron21.Notification({ title: title || body, body: title ? body : void 0 }).show();
  });
};

// electron-main.ts
installMainProcessCrashGuard();
var DISCORD_CLIENT_ID = "1469310964800159836";
var DISCORD_PRODUCT_NAME = "E-GE Vinyl";
var discordRpc = require("discord-rpc");
var initCoreAdapters = async () => {
  await (0, import_electron_main5.prepareAppForPlatform)({
    keyValueStorage: { legacyFilenamePrefix: "ege-vinyl" },
    nosqlStorage: true,
    sqlStorage: true,
    crypto: true,
    fileSystem: true,
    images: true,
    filePicker: true,
    // Inject the discord-rpc module + brand client ID / product name so the
    // adapter can actually log in. Passing `discordRpc: true` was a silent
    // no-op: core's main-process adapter bails out of connect()/setPresence()
    // when ctx.discordRpc or ctx.clientId is undefined, so Rich Presence
    // never started on ANY desktop platform (macOS / Windows / Linux).
    discordRpc: {
      discordRpc,
      clientId: DISCORD_CLIENT_ID,
      productName: DISCORD_PRODUCT_NAME
    }
  });
};
initCoreAdapters().catch((err) => {
  console.error("[electron-main] core adapter init failed", err);
});
initDesktopFcm();
initBackgroundMode();
/*! Bundled license information:

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

@firebase/util/dist/node-esm/index.node.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/component/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/logger/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/remote-config/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
