const els = {
  topbar: document.getElementById('topbar'),
  // login & admin
  login: document.getElementById('login-section'),
  dash: document.getElementById('dashboard'),
  btnLogout: document.getElementById('btnLogout'),

  // numbers
  statNasabah: document.getElementById('statNasabah'),
  statSaldo: document.getElementById('statSaldo'),
  statRata: document.getElementById('statRata'),

  // tables
  tBody: document.querySelector('#tNasabah tbody'),

  // admin forms
  namaBaru: document.getElementById('namaBaru'),
  saldoBaru: document.getElementById('saldoBaru'),
  btnTambah: document.getElementById('btnTambah'),
  namaEdit: document.getElementById('namaEdit'),
  saldoEdit: document.getElementById('saldoEdit'),
  aksiEdit: document.getElementById('aksiEdit'),
  tglEdit: document.getElementById('tglEdit'),
  jamEdit: document.getElementById('jamEdit'),
  catatanEdit: document.getElementById('catatanEdit'),
  btnEdit: document.getElementById('btnEdit'),
  btnLogin: document.getElementById('btnLogin'),
  loginMsg: document.getElementById('loginMsg'),
  msg: document.getElementById('msg'),

  // public view
  pv: document.getElementById('public-view'),
  pvTitle: document.getElementById('pv-title'),
  pvSaldo: document.getElementById('pv-saldo'),
  pvAmount: document.getElementById('pv-amount'),
  pvAdd: document.getElementById('pv-add'),
  pvWithdraw: document.getElementById('pv-withdraw'),
  pvHistory: document.querySelector('#pv-history tbody'),
  pvEmpty: document.getElementById('pv-empty'),
};

let state = { nasabah: [] };
const origin = (location.origin || '').replace(/\/$/,'');

// ====== formatter & parser ======
const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const fmtNum = n => new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(n)||0);
const parseNum = s => Number((s||'').toString().replace(/[^\d]/g,'')) || 0;

// ribuan bertitik saat ketik
function maskThousands(el){
  el.addEventListener('input', ()=>{
    el.value = fmtNum(parseNum(el.value));
  });
}
['saldoBaru','saldoEdit','pv-amount'].forEach(id=>{
  const el = document.getElementById(id);
  if (el) maskThousands(el);
});

// ====== public vs admin ======
const params = new URLSearchParams(location.search);
const publicName = params.get('n');

if (publicName) {
  if (els.topbar) els.topbar.style.display = 'none';   // hilangkan nav di publik
  document.querySelectorAll('.tab').forEach(el => el.style.display = 'none');
  els.pv.style.display = 'block';
  loadPublic(publicName);
} else {
  renderGate();
}

