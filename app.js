const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);

const els = {
  login: document.getElementById('login-section'),
  dash: document.getElementById('dashboard'),
  btnLogin: document.getElementById('btnLogin'),
  loginMsg: document.getElementById('loginMsg'),
  statNasabah: document.getElementById('statNasabah'),
  statSaldo: document.getElementById('statSaldo'),
  statRata: document.getElementById('statRata'),
  tBody: document.querySelector('#tNasabah tbody'),
  namaBaru: document.getElementById('namaBaru'),
  saldoBaru: document.getElementById('saldoBaru'),
  btnTambah: document.getElementById('btnTambah'),
  namaEdit: document.getElementById('namaEdit'),
  saldoEdit: document.getElementById('saldoEdit'),
  aksiEdit: document.getElementById('aksiEdit'),
  btnEdit: document.getElementById('btnEdit'),
  msg: document.getElementById('msg'),
  navLogout: document.getElementById('nav-logout')
};

let state = { nasabah: [] };

function isLogged() { return localStorage.getItem('tabungan_logged') === '1'; }
function setLogged(v){
  if(v){ localStorage.setItem('tabungan_logged','1'); }
  else { localStorage.removeItem('tabungan_logged'); }
  renderGate();
}
function renderGate(){
  const ok = isLogged();
  els.login.style.display = ok ? 'none' : 'block';
  els.dash.style.display = ok ? 'block' : 'none';
  els.navLogout.style.display = ok ? 'inline-block' : 'none';
  if (ok) loadData();
}

async function callGet(){
  const r = await fetch('/api/get');
  if (!r.ok) throw new Error('Gagal mengambil data');
  return r.json();
}

async function callPut(payload){
  const r = await fetch('/api/put',{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error('Gagal menyimpan data');
  return r.json();
}

function renderTable(){
  const list = state.nasabah || [];
  els.tBody.innerHTML = '';
  let total = 0;
  list.forEach(item => {
    total += Number(item.saldo||0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${fmt(item.saldo||0)}</td>
      <td><button data-del="${item.nama}">Hapus</button></td>`;
    els.tBody.appendChild(tr);
  });
  els.statNasabah.textContent = list.length;
  els.statSaldo.textContent = fmt(total);
  els.statRata.textContent = fmt(list.length ? Math.round(total/list.length) : 0);
  // Hapus
  els.tBody.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', async () => {
      const nama = btn.getAttribute('data-del');
      state.nasabah = (state.nasabah||[]).filter(x => x.nama !== nama);
      try{
        await callPut(state);
        renderTable();
      }catch(e){ alert(e.message); }
    });
  });
}

async function loadData(){
  try{
    const data = await callGet();
    // Pastikan struktur
    if (!Array.isArray(data.nasabah)) data.nasabah = [];
    state = data;
    renderTable();
  }catch(e){
    els.msg.textContent = e.message;
  }
}

// Login
els.btnLogin.addEventListener('click', async ()=>{
  const username = document.getElementById('user').value.trim();
  const password = document.getElementById('pass').value.trim();
  try{
    const r = await fetch('/api/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password})});
    const j = await r.json();
    if(!r.ok || !j.ok){ els.loginMsg.textContent = j.message || 'Login gagal'; return; }
    setLogged(true);
  }catch(e){ els.loginMsg.textContent = 'Error login'; }
});

document.getElementById('nav-logout').addEventListener('click', ()=> setLogged(false));

// Tambah nasabah
els.btnTambah.addEventListener('click', async ()=>{
  const nama = (els.namaBaru.value||'').trim();
  const saldo = Number((els.saldoBaru.value||'0').replace(/[^\d]/g,'')) || 0;
  if(!nama){ alert('Nama wajib'); return; }
  const exists = (state.nasabah||[]).some(x => x.nama.toLowerCase() === nama.toLowerCase());
  if(exists){ alert('Nama sudah ada'); return; }
  state.nasabah = [...(state.nasabah||[]), { nama, saldo }];
  try{ await callPut(state); els.namaBaru.value=''; els.saldoBaru.value=''; renderTable(); }
  catch(e){ alert(e.message); }
});

// Edit saldo (tambah/kurangi)
els.btnEdit.addEventListener('click', async ()=>{
  const nama = (els.namaEdit.value||'').trim();
  let jumlah = Number((els.saldoEdit.value||'0').replace(/[^\d]/g,'')) || 0;
  if(!nama || !jumlah){ alert('Lengkapi nama & jumlah'); return; }
  const idx = (state.nasabah||[]).findIndex(x => x.nama.toLowerCase() === nama.toLowerCase());
  if(idx<0){ alert('Nasabah tidak ditemukan'); return; }
  if(els.aksiEdit.value === 'kurangi') jumlah = -Math.abs(jumlah);
  const clone = [...state.nasabah];
  clone[idx] = {...clone[idx], saldo: Math.max(0, Number(clone[idx].saldo||0) + jumlah)};
  state.nasabah = clone;
  try{ await callPut(state); els.saldoEdit.value=''; renderTable(); }
  catch(e){ alert(e.message); }
});

// Auto-gate saat load
renderGate();
