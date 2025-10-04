const els = {
  login: document.getElementById('login-section'),
  dash: document.getElementById('dashboard'),
  nasabahTab: document.getElementById('nasabah-tab'),
  tabs: document.querySelectorAll('.nav a[data-tab]'),
  navLogout: document.getElementById('nav-logout'),

  // dashboard numbers
  statNasabah: document.getElementById('statNasabah'),
  statSaldo: document.getElementById('statSaldo'),
  statRata: document.getElementById('statRata'),

  // tables
  tBody: document.querySelector('#tNasabah tbody'),
  tBody2: document.querySelector('#tNasabah2 tbody'),

  // forms admin
  namaBaru: document.getElementById('namaBaru'),
  saldoBaru: document.getElementById('saldoBaru'),
  btnTambah: document.getElementById('btnTambah'),
  namaEdit: document.getElementById('namaEdit'),
  saldoEdit: document.getElementById('saldoEdit'),
  aksiEdit: document.getElementById('aksiEdit'),
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
};

let state = { nasabah: [] };
const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const origin = (location.origin || '').replace(/\/$/,'');

// ====== MODE: PUBLIC VIEW ======
const params = new URLSearchParams(location.search);
const publicName = params.get('n');

if (publicName) {
  // Sembunyikan semua tab, tampilkan public view
  document.querySelectorAll('.tab').forEach(el => el.style.display = 'none');
  els.navLogout.style.display = 'none';
  els.pv.style.display = 'block';
  loadPublic(publicName);
} else {
  // Mode Admin/Private
  renderGate();
  setupTabs();
}

// ====== UTIL API ======
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

// ====== AUTH GATE ======
function isLogged(){ return localStorage.getItem('tabungan_logged') === '1'; }
function setLogged(v){ v ? localStorage.setItem('tabungan_logged','1') : localStorage.removeItem('tabungan_logged'); renderGate(); }
function renderGate(){
  const ok = isLogged();
  els.login.style.display = ok ? 'none' : 'block';
  els.dash.style.display  = ok ? 'block' : 'none';
  els.nasabahTab.style.display = ok ? 'block' : 'none';
  els.navLogout.style.display = ok ? 'inline-block' : 'none';
  if (ok) loadData();
}

// ====== TABS (Beranda/Nasabah/Admin) ======
function setupTabs(){
  els.tabs.forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const tab = a.getAttribute('data-tab');
      // set active
      els.tabs.forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      // show/hide
      document.querySelectorAll('.tab').forEach(el=>el.style.display='none');
      if (tab === 'beranda') els.dash.style.display='block';
      if (tab === 'nasabah') els.nasabahTab.style.display='block';
      if (tab === 'admin') els.login.style.display = isLogged() ? 'none':'block';
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
}

// ====== RENDER TABEL ======
function renderTables(){
  const list = state.nasabah || [];
  // stats
  let total = 0; list.forEach(x=> total += Number(x.saldo||0));
  els.statNasabah.textContent = list.length;
  els.statSaldo.textContent   = fmt(total);
  els.statRata.textContent    = fmt(list.length ? Math.round(total/list.length) : 0);

  // main table
  els.tBody.innerHTML = '';
  list.forEach(item=>{
    const tr = document.createElement('tr');
    const link = `${origin}/?n=${encodeURIComponent(item.nama)}`;
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${fmt(item.saldo||0)}</td>
      <td>
        <button class="danger small" data-del="${item.nama}">Hapus</button>
      </td>
      <td>
        <button class="small" data-copy="${link}">Link</button>
      </td>
    `;
    els.tBody.appendChild(tr);
  });

  // second table (Nasabah tab)
  els.tBody2.innerHTML = '';
  list.forEach(item=>{
    const tr = document.createElement('tr');
    const link = `${origin}/?n=${encodeURIComponent(item.nama)}`;
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${fmt(item.saldo||0)}</td>
      <td><a class="chip" href="${link}" target="_blank" rel="noopener">Buka</a></td>
    `;
    els.tBody2.appendChild(tr);
  });

  // actions
  // delete
  els.tBody.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const nama = btn.getAttribute('data-del');
      if(!confirm(`Hapus nasabah "${nama}"?`)) return;
      state.nasabah = (state.nasabah||[]).filter(x=>x.nama !== nama);
      try{ await callPut(state); renderTables(); }
      catch(e){ alert(e.message); }
    });
  });
  // copy link
  els.tBody.querySelectorAll('button[data-copy]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const url = btn.getAttribute('data-copy');
      try{ await navigator.clipboard.writeText(url); btn.textContent='Disalin!'; setTimeout(()=>btn.textContent='Link',1500); }
      catch{ prompt('Salin link ini:', url); }
    });
  });
}

