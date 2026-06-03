/* ============================================================
   HEPI TABUNGAN — app.js
   ============================================================ */

'use strict';

// ── Formatter ────────────────────────────────────────────────
const fmt = n =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

const fmtNum = n =>
  new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

const parseNum = s =>
  Number((s || '').toString().replace(/[^\d]/g, '')) || 0;

function maskThousands(el) {
  if (!el) return;
  el.addEventListener('input', () => {
    const v = parseNum(el.value);
    el.value = v ? fmtNum(v) : '';
  });
}

// ── Tabel Biaya Penarikan ─────────────────────────────────────
// Format: [minAmount, maxAmount, fee]  (maxAmount = Infinity untuk tier terakhir)
const FEE_TABLE = [
  [0,       700000,   5000],
  [800000,  2000000,  10000],
  [2100000, 3000000,  15000],
  [3100000, 5000000,  20000],
  [5000000, 7000000,  25000],
  [7100000, 10000000, 30000],
];

function getWithdrawFee(amount) {
  for (const [min, max, fee] of FEE_TABLE) {
    if (amount >= min && amount <= max) return fee;
  }
  return 30000; // > 10 jt
}

// ── Cek apakah tabungan >= 30 hari (gratis tarik) ────────────
function isFreeWithdraw(history) {
  if (!Array.isArray(history) || history.length === 0) return false;
  const oldest = Math.min(...history.map(h => h.ts || Date.now()));
  const diffDays = (Date.now() - oldest) / (1000 * 60 * 60 * 24);
  return diffDays >= 30;
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ── Routing: publik vs admin ─────────────────────────────────
const params = new URLSearchParams(location.search);
const publicName = params.get('n');

if (publicName) {
  document.getElementById('public-page').style.display = 'block';
  initPublic(decodeURIComponent(publicName));
} else {
  document.getElementById('admin-page').style.display = 'block';
  initAdmin();
}

// ============================================================
//  PUBLIC PAGE
// ============================================================

async function initPublic(name) {
  // Setup mask input
  maskThousands(document.getElementById('pub-amount'));

  try {
    const nas = await apiPublic(name);
    renderPublic(nas);
  } catch (e) {
    document.getElementById('public-page').innerHTML =
      `<div class="pub-wrap" style="padding-top:60px;text-align:center">
        <div class="pub-card" style="padding:40px">
          <div style="font-size:3rem;margin-bottom:12px">🔒</div>
          <h2 style="font-family:'DM Serif Display',serif;margin-bottom:8px">Tautan Tidak Valid</h2>
          <p style="color:var(--text-muted)">${e.message || 'Nasabah tidak ditemukan'}</p>
        </div>
      </div>`;
  }
}

function renderPublic(nas) {
  const saldo = Number(nas.saldo || 0);
  const bonus = Number(nas.bonus || 0);
  const history = Array.isArray(nas.history) ? nas.history : [];
  const origin = location.origin;

  // Greeting
  document.getElementById('pub-greeting').textContent = `${nas.nama}`;
  document.getElementById('pub-tagline').textContent = `Tabungan kamu di Hepi masih tersedia`;
  document.getElementById('pub-saldo').textContent = fmt(saldo);

  // Tanggal bergabung / oldest history
  if (history.length > 0) {
    const oldest = Math.min(...history.map(h => h.ts || Date.now()));
    const tgl = new Date(oldest).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('pub-since').textContent = `Bergabung sejak ${tgl}`;
  }

  // Bonus section
  if (bonus > 0) {
    document.getElementById('bonus-section').style.display = 'flex';
    document.getElementById('bonus-label').textContent =
      `Kamu dapat bonus ${fmt(bonus)} dari Hepi yang belum kamu tarik`;
    document.getElementById('pub-bonus').textContent = fmt(bonus);
  }

  // Free withdraw info
  const freeWithdraw = isFreeWithdraw(history);
  const freeNote = document.getElementById('fee-free-note');
  if (freeWithdraw) {
    freeNote.textContent = '✅ Tabunganmu sudah >30 hari — penarikan GRATIS!';
  } else if (history.length > 0) {
    const oldest = Math.min(...history.map(h => h.ts || Date.now()));
    const diffDays = Math.floor((Date.now() - oldest) / (1000 * 60 * 60 * 24));
    const sisaDays = 30 - diffDays;
    freeNote.textContent = `⏳ Gratis tarik dalam ${sisaDays} hari lagi`;
  }

  // Fee calc on amount input
  const amtInput = document.getElementById('pub-amount');
  const feeCalc = document.getElementById('fee-calc');
  amtInput.addEventListener('input', () => {
    const amount = parseNum(amtInput.value);
    if (!amount) { feeCalc.textContent = ''; return; }
    if (freeWithdraw || saldo === 0) {
      feeCalc.textContent = '✅ Gratis biaya penarikan';
      feeCalc.style.color = 'var(--green)';
    } else {
      const fee = getWithdrawFee(amount);
      feeCalc.textContent = `Biaya: ${fmt(fee)} · Diterima: ${fmt(amount - fee)}`;
      feeCalc.style.color = 'var(--gold)';
    }
  });

  // Tombol tambah → WA
  document.getElementById('btn-tambah').addEventListener('click', () => {
    const amount = parseNum(amtInput.value);
    if (!amount) { showToast('Isi nominal dulu', 'error'); return; }
    const msg = `Halo Mas Hepi, saya *${nas.nama}* ingin *Tambah Tabungan* sebesar *${fmt(amount)}*.\n(Link: ${origin}/?n=${encodeURIComponent(nas.nama)})`;
    location.href = `https://wa.me/6285346861655?text=${encodeURIComponent(msg)}`;
  });

  // Tombol tarik → WA
  document.getElementById('btn-tarik').addEventListener('click', () => {
    const amount = parseNum(amtInput.value);
    if (!amount) { showToast('Isi nominal dulu', 'error'); return; }

    // Jika saldo utama 0, gunakan bonus sebagai acuan
    const effectiveSaldo = saldo === 0 ? bonus : saldo;
    if (amount > effectiveSaldo) {
      showToast('Nominal melebihi saldo yang tersedia', 'error'); return;
    }

    const isFree = freeWithdraw || saldo === 0;
    const fee = isFree ? 0 : getWithdrawFee(amount);
    const diterima = amount - fee;
    const feeInfo = isFree ? 'GRATIS biaya' : `biaya ${fmt(fee)}, diterima ${fmt(diterima)}`;
    const msg = `Halo Mas Hepi, saya *${nas.nama}* ingin *Tarik Tabungan* sebesar *${fmt(amount)}* (${feeInfo}).\n(Link: ${origin}/?n=${encodeURIComponent(nas.nama)})`;
    location.href = `https://wa.me/6285346861655?text=${encodeURIComponent(msg)}`;
  });

  // Tombol tarik bonus → WA
  document.getElementById('btn-tarik-bonus').addEventListener('click', () => {
    const msg = `Halo Mas Hepi, saya *${nas.nama}* ingin *Tarik Bonus* sebesar *${fmt(bonus)}* yang belum saya tarik.\n(Link: ${origin}/?n=${encodeURIComponent(nas.nama)})`;
    location.href = `https://wa.me/6285346861655?text=${encodeURIComponent(msg)}`;
  });

  // Riwayat
  renderPublicHistory(history);
}

function renderPublicHistory(history) {
  const list = document.getElementById('pub-history-list');
  const empty = document.getElementById('pub-empty');
  const count = document.getElementById('riwayat-count');

  if (!history || history.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    count.textContent = '0 transaksi';
    return;
  }

  empty.style.display = 'none';
  count.textContent = `${history.length} transaksi`;

  const sorted = [...history].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  list.innerHTML = sorted.map(it => {
    const d = new Date(it.ts || Date.now());
    const tgl = d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const type = (it.type || 'koreksi').toLowerCase();
    const typeLabel = type === 'tambah' ? 'Setoran' : type === 'tarik' ? 'Penarikan' : 'Koreksi';
    const sign = type === 'tambah' ? '+' : type === 'tarik' ? '-' : '~';
    return `<div class="riw-item">
      <div class="riw-dot ${type}"></div>
      <div class="riw-info">
        <div class="riw-type">${typeLabel}${it.note ? ` — <span style="font-weight:400;color:var(--text-muted)">${it.note}</span>` : ''}</div>
        <div class="riw-date">${tgl}</div>
      </div>
      <div class="riw-amount ${type}">${sign} ${fmt(it.amount || 0)}</div>
    </div>`;
  }).join('');
}

// ============================================================
//  ADMIN
// ============================================================

let state = { nasabah: [] };

function initAdmin() {
  // Login
  document.getElementById('btn-login').addEventListener('click', doLogin);
  document.getElementById('l-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.getElementById('btn-logout-m')?.addEventListener('click', doLogout);

  // Mobile menu
  document.getElementById('btn-mobile-menu').addEventListener('click', () => {
    const mn = document.getElementById('mobile-nav');
    mn.style.display = mn.style.display === 'none' ? 'flex' : 'none';
  });

  // Sidebar nav
  document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.getAttribute('data-panel')));
  });

  if (isLogged()) showDashboard();
  else showLogin();
}

