    (function () {
      const ATTACHMENT_DIR = 'attachments';
      const DB_NAME = 'phd-workbench-attachments';
      const DB_STORE = 'files';
      const STORAGE_PREFIX = 'phd-workbench-attachment.';

      function hasTauriRuntime() {
        return !!(window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke);
      }

      function hasCapacitorNative() {
        return !!(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.nativePromise);
      }

      async function invokeTauri(command, args = {}) {
        const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) throw new Error('Tauri runtime unavailable');
        return await invoke(command, args);
      }

      async function invokeAttachmentStore(method, args = {}) {
        return await window.Capacitor.nativePromise('AttachmentStore', method, args);
      }

      function sanitizeName(name = '') {
        return String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'file';
      }

      function extensionFrom(name = '', type = '') {
        const fromName = String(name || '').split('.').pop();
        const ext = fromName && fromName !== name ? fromName.toLowerCase() : '';
        const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 12);
        if (safeExt) return safeExt;
        const byType = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'application/pdf': 'pdf',
          'text/plain': 'txt',
        };
        return byType[String(type || '').toLowerCase()] || 'bin';
      }

      function storageKeyFrom(hash, name, type) {
        return `${hash}.${extensionFrom(name, type)}`;
      }

      function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer || new ArrayBuffer(0));
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
      }

      function base64ToBlob(base64, type = 'application/octet-stream') {
        const binary = atob(String(base64 || ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: type || 'application/octet-stream' });
      }

      async function sha256Hex(buffer) {
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
      }

      function parseDataUrl(dataUrl = '') {
        const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;[^,]*)?,([\s\S]*)$/);
        if (!match) return null;
        return {
          type: match[1] || 'application/octet-stream',
          base64: match[2] || '',
        };
      }

      async function dataUrlToArrayBuffer(dataUrl) {
        const response = await fetch(dataUrl);
        return await response.arrayBuffer();
      }

      function openBlob(base64, ref = {}) {
        const blob = base64ToBlob(base64, ref.type || 'application/octet-stream');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sanitizeName(ref.name || ref.filename || 'file');
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      function validStorageKey(storageKey = '') {
        return /^[a-f0-9]{64}(?:\.[a-z0-9]{1,12})?$/.test(String(storageKey || ''));
      }

      function normalizeRef(ref = {}) {
        const storageKey = String(ref.storageKey || '').toLowerCase();
        if (!storageKey || !validStorageKey(storageKey)) return null;
        return {
          id: String(ref.id || (typeof uid === 'function' ? uid('rf') : `rf_${Date.now()}`)),
          name: sanitizeName(ref.name || ref.filename || '文件'),
          type: String(ref.type || ''),
          size: Math.max(0, Number(ref.size) || 0),
          sha256: String(ref.sha256 || storageKey.split('.')[0] || ''),
          storageKey,
          createdAt: String(ref.createdAt || (typeof nowDateTime === 'function' ? nowDateTime() : new Date().toISOString())),
        };
      }

      let dbPromise = null;
      function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, 1);
          request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return dbPromise;
      }

      async function idbGet(key) {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readonly');
          const req = tx.objectStore(DB_STORE).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      }

      async function idbSet(key, value) {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).put(value, key);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      }

      async function idbDeleteAll() {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).clear();
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      }

      async function saveLocalAttachmentBase64(storageKey, dataBase64, metadata = {}) {
        if (!validStorageKey(storageKey)) throw new Error(`附件存储键不安全: ${storageKey}`);
        if (hasTauriRuntime()) return await invokeTauri('save_attachment_file', { storageKey, dataBase64 });
        if (hasCapacitorNative()) return await invokeAttachmentStore('save', { storageKey, dataBase64 });
        if (window.PhdWorkbenchServer?.enabled) {
          const binary = atob(String(dataBase64 || ''));
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          const form = new FormData();
          form.append('storageKey', storageKey);
          form.append('file', new Blob([bytes], { type: metadata.type || 'application/octet-stream' }), sanitizeName(metadata.name || storageKey));
          const response = await fetch('/api/attachments', { method: 'POST', credentials: 'same-origin', body: form });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result?.error?.message || '附件上传失败');
          return result.attachment;
        }
        try {
          await idbSet(storageKey, dataBase64);
        } catch {
          localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, dataBase64);
        }
        return { path: `${ATTACHMENT_DIR}/${storageKey}` };
      }

      async function readLocalAttachmentBase64(storageKey) {
        if (!validStorageKey(storageKey)) return null;
        if (hasTauriRuntime()) {
          const result = await invokeTauri('read_attachment_file', { storageKey });
          return result?.dataBase64 || null;
        }
        if (hasCapacitorNative()) {
          const result = await invokeAttachmentStore('read', { storageKey });
          return result?.dataBase64 || null;
        }
        if (window.PhdWorkbenchServer?.enabled) {
          const response = await fetch(`/api/attachments/key/${encodeURIComponent(storageKey)}`, { credentials: 'same-origin' });
          if (response.status === 404) return null;
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result?.error?.message || '附件读取失败');
          return result.dataBase64 || null;
        }
        return await idbGet(storageKey) || localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      }

      async function localAttachmentExists(storageKey) {
        if (!validStorageKey(storageKey)) return false;
        if (hasTauriRuntime()) {
          const result = await invokeTauri('attachment_file_exists', { storageKey });
          return !!result?.exists;
        }
        if (hasCapacitorNative()) {
          const result = await invokeAttachmentStore('exists', { storageKey });
          return !!result?.exists;
        }
        if (window.PhdWorkbenchServer?.enabled) return !!(await readLocalAttachmentBase64(storageKey));
        return !!(await idbGet(storageKey) || localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`));
      }

      async function clearLocalAttachments() {
        if (hasTauriRuntime()) return await invokeTauri('clear_attachment_files');
        if (hasCapacitorNative()) return await invokeAttachmentStore('clear');
        if (window.PhdWorkbenchServer?.enabled) {
          const response = await fetch('/api/attachments', { method: 'DELETE', credentials: 'same-origin' });
          if (!response.ok) throw new Error('服务端附件清理失败');
          return;
        }
        await idbDeleteAll().catch(() => {});
        Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX)).forEach((key) => localStorage.removeItem(key));
      }

      async function importAttachment(file) {
        const buffer = await file.arrayBuffer();
        const sha256 = await sha256Hex(buffer);
        const storageKey = storageKeyFrom(sha256, file.name, file.type);
        const dataBase64 = arrayBufferToBase64(buffer);
        await saveLocalAttachmentBase64(storageKey, dataBase64, { name: file.name, type: file.type });
        return normalizeRef({
          id: typeof uid === 'function' ? uid('rf') : `rf_${Date.now()}`,
          name: file.name,
          type: file.type || '',
          size: file.size || buffer.byteLength,
          sha256,
          storageKey,
          createdAt: typeof nowDateTime === 'function' ? nowDateTime() : new Date().toISOString(),
        });
      }

      async function importDataUrl(item = {}) {
        const parsed = parseDataUrl(item.dataUrl || item.url || '');
        if (!parsed) return null;
        const buffer = await dataUrlToArrayBuffer(item.dataUrl || item.url);
        const sha256 = await sha256Hex(buffer);
        const name = sanitizeName(item.name || item.filename || '文件');
        const type = String(item.type || parsed.type || '');
        const storageKey = storageKeyFrom(sha256, name, type);
        await saveLocalAttachmentBase64(storageKey, parsed.base64, { name, type });
        return normalizeRef({
          id: item.id || (typeof uid === 'function' ? uid('rf') : `rf_${Date.now()}`),
          name,
          type,
          size: buffer.byteLength,
          sha256,
          storageKey,
          createdAt: item.createdAt || (typeof nowDateTime === 'function' ? nowDateTime() : new Date().toISOString()),
        });
      }

      async function openAttachment(ref = {}) {
        if (ref.dataUrl || ref.url) {
          const parsed = parseDataUrl(ref.dataUrl || ref.url);
          if (parsed) {
            openBlob(parsed.base64, { ...ref, type: ref.type || parsed.type });
            return true;
          }
        }
        const normalized = normalizeRef(ref);
        if (!normalized) throw new Error('附件引用无效');
        let dataBase64 = await readLocalAttachmentBase64(normalized.storageKey);
        if (!dataBase64 && window.PhdWorkbenchSyncAssets?.downloadAsset) {
          dataBase64 = await window.PhdWorkbenchSyncAssets.downloadAsset(normalized);
          if (dataBase64) await saveLocalAttachmentBase64(normalized.storageKey, dataBase64);
        }
        if (!dataBase64) throw new Error('本地没有该附件，且当前无法从云端下载');
        openBlob(dataBase64, normalized);
        return true;
      }

      function collectRefsFromList(items = []) {
        const refs = [];
        (items || []).forEach((item) => {
          [...(item.invoices || []), ...(item.receipts || [])].forEach((file) => {
            const normalized = normalizeRef(file);
            if (normalized) refs.push(normalized);
          });
        });
        return refs;
      }

      function collectRefs(state = {}) {
        const reimb = state.reimb || {};
        const byKey = new Map();
        [...collectRefsFromList(reimb.pending), ...collectRefsFromList(reimb.done)].forEach((ref) => {
          if (!byKey.has(ref.storageKey)) byKey.set(ref.storageKey, ref);
        });
        return [...byKey.values()];
      }

      async function migrateLegacyDataUrls(state = {}) {
        const reimb = state.reimb || {};
        let migrated = 0;
        for (const item of [...(reimb.pending || []), ...(reimb.done || [])]) {
          for (const field of ['invoices', 'receipts']) {
            if (!Array.isArray(item[field])) continue;
            const nextFiles = [];
            for (const file of item[field]) {
              if (file?.storageKey) {
                nextFiles.push(normalizeRef(file) || file);
                continue;
              }
              if (file?.dataUrl || file?.url) {
                const converted = await importDataUrl(file).catch((err) => {
                  console.error('legacy attachment migration failed', err);
                  return null;
                });
                if (converted) {
                  nextFiles.push(converted);
                  migrated += 1;
                } else {
                  nextFiles.push(file);
                }
              } else if (file) {
                nextFiles.push(file);
              }
            }
            item[field] = nextFiles;
          }
        }
        return migrated;
      }

      window.PhdWorkbenchAttachments = {
        importAttachment,
        importDataUrl,
        openAttachment,
        collectRefs,
        normalizeRef,
        migrateLegacyDataUrls,
        localAttachmentExists,
        readLocalAttachmentBase64,
        saveLocalAttachmentBase64,
        clearLocalAttachments,
      };
    })();