// ====== LOAD DATA (ADMIN) ======
async function loadData(){
  try{
    const data = await callGet();
    if (!Array.isArray(data.nasabah)) data.nasabah = [];
    state = data;
    renderTables();
    els.msg.textContent = '';
  }catch(e){
    els.msg.textContent = 'GET error → ' + e.message;
  }
}

// ====== PUBLIC VIEW ======
async function loadPublic(name){
  try{
    const nas = await callPublic(name);
    els.pvTitle.textContent = `Halo, ${nas.nama}`;
    els.pvSaldo.textContent = fmt(nas.saldo || 0);

    const wa = (type, amount) => {
      const nominal = Number((amount||'').toString().replace(/[^\d]/g,''))||0;
      const action = type === 'add' ? 'Tambah Tabungan' : 'Tarik Tabungan';
      const msg = `Halo Mas Hepi, saya *${nas.nama}* ingin *${action}* sebesar *${fmt(nominal)}*. (Link: ${origin}/?n=${encodeURIComponent(nas.nama)})`;
      return `https://wa.me/6285346861655?text=${encodeURIComponent(msg)}`;
    };

    els.pvAdd.addEventListener('click', ()=>{
      const a = els.pvAmount.value;
      if(!a){ alert('Isi nominal dulu'); return; }
      location.href = wa('add', a);
    });
    els.pvWithdraw.addEventListener('click', ()=>{
      const a = els.pvAmount.value;
      if(!a){ alert('Isi nominal dulu'); return; }
      location.href = wa('withdraw', a);
    });
  }catch(e){
    els.pv.style.display = 'block';
    els.pv.innerHTML = `<h2>Tautan tidak valid</h2><p class="muted">${e.message || 'Error'}</p>`;
  }
}

// ====== EVENTS AUTH ======
document.getElementById('btnLogin')?.addEventListener('click', async ()=>{
  const username = document.getElementById('user').value.trim();
  const password = document.getElementById('pass').value.trim();
  try{
    const r = await fetch('/api/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password})});
    const j = await r.json();
    if(!r.ok || !j.ok){ els.loginMsg.textContent = j.message || 'Login gagal'; return; }
    setLogged(true);
    // pindah ke beranda tab
    document.querySelector('.nav a[data-tab="beranda"]')?.click();
  }catch(e){ els.loginMsg.textContent = 'Error login'; }
});
els.navLogout?.addEventListener('click', ()=> setLogged(false));

// ====== ADMIN ACTIONS ======
els.btnTambah?.addEventListener('click', async ()=>{
  const nama  = (els.namaBaru.value||'').trim();
  const saldo = Number((els.saldoBaru.value||'0').replace(/[^\d]/g,'')) || 0;
  if(!nama){ alert('Nama wajib'); return; }
  const exists = (state.nasabah||[]).some(x => x.nama.toLowerCase() === nama.toLowerCase());
  if(exists){ alert('Nama sudah ada'); return; }
  state.nasabah = [...(state.nasabah||[]), { nama, saldo }];
  try{ await callPut(state); els.namaBaru.value=''; els.saldoBaru.value=''; renderTables(); }
  catch(e){ alert(e.message); }
});

els.btnEdit?.addEventListener('click', async ()=>{
  const nama = (els.namaEdit.value||'').trim();
  let jumlah = Number((els.saldoEdit.value||'0').replace(/[^\d]/g,'')) || 0;
  if(!nama || !jumlah){ alert('Lengkapi nama & jumlah'); return; }
  const idx = (state.nasabah||[]).findIndex(x => x.nama.toLowerCase() === nama.toLowerCase());
  if(idx<0){ alert('Nasabah tidak ditemukan'); return; }
  if(els.aksiEdit.value === 'kurangi') jumlah = -Math.abs(jumlah);
  const clone = [...state.nasabah];
  clone[idx] = { ...clone[idx], saldo: Math.max(0, Number(clone[idx].saldo||0) + jumlah) };
  state.nasabah = clone;
  try{ await callPut(state); els.saldoEdit.value=''; renderTables(); }
  catch(e){ alert(e.message); }
});