// ── Auth ──────────────────────────────────────────────────────
function isLogged() { return localStorage.getItem('hepi_logged') === '1'; }
function setLogged(v) { v ? localStorage.setItem('hepi_logged', '1') : localStorage.removeItem('hepi_logged'); }

async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value.trim();
  const msgEl = document.getElementById('login-msg');
  msgEl.textContent = '';
  try {
    const r = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const j = await r.json();
    if (!r.ok || !j.ok) { msgEl.textContent = j.message || 'Username atau password salah'; return; }
    setLogged(true);
    showDashboard();
  } catch { msgEl.textContent = 'Error koneksi'; }
}

function doLogout() {
  setLogged(false);
  showLogin();
}

function showLogin() {
  document.getElementById('login-wrap').style.display = 'flex';
  document.getElementById('dashboard-wrap').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('dashboard-wrap').style.display = 'flex';
  loadData();
  initAdminEvents();
  switchPanel('overview');
}

// ── Panel switching ───────────────────────────────────────────
function switchPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
  document.querySelectorAll(`.nav-item[data-panel="${id}"]`).forEach(b => b.classList.add('active'));
  // Mobile: tutup nav
  document.getElementById('mobile-nav').style.display = 'none';
  // Refresh panel tertentu
  if (id === 'bonus') renderBonusPanel();
}

