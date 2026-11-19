const prefix = 'khatib-dashboard:';
export function load(key, fallback) { try { const v=localStorage.getItem(prefix+key); return v===null?fallback:JSON.parse(v); } catch { return fallback; } }
export function save(key, value) { try { localStorage.setItem(prefix+key, JSON.stringify(value)); } catch(e) { console.warn('Storage unavailable',e); } }
