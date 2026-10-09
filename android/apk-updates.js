(function (root) {
  'use strict';
  const BASE = 'https://paidalaojrkplnkucmwl.supabase.co/storage/v1/object/public/wo-apk-updates/';
  function validUpdate(data, installed) {
    return !!data && Number.isSafeInteger(data.versionCode) && data.versionCode > installed &&
      typeof data.versionName === 'string' && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(data.versionName) &&
      data.url === BASE + 'WO-Fighters-' + data.versionName + '.apk' &&
      typeof data.sha256 === 'string' && /^[a-f0-9]{64}$/.test(data.sha256);
  }
  if (typeof module === 'object') module.exports = { validUpdate, BASE };
  if (!root.document || !root.WoNative?.getVersionCode) return;
  let checking = false, last = 0, dismissed = false, available = null;
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:30;background:#101923;color:#fff;border:1px solid #f0bb47;padding:8px 12px;border-radius:8px;font:12px sans-serif;text-align:center;max-width:90%;display:none';
  const label = document.createElement('span');
  const download = document.createElement('button'); download.textContent = 'DESCARGAR';
  const later = document.createElement('button'); later.textContent = 'MÁS TARDE';
  for (const button of [download, later]) button.style.cssText = 'margin-left:8px;padding:6px;border:0;border-radius:4px;background:#f0bb47;color:#101923;font-weight:bold;cursor:pointer';
  box.append(label, download, later);
  const title = document.getElementById('titleScreen');
  if (!title) return;
  title.appendChild(box);
  download.onclick = () => { if (available) root.WoNative.openUpdateUrl(available.url); };
  later.onclick = () => { dismissed = true; box.style.display = 'none'; };
  async function check() {
    if (checking || dismissed || !root.WoNative.isOnline() || Date.now() - last < 600000) return;
    checking = true; last = Date.now();
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(BASE + 'latest.json', { cache: 'no-store', signal: controller.signal, credentials: 'omit' });
      if (!response.ok) return;
      const data = await response.json();
      if (validUpdate(data, Number(root.WoNative.getVersionCode()))) {
        available = data; label.textContent = 'Hay una actualización disponible: ' + data.versionName;
        box.style.display = 'block';
      }
    } catch (_) { /* Offline and server errors never interrupt the game. */ }
    finally { clearTimeout(timeout); checking = false; }
  }
  root.addEventListener('online', () => { last = 0; check(); });
  root.addEventListener('focus', check);
  root.setTimeout(check, 3000);
})(typeof window !== 'undefined' ? window : globalThis);