// ── API calls ─────────────────────────────────────────────────
async function apiGet() {
  const r = await fetch('/api/get');
  const t = await r.text(); let j;
  try { j = JSON.parse(t); } catch { j = { raw: t }; }
  if (!r.ok) throw new Error(`GET ${r.status}: ${j.error || j.message || t}`);
  return j;
}

async function apiPut(payload) {
  const r = await fetch('/api/put', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const t = await r.text(); let j;
  try { j = JSON.parse(t); } catch { j = { raw: t }; }
  if (!r.ok) throw new Error(`PUT ${r.status}: ${j.error || j.message || t}`);
  return j;
}

async function apiPublic(name) {
  const r = await fetch('/api/public?name=' + encodeURIComponent(name));
  const j = await r.json();
  if (!r.ok || !j.found) throw new Error(j.message || 'Nasabah tidak ditemukan');
  return j.nasabah;
}

// ── Load & save ───────────────────────────────────────────────
async function loadData() {
  try {
    const data = await apiGet();
    if (!Array.isArray(data.nasabah)) data.nasabah = [];
    // Pastikan field bonus & history ada
    data.nasabah = data.nasabah.map(x => ({
      ...x,
      bonus: Number(x.bonus || 0),
      history: Array.isArray(x.history) ? x.history : []
    }));
    state = data;
    renderAll();
    showAdminMsg('');
  } catch (e) {
    showAdminMsg('Error memuat data: ' + e.message);
  }
}

async function saveState(successMsg = 'Tersimpan') {
  try {
    await apiPut(state);
    showToast(successMsg);
    renderAll();
  } catch (e) {
    showToast('Gagal menyimpan: ' + e.message, 'error');
  }
}

function showAdminMsg(msg) {
  const el = document.getElementById('admin-msg');
  if (!el) return;
  el.style.display = msg ? 'block' : 'none';
  el.textContent = msg;
}

// ── Render all ────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderOverviewTable();
  renderNasabahTable();
  renderSelects();
  renderBonusPanel();
}

function getNasabah() { return state.nasabah || []; }

function findIdx(name) {
  return getNasabah().findIndex(x =>
    (x.nama || '').toLowerCase() === (name || '').toLowerCase()
  );
}

