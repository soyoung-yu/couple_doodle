(function setupStorage() {
  if (window.storage) return;
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(key);
      return v ? { value: v } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return true;
    },
    async list(prefix) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      return { keys };
    }
  };
})();