export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { JSONBIN_BASE, JSONBIN_BIN_ID, JSONBIN_MASTER_KEY } = process.env;
    if (!JSONBIN_BASE || !JSONBIN_BIN_ID || !JSONBIN_MASTER_KEY) {
      return res.status(500).json({ error: 'ENV_MISSING' });
    }

    const url = `${JSONBIN_BASE}/b/${JSONBIN_BIN_ID}/latest`;
    const r = await fetch(url, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY, 'Accept': 'application/json' }
    });

    const raw = await r.text();
    let json; try { json = JSON.parse(raw); } catch { json = { raw }; }

    if (!r.ok) return res.status(r.status).json({ error: 'JSONBIN_GET_NON_200', status: r.status, detail: json });

    const data = json?.record;
    if (!data || typeof data !== 'object') return res.status(200).json({ nasabah: [] });

    // Pastikan field bonus ada di tiap nasabah
    if (Array.isArray(data.nasabah)) {
      data.nasabah = data.nasabah.map(x => ({
        ...x,
        bonus: Number(x.bonus || 0),
        history: Array.isArray(x.history) ? x.history : []
      }));
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'FETCH_THROWN', message: e?.message || String(e) });
  }
}