// ── Stats ─────────────────────────────────────────────────────
function renderStats() {
  const list = getNasabah();
  const total = list.reduce((s, x) => s + Number(x.saldo || 0), 0);
  const totalBonus = list.reduce((s, x) => s + Number(x.bonus || 0), 0);
  document.getElementById('stat-nasabah').textContent = list.length;
  document.getElementById('stat-saldo').textContent = fmt(total);
  document.getElementById('stat-bonus').textContent = fmt(totalBonus);
  document.getElementById('stat-rata').textContent = fmt(list.length ? Math.round(total / list.length) : 0);
}

// ── Overview table ────────────────────────────────────────────
function renderOverviewTable(filter = '') {
  const tbody = document.getElementById('tbl-overview-body');
  const list = getNasabah().filter(x =>
    !filter || (x.nama || '').toLowerCase().includes(filter.toLowerCase())
  );
  const origin = location.origin;
  tbody.innerHTML = list.map(x => {
    const link = `${origin}/?n=${encodeURIComponent(x.nama)}`;
    return `<tr>
      <td><strong>${x.nama}</strong></td>
      <td>${fmt(x.saldo || 0)}</td>
      <td>${Number(x.bonus || 0) > 0 ? `<span class="badge badge-bonus">${fmt(x.bonus)}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>
        <a class="tbl-btn tbl-btn-link" href="${link}" target="_blank">Buka</a>
        <button class="tbl-btn tbl-btn-copy" data-copy="${link}">Salin Link</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="empty-state">Tidak ada data</td></tr>`;

  tbody.querySelectorAll('button[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyLink(btn));
  });
}

// ── Nasabah table ─────────────────────────────────────────────
function renderNasabahTable() {
  const tbody = document.getElementById('tbl-nasabah-body');
  const origin = location.origin;
  const list = getNasabah();
  tbody.innerHTML = list.map(x => {
    const link = `${origin}/?n=${encodeURIComponent(x.nama)}`;
    return `<tr>
      <td><strong>${x.nama}</strong></td>
      <td>${fmt(x.saldo || 0)}</td>
      <td>${Number(x.bonus || 0) > 0 ? fmt(x.bonus) : '—'}</td>
      <td>
        <a class="tbl-btn tbl-btn-link" href="${link}" target="_blank">Buka</a>
        <button class="tbl-btn tbl-btn-copy" data-copy="${link}">Salin</button>
      </td>
      <td><button class="tbl-btn tbl-btn-del" data-del="${x.nama}">Hapus</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="empty-state">Belum ada nasabah</td></tr>`;

  tbody.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const nama = btn.getAttribute('data-del');
      if (!confirm(`Hapus nasabah "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
      state.nasabah = state.nasabah.filter(x => x.nama !== nama);
      await saveState(`Nasabah "${nama}" dihapus`);
    });
  });
  tbody.querySelectorAll('button[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyLink(btn));
  });
}

