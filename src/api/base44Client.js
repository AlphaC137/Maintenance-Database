import { initialSeedData } from '@/lib/seedData';

const STORAGE_KEY = 'cctv_maintenance_local_db_v1';
const CURRENT_USER_KEY = 'cctv_maintenance_current_user_v1';

// Super admin credentials — password is SHA-256 of 'Stallion_2550'
const SUPER_ADMIN_EMAIL = 'slebeloane@stallion.co.za';
const SUPER_ADMIN_HASH = '5063d4f4a3c6d2336b0ce8197542a9012e24c985c8c03dce804e66f8fbf411ed';
const SUPER_ADMIN_USER = {
  id: 'usr_super_admin',
  email: SUPER_ADMIN_EMAIL,
  full_name: 'Siyabonga Lebeloane',
  role: 'super_admin',
  status: 'active'
};

// Hash a password string with SHA-256 using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

const DEFAULT_PROD_API_URL = 'https://maintenance-database-1coa.onrender.com/api';

const getApiUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  // Default to live Render backend in production / browser environment
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return DEFAULT_PROD_API_URL;
  }
  return DEFAULT_PROD_API_URL;
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
          if (res.ok) {
            const created = await res.json();
            if (!db[entityName]) db[entityName] = [];
            db[entityName] = db[entityName].filter((item) => item.id !== created.id);
            db[entityName].unshift(created);
            saveStore(db);
            return created;
          }
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
          if (res.ok) {
            const updated = await res.json();
            const items = db[entityName] || [];
            const idx = items.findIndex((item) => item.id === id || String(item.id) === String(id));
            if (idx !== -1) {
              items[idx] = updated;
            } else {
              items.unshift(updated);
            }
            db[entityName] = items;
            saveStore(db);
            return updated;
          }
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
          if (res.ok) {
            const items = db[entityName] || [];
            db[entityName] = items.filter((item) => item.id !== id && String(item.id) !== String(id));
            saveStore(db);
            return await res.json();
          }
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
      const emailLower = email.trim().toLowerCase();
      const hash = await hashPassword(password);

      // Super admin shortcut
      if (emailLower === SUPER_ADMIN_EMAIL && hash === SUPER_ADMIN_HASH) {
        setCurrentUser(SUPER_ADMIN_USER);
        return SUPER_ADMIN_USER;
      }

      // Look up user in the store / API
      let users = [];
      try {
        users = await entitiesProxy.User.list();
      } catch (e) {
        users = db['User'] || [];
      }
      const found = users.find((u) => u.email?.toLowerCase() === emailLower);

      if (!found) {
        throw { status: 401, message: 'No account found with this email address.' };
      }
      if (found.password_hash !== hash) {
        throw { status: 401, message: 'Incorrect password.' };
      }
      if (found.status === 'pending') {
        throw { status: 403, message: 'Your account is pending approval by the administrator.' };
      }
      if (found.status === 'disabled' || found.status === 'deactivated') {
        throw { status: 403, message: 'Your account has been disabled. Please contact slebeloane@stallion.co.za.' };
      }
      if (found.status === 'rejected') {
        throw { status: 403, message: 'Your account access has been denied. Contact slebeloane@stallion.co.za.' };
      }

      const sessionUser = {
        id: found.id,
        email: found.email,
        full_name: found.full_name || found.email.split('@')[0],
        role: found.role || 'readonly',
        status: found.status || 'active'
      };
      setCurrentUser(sessionUser);
      return sessionUser;
    },

    async createUser({ email, password, full_name, role = 'readonly', status = 'active' }) {
      const emailLower = email.trim().toLowerCase();
      if (emailLower === SUPER_ADMIN_EMAIL) {
        throw { status: 400, message: 'This email is reserved for the Super Admin.' };
      }
      let users = [];
      try {
        users = await entitiesProxy.User.list();
      } catch (e) {
        users = db['User'] || [];
      }
      const existing = users.find((u) => u.email?.toLowerCase() === emailLower);
      if (existing) {
        throw { status: 400, message: 'An account with this email already exists.' };
      }

      const hash = await hashPassword(password);
      const now = new Date().toISOString();
      const newUser = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36),
        email: emailLower,
        full_name: full_name || emailLower.split('@')[0],
        role: role || 'readonly',
        status: status || 'active',
        password_hash: hash,
        created_date: now,
        updated_date: now
      };

      try {
        return await entitiesProxy.User.create(newUser);
      } catch (e) {
        if (!db['User']) db['User'] = [];
        db['User'].push(newUser);
        saveStore(db);
        return newUser;
      }
    },

    async updateUser(id, { email, full_name, role, status, password }) {
      const payload = {};
      if (email) payload.email = email.trim().toLowerCase();
      if (full_name !== undefined) payload.full_name = full_name;
      if (role) payload.role = role;
      if (status) payload.status = status;
      if (password && password.trim().length > 0) {
        payload.password_hash = await hashPassword(password.trim());
      }
      return await entitiesProxy.User.update(id, payload);
    },

    async register({ email, password, full_name }) {
      const emailLower = email.trim().toLowerCase();

      // Block re-registering as super admin
      if (emailLower === SUPER_ADMIN_EMAIL) {
        throw { status: 400, message: 'This email address cannot be used for registration.' };
      }

      let users = [];
      try {
        users = await entitiesProxy.User.list();
      } catch (e) {
        users = db['User'] || [];
      }

      const existing = users.find((u) => u.email?.toLowerCase() === emailLower);
      if (existing) {
        throw { status: 400, message: 'An account with this email already exists.' };
      }

      const hash = await hashPassword(password);
      const now = new Date().toISOString();
      const newUser = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36),
        email: emailLower,
        full_name: full_name || emailLower.split('@')[0],
        role: 'readonly',
        status: 'pending',
        password_hash: hash,
        created_date: now,
        updated_date: now
      };

      try {
        await entitiesProxy.User.create(newUser);
      } catch (e) {
        if (!db['User']) db['User'] = [];
        db['User'].push(newUser);
        saveStore(db);
      }

      // Do NOT set current user — they must be approved first
      return { pending: true, email: emailLower };
    },

    logout(redirectUrl) {
      setCurrentUser(null);
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },

    async resetPassword() { return { success: true }; },
    async resetPasswordRequest() { return { success: true }; },
    async verifyOtp() { return { access_token: 'local_mock_token' }; },
    setToken() {},
    async resendOtp() { return { success: true }; },
    loginWithProvider() {},
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
