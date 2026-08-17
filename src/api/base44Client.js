import { initialSeedData } from '@/lib/seedData';

const STORAGE_KEY = 'cctv_maintenance_local_db_v1';
const CURRENT_USER_KEY = 'cctv_maintenance_current_user_v1';

// Default Admin User
const DEFAULT_USER = {
  id: 'usr_admin',
  email: 'admin@cctvmaintenance.com',
  full_name: 'Administrator',
  role: 'admin'
};

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse local storage DB:', e);
  }
  // Initialize with seed data
  const initialStore = JSON.parse(JSON.stringify(initialSeedData));
  saveStore(initialStore);
  return initialStore;
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save to local storage DB:', e);
  }
}

let db = loadStore();

function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
}

const getApiUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  return null;
};

// Entity Factory to emulate base44.entities.[EntityName]
function createEntityHandler(entityName) {
  return {
    async list(sortField, limit) {
      const apiUrl = getApiUrl();
      if (apiUrl) {
        try {
          const params = new URLSearchParams();
          if (sortField) params.append('sort', sortField);
          if (limit) params.append('limit', limit);
          const res = await fetch(`${apiUrl}/entities/${entityName}?${params.toString()}`);
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn(`Docker API fetch failed for ${entityName}.list, falling back to local DB:`, e);
        }
      }

      let items = [...(db[entityName] || [])];
      
      if (sortField) {
        let isDesc = false;
        let field = sortField;
        if (field.startsWith('-')) {
          isDesc = true;
          field = field.substring(1);
        }
        items.sort((a, b) => {
          const av = a[field] ?? '';
          const bv = b[field] ?? '';
          const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
          return isDesc ? -cmp : cmp;
        });
      }

      if (limit && typeof limit === 'number') {
        items = items.slice(0, limit);
      }

      return items;
    },

    async filter(query = {}) {
      const apiUrl = getApiUrl();
      if (apiUrl) {
        try {
          const params = new URLSearchParams(query);
          const res = await fetch(`${apiUrl}/entities/${entityName}?${params.toString()}`);
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn(`Docker API fetch failed for ${entityName}.filter, falling back:`, e);
        }
      }

      const items = db[entityName] || [];
      return items.filter((item) => {
        for (const [key, value] of Object.entries(query)) {
          if (String(item[key]) !== String(value)) return false;
        }
        return true;
      });
    },

    async get(id) {
      const apiUrl = getApiUrl();
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/entities/${entityName}/${id}`);
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn(`Docker API fetch failed for ${entityName}.get, falling back:`, e);
        }
      }

      const items = db[entityName] || [];
      const found = items.find((item) => item.id === id || String(item.id) === String(id));
      if (!found) {
        throw new Error(`Record with id ${id} not found in ${entityName}`);
      }
      return found;
    },

    async create(payload) {
      const apiUrl = getApiUrl();
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/entities/${entityName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn(`Docker API create failed for ${entityName}, falling back:`, e);
        }
      }

      const now = new Date().toISOString();
      const newItem = {
        id: payload.id || generateId(entityName.toLowerCase()),
        created_date: now,
        updated_date: now,
        ...payload
      };

      if (!db[entityName]) {
        db[entityName] = [];
      }
      db[entityName].unshift(newItem);
      saveStore(db);
      return newItem;
    },

    async update(id, payload) {
      const apiUrl = getApiUrl();
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/entities/${entityName}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn(`Docker API update failed for ${entityName}, falling back:`, e);
        }
      }

      const items = db[entityName] || [];
      const index = items.findIndex((item) => item.id === id || String(item.id) === String(id));
      if (index === -1) {
        throw new Error(`Record with id ${id} not found in ${entityName}`);
      }

      const updatedItem = {
        ...items[index],
        ...payload,
        updated_date: new Date().toISOString()
      };

      items[index] = updatedItem;
      saveStore(db);
      return updatedItem;
    },

    async updateMany(filterQuery, updateOp) {
      const apiUrl = getApiUrl();
      const setFields = updateOp?.$set || updateOp || {};
      
      if (apiUrl) {
        try {
          const matching = await this.filter(filterQuery);
          const ids = matching.map((m) => m.id);
          const res = await fetch(`${apiUrl}/entities/${entityName}/batch`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, updates: setFields })
          });
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn(`Docker API updateMany failed for ${entityName}, falling back:`, e);
        }
      }

      const items = db[entityName] || [];
      const updatedList = [];

      items.forEach((item, index) => {
        let match = true;
        for (const [k, v] of Object.entries(filterQuery)) {
          if (String(item[k]) !== String(v)) {
            match = false;
            break;
          }
        }
        if (match) {
          const updated = {
            ...item,
            ...setFields,
            updated_date: new Date().toISOString()
          };
          items[index] = updated;
          updatedList.push(updated);
        }
      });

      saveStore(db);
      return updatedList;
    },

    async delete(id) {
      const apiUrl = getApiUrl();
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/entities/${entityName}/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn(`Docker API delete failed for ${entityName}, falling back:`, e);
        }
      }

      const items = db[entityName] || [];
      db[entityName] = items.filter((item) => item.id !== id && String(item.id) !== String(id));
      saveStore(db);
      return { success: true, id };
    }
  };
}

const entityNames = [
  'Site',
  'Platform',
  'Camera',
  'SecurityInfo',
  'TechnicalInfo',
  'Document',
  'Client',
  'AuditLog',
  'Notification',
  'User'
];

const entities = {};
entityNames.forEach((name) => {
  entities[name] = createEntityHandler(name);
});

// Proxy to dynamically handle any entity name access (e.g. base44.entities[entityName])
const entitiesProxy = new Proxy(entities, {
  get(target, prop) {
    if (typeof prop === 'string' && !(prop in target)) {
      target[prop] = createEntityHandler(prop);
    }
    return target[prop];
  }
});

// Current User Helpers
function getCurrentUser() {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    // ignore
  }
  return DEFAULT_USER;
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// Client Object matching base44 exports
export const base44 = {
  entities: entitiesProxy,

  auth: {
    async me() {
      const user = getCurrentUser();
      if (!user) {
        throw { status: 401, message: 'Authentication required' };
      }
      return user;
    },
    async loginViaEmailPassword(email, password) {
      const user = {
        id: 'usr_' + Math.random().toString(36).substr(2, 6),
        email,
        full_name: email.split('@')[0],
        role: 'admin'
      };
      setCurrentUser(user);
      return user;
    },
    logout(redirectUrl) {
      setCurrentUser(null);
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    async resetPassword() {
      return { success: true };
    },
    async resetPasswordRequest() {
      return { success: true };
    },
    async register({ email }) {
      const user = {
        id: 'usr_' + Math.random().toString(36).substr(2, 6),
        email,
        full_name: email.split('@')[0],
        role: 'admin'
      };
      setCurrentUser(user);
      return user;
    },
    async verifyOtp() {
      return { access_token: 'local_mock_token' };
    },
    setToken() {},
    async resendOtp() {
      return { success: true };
    },
    loginWithProvider() {
      setCurrentUser(DEFAULT_USER);
    },
    redirectToLogin() {}
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file_url: reader.result });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
    }
  },

  functions: {
    async invoke(functionName, payload) {
      if (functionName === 'extractSopData') {
        return {
          data: {
            data: {
              site_name: 'Extracted Site Name',
              physical_address: '123 Monitored Way',
              client_company: 'Extracted Client Ltd',
              monitoring_schedule: '24/7'
            }
          }
        };
      }
      return { data: {} };
    }
  }
};
