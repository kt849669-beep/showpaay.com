const DATABASE_KEY = "showpay_local_database_v1";
const FILES_KEY = "showpay_local_files_v1";

const now = () => new Date().toISOString();
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const initialDatabase = () => ({
  users: [],
  trash: [],
  banners: [],
  slider_images: [],
  notifications: [],
  activity_logs: [],
  admin_sessions: [],
  admin_settings: [
    {
      id: "local-admin",
      admin_name: "ShowPay Admin",
      admin_email: "admin@showpay.com",
      admin_password: "admin@0123",
      created_at: now(),
      updated_at: now(),
    },
  ],
  popup_video: [
    {
      id: "local-video-settings",
      title: "ShowPay Video",
      video_url: "",
      is_enabled: false,
      created_at: now(),
    },
  ],
  telegram_popup: [
    {
      id: "local-telegram-settings",
      telegram_link: "#",
      is_enabled: false,
      created_at: now(),
    },
  ],
});

function loadDatabase() {
  try {
    const saved = JSON.parse(localStorage.getItem(DATABASE_KEY) || "null");
    const database = { ...initialDatabase(), ...(saved || {}) };

    database.users = (database.users || []).map((user) => {
      const { password, mpin, ...safeUser } = user;
      return safeUser;
    });

    database.trash = (database.trash || []).map((item) => {
      if (!item.record_data) return item;
      const { password, mpin, ...safeRecord } = item.record_data;
      return { ...item, record_data: safeRecord };
    });

    localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
    return database;
  } catch {
    return initialDatabase();
  }
}

function saveDatabase(database) {
  localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
  window.dispatchEvent(new CustomEvent("showpay-local-db-change"));
}

function readFiles() {
  try {
    return JSON.parse(localStorage.getItem(FILES_KEY) || "{}");
  } catch {
    return {};
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

class LocalQuery {
  constructor(table) {
    this.table = table;
    this.operation = "select";
    this.payload = null;
    this.filters = [];
    this.sort = null;
    this.maxRows = null;
    this.options = {};
    this.returnRows = false;
  }

  select(_columns = "*", options = {}) {
    if (this.operation !== "select") this.returnRows = true;
    this.options = options || {};
    return this;
  }

  insert(value) {
    this.operation = "insert";
    this.payload = Array.isArray(value) ? value : [value];
    return this;
  }

  update(value) {
    this.operation = "update";
    this.payload = value;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column, value) {
    this.filters.push((row) => String(row[column]) === String(value));
    return this;
  }

  neq(column, value) {
    this.filters.push((row) => String(row[column]) !== String(value));
    return this;
  }

  gt(column, value) {
    this.filters.push((row) => row[column] > value);
    return this;
  }

  gte(column, value) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  lt(column, value) {
    this.filters.push((row) => row[column] < value);
    return this;
  }

  lte(column, value) {
    this.filters.push((row) => row[column] <= value);
    return this;
  }

  in(column, values) {
    const accepted = new Set((values || []).map(String));
    this.filters.push((row) => accepted.has(String(row[column])));
    return this;
  }

  order(column, options = {}) {
    this.sort = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(value) {
    this.maxRows = Number(value);
    return this;
  }

  matches(row) {
    return this.filters.every((filter) => filter(row));
  }

  async execute() {
    try {
      const database = loadDatabase();
      const tableRows = Array.isArray(database[this.table])
        ? database[this.table]
        : [];

      if (this.operation === "insert") {
        const inserted = this.payload.map((item) => {
          const createdAt = item.created_at || now();
          return {
            id: item.id || makeId(),
            created_at: createdAt,
            ...(this.table === "admin_sessions" ? { last_active: createdAt } : {}),
            ...(this.table === "trash" ? { deleted_at: createdAt } : {}),
            ...item,
          };
        });
        database[this.table] = [...tableRows, ...inserted];
        saveDatabase(database);
        return { data: this.returnRows ? inserted : inserted, error: null, count: inserted.length };
      }

      if (this.operation === "update") {
        const changed = [];
        database[this.table] = tableRows.map((row) => {
          if (!this.matches(row)) return row;
          const updated = { ...row, ...this.payload, updated_at: now() };
          changed.push(updated);
          return updated;
        });
        saveDatabase(database);
        return { data: this.returnRows ? changed : changed, error: null, count: changed.length };
      }

      if (this.operation === "delete") {
        const removed = tableRows.filter((row) => this.matches(row));
        database[this.table] = tableRows.filter((row) => !this.matches(row));
        saveDatabase(database);
        return { data: removed, error: null, count: removed.length };
      }

      let rows = tableRows.filter((row) => this.matches(row)).map((row) => ({ ...row }));
      if (this.sort) {
        const direction = this.sort.ascending ? 1 : -1;
        rows.sort((a, b) => {
          if (a[this.sort.column] === b[this.sort.column]) return 0;
          return a[this.sort.column] > b[this.sort.column] ? direction : -direction;
        });
      }
      if (Number.isFinite(this.maxRows)) rows = rows.slice(0, this.maxRows);
      const count = rows.length;
      return {
        data: this.options.head ? null : rows,
        error: null,
        count: this.options.count === "exact" ? count : null,
      };
    } catch (error) {
      return { data: null, error, count: null };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function storageBucket(bucket) {
  return {
    async upload(fileName, file) {
      try {
        const files = readFiles();
        files[`${bucket}/${fileName}`] = await fileToDataUrl(file);
        localStorage.setItem(FILES_KEY, JSON.stringify(files));
        return { data: { path: fileName }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    getPublicUrl(fileName) {
      const files = readFiles();
      return {
        data: { publicUrl: files[`${bucket}/${fileName}`] || "" },
      };
    },
  };
}

function localChannel() {
  return {
    on() {
      return this;
    },
    subscribe() {
      return this;
    },
  };
}

export const localDb = {
  from(table) {
    return new LocalQuery(table);
  },
  storage: {
    from(bucket) {
      return storageBucket(bucket);
    },
  },
  channel() {
    return localChannel();
  },
  removeChannel() {},
};