// ── Selects refresh ───────────────────────────────────────────
function renderSelects() {
  const names = getNasabah().map(x => x.nama).sort((a, b) => a.localeCompare(b, 'id'));
  const opts = names.map(n => `<option value="${n}">${n}</option>`).join('');
  ['sel-edit-nama', 'sel-riw-nama', 'sel-rename-lama', 'sel-reset-bonus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
  updateSaldoPreview();
  updateBonusCurrent();
}

// ── Bonus panel ───────────────────────────────────────────────
function renderBonusPanel() {
  const list = getNasabah();
  const total = list.reduce((s, x) => s + Number(x.saldo || 0), 0);
  const tbody = document.getElementById('tbl-bonus-body');
  tbody.innerHTML = list.map(x => {
    const porsi = total > 0 ? ((Number(x.saldo || 0) / total) * 100).toFixed(1) : '0.0';
    return `<tr>
      <td><strong>${x.nama}</strong></td>
      <td>${fmt(x.saldo || 0)}</td>
      <td>${Number(x.bonus || 0) > 0 ? `<span class="badge badge-bonus">${fmt(x.bonus)}</span>` : '—'}</td>
      <td>${porsi}%</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="empty-state">Belum ada nasabah</td></tr>`;

  updateBonusCurrent();
}

function updateBonusCurrent() {
  const sel = document.getElementById('sel-reset-bonus');
  const el = document.getElementById('bonus-current-val');
  if (!sel || !el) return;
  const idx = findIdx(sel.value);
  el.textContent = idx >= 0 ? fmt(state.nasabah[idx].bonus || 0) : 'Rp 0';
}

// ── Saldo preview ─────────────────────────────────────────────
function updateSaldoPreview() {
  const sel = document.getElementById('sel-edit-nama');
  const jumlahEl = document.getElementById('inp-edit-jumlah');
  const aksiEl = document.getElementById('sel-edit-aksi');
  const preview = document.getElementById('saldo-preview');
  const labelEl = document.getElementById('preview-label');
  const afterEl = document.getElementById('preview-after');
  if (!sel || !jumlahEl || !aksiEl || !preview) return;

  const idx = findIdx(sel.value);
  if (idx < 0) { preview.style.display = 'none'; return; }

  const cur = Number(state.nasabah[idx].saldo || 0);
  const jumlah = parseNum(jumlahEl.value);
  const aksi = aksiEl.value;
  if (!jumlah) { preview.style.display = 'none'; return; }

  let after;
  if (aksi === 'tambah') after = cur + jumlah;
  else if (aksi === 'kurangi') after = Math.max(0, cur - jumlah);
  else after = jumlah; // koreksi

  preview.style.display = 'flex';
  labelEl.textContent = `Saldo saat ini: ${fmt(cur)}`;
  afterEl.textContent = fmt(after);
}

// ── Riwayat admin ─────────────────────────────────────────────
function renderRiwayatAdmin(name) {
  const tbody = document.getElementById('tbl-riw-body');
  const empty = document.getElementById('riw-empty');
  const idx = findIdx(name);
  tbody.innerHTML = '';
  if (idx < 0) { empty.style.display = 'block'; return; }

  const nas = state.nasabah[idx];
  const list = Array.isArray(nas.history) ? nas.history : [];
  if (list.length === 0) {
    empty.style.display = 'block'; return;
  }
  empty.style.display = 'none';

  const sorted = list.map((x, i) => ({ ...x, _i: i }))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  tbody.innerHTML = sorted.map((it, row) => {
    const d = new Date(it.ts || Date.now());
    const tgl = d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const type = (it.type || 'koreksi').toLowerCase();
    const badgeCls = type === 'tambah' ? 'badge-tambah' : type === 'tarik' ? 'badge-tarik' : 'badge-koreksi';
    const typeLabel = type === 'tambah' ? 'Setoran' : type === 'tarik' ? 'Penarikan' : 'Koreksi';
    return `<tr>
      <td style="color:var(--text-muted)">${row + 1}</td>
      <td>${tgl}</td>
      <td><span class="badge ${badgeCls}">${typeLabel}</span></td>
      <td>${fmt(it.amount || 0)}</td>
      <td>${it.note || '—'}</td>
      <td><button class="tbl-btn tbl-btn-del" data-del-idx="${it._i}" data-name="${nas.nama}">Hapus</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('button[data-del-idx]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const i = parseInt(btn.getAttribute('data-del-idx'), 10);
      const nama = btn.getAttribute('data-name');
      if (!confirm('Hapus catatan ini? (Saldo tidak berubah)')) return;
      const nidx = findIdx(nama);
      if (nidx < 0) return;
      const copy = { ...state.nasabah[nidx] };
      copy.history = (copy.history || []).filter((_, k) => k !== i);
      state.nasabah[nidx] = copy;
      await saveState('Riwayat dihapus');
      renderRiwayatAdmin(nama);
    });
  });
}

// ── copyLink helper ───────────────────────────────────────────
async function copyLink(btn) {
  const url = btn.getAttribute('data-copy');
  try {
    await navigator.clipboard.writeText(url);
    const orig = btn.textContent;
    btn.textContent = '✓ Disalin';
    setTimeout(() => btn.textContent = orig, 1500);
  } catch {
    prompt('Salin link ini:', url);
  }
}

// ── Build custom timestamp ────────────────────────────────────
function buildTs(dateStr, timeStr) {
  if (!dateStr && !timeStr) return Date.now();
  const [Y, M, D] = (dateStr || '').split('-').map(v => parseInt(v, 10));
  const [h, m]    = (timeStr  || '').split(':').map(v => parseInt(v, 10));
  const now = new Date();
  return new Date(
    isFinite(Y) ? Y : now.getFullYear(),
    isFinite(M) ? M - 1 : now.getMonth(),
    isFinite(D) ? D : now.getDate(),
    isFinite(h) ? h : 9,
    isFinite(m) ? m : 0, 0, 0
  ).getTime();
}

// ── Init admin event listeners ────────────────────────────────
function initAdminEvents() {
  // Refresh
  document.getElementById('btn-refresh')?.addEventListener('click', loadData);

  // Search overview
  document.getElementById('search-nasabah')?.addEventListener('input', e => {
    renderOverviewTable(e.target.value);
  });

  // Tambah nasabah
  document.getElementById('btn-tambah-nasabah')?.addEventListener('click', async () => {
    const nama  = (document.getElementById('new-nama').value || '').trim();
    const saldo = parseNum(document.getElementById('new-saldo').value);
    if (!nama) { showToast('Nama wajib diisi', 'error'); return; }
    if (findIdx(nama) >= 0) { showToast('Nama sudah ada', 'error'); return; }
    const now = Date.now();
    const history = saldo > 0
      ? [{ ts: now, type: 'tambah', amount: saldo, note: 'Setoran awal' }]
      : [];
    state.nasabah = [...(state.nasabah || []), { nama, saldo, bonus: 0, history }];
    document.getElementById('new-nama').value = '';
    document.getElementById('new-saldo').value = '';
    await saveState(`Nasabah "${nama}" berhasil ditambahkan`);
  });

  // Rename
  document.getElementById('btn-rename')?.addEventListener('click', async () => {
    const oldN = document.getElementById('sel-rename-lama').value;
    const newN = (document.getElementById('inp-rename-baru').value || '').trim();
    if (!oldN || !newN) { showToast('Pilih nama lama dan isi nama baru', 'error'); return; }
    if (findIdx(newN) >= 0) { showToast('Nama baru sudah dipakai', 'error'); return; }
    const idx = findIdx(oldN);
    if (idx < 0) { showToast('Nasabah tidak ditemukan', 'error'); return; }
    state.nasabah[idx] = { ...state.nasabah[idx], nama: newN };
    document.getElementById('inp-rename-baru').value = '';
    await saveState(`Nama "${oldN}" diubah menjadi "${newN}"`);
  });

  // Edit saldo — preview live
  ['sel-edit-nama', 'inp-edit-jumlah', 'sel-edit-aksi'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateSaldoPreview);
    document.getElementById(id)?.addEventListener('input', updateSaldoPreview);
  });
  maskThousands(document.getElementById('inp-edit-jumlah'));

  // Simpan edit saldo
  document.getElementById('btn-simpan-edit')?.addEventListener('click', async () => {
    const nama   = document.getElementById('sel-edit-nama').value;
    const jumlah = parseNum(document.getElementById('inp-edit-jumlah').value);
    const aksi   = document.getElementById('sel-edit-aksi').value;
    const note   = (document.getElementById('inp-edit-catatan').value || '').trim();
    const tgl    = document.getElementById('inp-edit-tgl').value;
    const jam    = document.getElementById('inp-edit-jam').value;
    const ts     = buildTs(tgl, jam);

    if (!nama || !jumlah) { showToast('Pilih nama & isi jumlah', 'error'); return; }
    const idx = findIdx(nama);
    if (idx < 0) { showToast('Nasabah tidak ditemukan', 'error'); return; }

    const list = [...state.nasabah];
    const curr = { ...list[idx], history: [...(list[idx].history || [])] };
    const curSaldo = Number(curr.saldo || 0);

    let delta, newSaldo, entryType;
    if (aksi === 'tambah') {
      delta = jumlah; newSaldo = curSaldo + jumlah; entryType = 'tambah';
    } else if (aksi === 'kurangi') {
      if (jumlah > curSaldo) { showToast(`Penarikan (${fmt(jumlah)}) melebihi saldo (${fmt(curSaldo)})`, 'error'); return; }
      delta = -jumlah; newSaldo = curSaldo - jumlah; entryType = 'tarik';
    } else {
      delta = jumlah - curSaldo; newSaldo = jumlah; entryType = 'koreksi';
    }

    const entry = {
      ts, type: entryType,
      amount: Math.abs(delta),
      note: note || (aksi === 'koreksi' ? 'Penyesuaian saldo' : aksi === 'tambah' ? 'Setoran' : 'Penarikan')
    };
    curr.saldo = Math.max(0, newSaldo);
    curr.history = [...curr.history, entry];
    list[idx] = curr;
    state.nasabah = list;

    document.getElementById('inp-edit-jumlah').value = '';
    document.getElementById('inp-edit-catatan').value = '';
    document.getElementById('inp-edit-tgl').value = '';
    document.getElementById('inp-edit-jam').value = '';
    document.getElementById('saldo-preview').style.display = 'none';

    await saveState(`Saldo ${nama} berhasil diperbarui`);
    renderRiwayatAdmin(document.getElementById('sel-riw-nama').value);
  });

  // Muat riwayat
  document.getElementById('btn-muat-riw')?.addEventListener('click', () => {
    renderRiwayatAdmin(document.getElementById('sel-riw-nama').value);
  });
  document.getElementById('sel-riw-nama')?.addEventListener('change', e => {
    renderRiwayatAdmin(e.target.value);
  });

  // ── Bonus ──
  maskThousands(document.getElementById('inp-total-bonus'));

  // Preview bonus
  document.getElementById('btn-preview-bonus')?.addEventListener('click', () => {
    const totalBonus = parseNum(document.getElementById('inp-total-bonus').value);
    if (!totalBonus) { showToast('Isi nominal bonus dulu', 'error'); return; }
    const list = getNasabah();
    const totalSaldo = list.reduce((s, x) => s + Number(x.saldo || 0), 0);
    if (totalSaldo === 0) { showToast('Total saldo 0, tidak bisa dibagi', 'error'); return; }

    const wrap = document.getElementById('bonus-preview-wrap');
    const previewList = document.getElementById('bonus-preview-list');
    wrap.style.display = 'block';
    previewList.innerHTML = list.map(x => {
      const porsi = Number(x.saldo || 0) / totalSaldo;
      const bagian = Math.round(porsi * totalBonus);
      return `<div class="bonus-preview-item">
        <span class="bonus-preview-name">${x.nama} <span style="color:var(--text-muted);font-size:0.78rem">(${(porsi * 100).toFixed(1)}%)</span></span>
        <span class="bonus-preview-val">${fmt(bagian)}</span>
      </div>`;
    }).join('');
  });

  // Bagikan bonus
  document.getElementById('btn-bagikan-bonus')?.addEventListener('click', async () => {
    const totalBonus = parseNum(document.getElementById('inp-total-bonus').value);
    const catatan = (document.getElementById('inp-catatan-bonus').value || '').trim();
    if (!totalBonus) { showToast('Isi nominal bonus dulu', 'error'); return; }
    const list = [...state.nasabah];
    const totalSaldo = list.reduce((s, x) => s + Number(x.saldo || 0), 0);
    if (totalSaldo === 0) { showToast('Total saldo 0', 'error'); return; }
    if (!confirm(`Bagikan bonus ${fmt(totalBonus)} secara proporsional ke ${list.length} nasabah?`)) return;

    list.forEach((x, i) => {
      const porsi = Number(x.saldo || 0) / totalSaldo;
      const bagian = Math.round(porsi * totalBonus);
      list[i] = { ...x, bonus: Number(x.bonus || 0) + bagian };
    });

    state.nasabah = list;
    document.getElementById('inp-total-bonus').value = '';
    document.getElementById('inp-catatan-bonus').value = '';
    document.getElementById('bonus-preview-wrap').style.display = 'none';

    await saveState(`Bonus ${fmt(totalBonus)} berhasil dibagikan${catatan ? ' — ' + catatan : ''}`);
    renderBonusPanel();
  });

  // Sel reset bonus change
  document.getElementById('sel-reset-bonus')?.addEventListener('change', updateBonusCurrent);

  // Reset bonus
  document.getElementById('btn-reset-bonus')?.addEventListener('click', async () => {
    const nama = document.getElementById('sel-reset-bonus').value;
    const idx = findIdx(nama);
    if (idx < 0) { showToast('Nasabah tidak ditemukan', 'error'); return; }
    const bonusAmt = state.nasabah[idx].bonus || 0;
    if (!bonusAmt) { showToast('Saldo bonus sudah 0', 'error'); return; }
    if (!confirm(`Reset bonus ${fmt(bonusAmt)} milik "${nama}" ke Rp 0? (Konfirmasi sudah dicairkan)`)) return;
    state.nasabah[idx] = { ...state.nasabah[idx], bonus: 0 };
    await saveState(`Bonus "${nama}" direset`);
    renderBonusPanel();
  });

  // mask tambah nasabah saldo awal
  maskThousands(document.getElementById('new-saldo'));
}
