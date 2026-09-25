// Drop-in replacement for the Claude-artifact `window.storage` API,
// backed by the browser's localStorage so the app works as a normal website.
// All data stays on the device it's used on (no server, no account needed).

const PREFIX = "fhi:";

function fullKey(key) {
  return PREFIX + key;
}

export const storage = {
  async get(key) {
    const raw = window.localStorage.getItem(fullKey(key));
    if (raw === null) return null;
    return { key, value: raw };
  },

  async set(key, value) {
    window.localStorage.setItem(fullKey(key), value);
    return { key, value };
  },

  async delete(key) {
    const existed = window.localStorage.getItem(fullKey(key)) !== null;
    window.localStorage.removeItem(fullKey(key));
    return { key, deleted: existed };
  },

  async list(prefix = "") {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(fullKey(prefix))) {
        keys.push(k.slice(PREFIX.length));
      }
    }
    return { keys, prefix };
  },
};