// ====== API util ======
async function callGet(){
  const r = await fetch('/api/get');
  const t = await r.text(); let j; try{ j=JSON.parse(t); } catch{ j={raw:t}; }
  if(!r.ok) throw new Error(`GET ${r.status}: ${j.error||j.message||JSON.stringify(j)}`);
  return j;
}
async function callPut(payload){
  const r = await fetch('/api/put',{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const t = await r.text(); let j; try{ j=JSON.parse(t); } catch{ j={raw:t}; }
  if(!r.ok) throw new Error(`PUT ${r.status}: ${j.error||j.message||JSON.stringify(j)}`);
  return j;
}
async function callPublic(name){
  const r = await fetch('/api/public?name=' + encodeURIComponent(name));
  const j = await r.json();
  if(!r.ok || !j.found) throw new Error(j.message || 'Nasabah tidak ditemukan');
  return j.nasabah;
}

// ====== auth gate ======
function isLogged(){ return localStorage.getItem('tabungan_logged') === '1'; }
function setLogged(v){ v ? localStorage.setItem('tabungan_logged','1') : localStorage.removeItem('tabungan_logged'); renderGate(); }
function renderGate(){
  const ok = isLogged();
  els.login.style.display = ok ? 'none' : 'block';
  els.dash.style.display  = ok ? 'block' : 'none';
  if (ok) loadData();
}

// ====== render admin ======
function renderAdmin(){
  const list = state.nasabah || [];
  let total = 0; list.forEach(x=> total += Number(x.saldo||0));
  els.statNasabah.textContent = list.length;
  els.statSaldo.textContent   = fmt(total);
  els.statRata.textContent    = fmt(list.length ? Math.round(total/list.length) : 0);

  els.tBody.innerHTML = '';
  list.forEach(item=>{
    const tr = document.createElement('tr');
    const link = `${origin}/?n=${encodeURIComponent(item.nama)}`;
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${fmt(item.saldo||0)}</td>
      <td><button class="danger small" data-del="${item.nama}">Hapus</button></td>
      <td><button class="small" data-copy="${link}">Link</button></td>
    `;
    els.tBody.appendChild(tr);
  });

  els.tBody.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const nama = btn.getAttribute('data-del');
      if(!confirm(`Hapus nasabah "${nama}"?`)) return;
      state.nasabah = (state.nasabah||[]).filter(x=>x.nama !== nama);
      try{ await callPut(state); renderAdmin(); }
      catch(e){ alert(e.message); }
    });
  });
  els.tBody.querySelectorAll('button[data-copy]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const url = btn.getAttribute('data-copy');
      try{ await navigator.clipboard.writeText(url); btn.textContent='Disalin!'; setTimeout(()=>btn.textContent='Link',1500); }
      catch{ prompt('Salin link ini:', url); }
    });
  });
}

async function loadData(){
  try{
    const data = await callGet();
    if (!Array.isArray(data.nasabah)) data.nasabah = [];
    data.nasabah = data.nasabah.map(x => ({ ...x, history: Array.isArray(x.history) ? x.history : [] }));
    state = data;
    renderAdmin();
    els.msg.textContent = '';
  }catch(e){
    els.msg.textContent = 'GET error → ' + e.message;
  }
}

// ====== public view ======
function renderPublicHistory(list){
  els.pvHistory.innerHTML = '';
  if (!Array.isArray(list) || list.length === 0){
    els.pvEmpty.style.display = 'block';
    return;
  }
  els.pvEmpty.style.display = 'none';
  const sorted = [...list].sort((a,b)=> (b.ts||0) - (a.ts||0));
  sorted.forEach(it=>{
    const tr = document.createElement('tr');
    const d = new Date(it.ts || Date.now());
    const tgl = d.toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' });
    const jenis = (it.type || 'koreksi').toLowerCase();
    const cls = jenis === 'tambah' ? 'add' : jenis === 'tarik' ? 'withdraw' : 'koreksi';
    tr.innerHTML = `<td>${tgl}</td><td><span class="badge ${cls}">${jenis[0].toUpperCase()+jenis.slice(1)}</span></td><td>${fmt(it.amount||0)}</td><td>${it.note||'-'}</td>`;
    els.pvHistory.appendChild(tr);
  });
}
async function loadPublic(name){
  try{
    const nas = await callPublic(name);
    els.pvTitle.textContent = `Halo, ${nas.nama}`;
    els.pvSaldo.textContent = fmt(nas.saldo || 0);
    renderPublicHistory(nas.history || []);

    const wa = (type, amount) => {
      const nominal = parseNum(amount);
      const action = type === 'add' ? 'Tambah Tabungan' : 'Tarik Tabungan';
      const msg = `Halo Mas Hepi, saya *${nas.nama}* ingin *${action}* sebesar *${fmt(nominal)}*. (Link: ${origin}/?n=${encodeURIComponent(nas.nama)})`;
      return `https://wa.me/6285346861655?text=${encodeURIComponent(msg)}`;
    };

    els.pvAdd.addEventListener('click', ()=>{
      const a = els.pvAmount.value;
      const n = parseNum(a);
      if(!n){ alert('Isi nominal dulu'); return; }
      location.href = wa('add', a);
    });
    els.pvWithdraw.addEventListener('click', ()=>{
      const a = els.pvAmount.value;
      const n = parseNum(a);
      if(!n){ alert('Isi nominal dulu'); return; }
      if (n > Number(nas.saldo||0)) { // VALIDASI PUBLIK
        alert('Nominal penarikan melebihi saldo Anda. Silakan kurangi nominal.');
        return;
      }
      location.href = wa('withdraw', a);
    });
  }catch(e){
    els.pv.style.display = 'block';
    els.pv.innerHTML = `<h2>Tautan tidak valid</h2><p class="muted">${e.message || 'Error'}</p>`;
  }
}

// ====== auth events ======
document.getElementById('btnLogin')?.addEventListener('click', async ()=>{
  const username = document.getElementById('user').value.trim();
  const password = document.getElementById('pass').value.trim();
  try{
    const r = await fetch('/api/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password})});
    const j = await r.json();
    if(!r.ok || !j.ok){ els.loginMsg.textContent = j.message || 'Login gagal'; return; }
    setLogged(true);
  }catch(e){ els.loginMsg.textContent = 'Error login'; }
});
els.btnLogout?.addEventListener('click', ()=> setLogged(false));

// ====== admin actions ======
els.btnTambah?.addEventListener('click', async ()=>{
  const nama  = (els.namaBaru.value||'').trim();
  const saldo = parseNum(els.saldoBaru.value);
  if(!nama){ alert('Nama wajib'); return; }
  const exists = (state.nasabah||[]).some(x => x.nama.toLowerCase() === nama.toLowerCase());
  if(exists){ alert('Nama sudah ada'); return; }
  const now = Date.now();
  const history = saldo > 0 ? [{ ts: now, type: 'tambah', amount: saldo, note: 'Setoran awal' }] : [];
  state.nasabah = [...(state.nasabah||[]), { nama, saldo, history }];
  try{ await callPut(state); els.namaBaru.value=''; els.saldoBaru.value=''; renderAdmin(); }
  catch(e){ alert(e.message); }
});

function buildCustomTs(dateStr, timeStr){
  if(!dateStr && !timeStr) return Date.now();
  const [Y,M,D] = (dateStr||'').split('-').map(x=>parseInt(x,10));
  const [h,m]   = (timeStr||'').split(':').map(x=>parseInt(x,10));
  const dt = new Date(
    isFinite(Y)?Y:new Date().getFullYear(),
    isFinite(M)?(M-1):new Date().getMonth(),
    isFinite(D)?D:new Date().getDate(),
    isFinite(h)?h:9, isFinite(m)?m:0, 0, 0
  );
  return dt.getTime();
}

els.btnEdit?.addEventListener('click', async ()=>{
  const nama = (els.namaEdit.value||'').trim();
  let jumlah = parseNum(els.saldoEdit.value);
  const mode = els.aksiEdit.value;
  const note = (els.catatanEdit.value||'').trim();
  const ts   = buildCustomTs(els.tglEdit.value, els.jamEdit.value);

  if(!nama || !jumlah){ alert('Lengkapi nama & jumlah'); return; }
  const idx = (state.nasabah||[]).findIndex(x => x.nama.toLowerCase() === nama.toLowerCase());
  if(idx<0){ alert('Nasabah tidak ditemukan'); return; }

  const list = [...state.nasabah];
  const curr = { ...list[idx] };
  curr.history = Array.isArray(curr.history) ? curr.history : [];

  let delta = jumlah;

  if(mode === 'kurangi'){
    // VALIDASI ADMIN: tidak boleh tarik > saldo
    if (jumlah > Number(curr.saldo||0)) {
      alert(`Penarikan (${fmt(jumlah)}) melebihi saldo (${fmt(curr.saldo||0)}). Tidak disetujui.`);
      return;
    }
    delta = -Math.abs(jumlah);
  }
  if(mode === 'koreksi'){
    delta = jumlah - Number(curr.saldo||0);
  }

  const newSaldo = Math.max(0, Number(curr.saldo||0) + delta);
  const entry = {
    ts,
    type: mode === 'koreksi' ? 'koreksi' : (delta >= 0 ? 'tambah' : 'tarik'),
    amount: Math.abs(delta),
    note: note || (mode==='koreksi' ? 'Penyesuaian saldo' : (delta>=0?'Setoran':'Penarikan'))
  };

  curr.saldo = newSaldo;
  curr.history = [...curr.history, entry];
  list[idx] = curr;
  state.nasabah = list;

  try{
    await callPut(state);
    // reset form
    els.saldoEdit.value=''; els.catatanEdit.value=''; els.tglEdit.value=''; els.jamEdit.value='';
    renderAdmin();
  }catch(e){ alert(e.message); }
});
