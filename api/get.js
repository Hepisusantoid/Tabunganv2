// Pastikan Node runtime, bukan edge
export const config = { runtime: 'nodejs18.x' };

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { JSONBIN_BASE, JSONBIN_BIN_ID, JSONBIN_MASTER_KEY } = process.env;
    if (!JSONBIN_BASE || !/^https?:\/\//.test(JSONBIN_BASE)) {
      return res.status(500).json({ error: 'ENV_MISSING: JSONBIN_BASE' });
    }
    if (!JSONBIN_BIN_ID) return res.status(500).json({ error: 'ENV_MISSING: JSONBIN_BIN_ID' });
    if (!JSONBIN_MASTER_KEY) return res.status(500).json({ error: 'ENV_MISSING: JSONBIN_MASTER_KEY' });

    const url = `${JSONBIN_BASE}/b/${JSONBIN_BIN_ID}/latest`;
    const r   = await fetch(url, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY, 'Accept': 'application/json' }
    });

    const raw = await r.text();
    let json; try { json = JSON.parse(raw); } catch { json = { raw }; }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'JSONBIN_GET_NON_200', status: r.status, detail: json });
    }

    const data = json?.record;
    return res.status(200).json(data && typeof data === 'object' ? data : { nasabah: [] });
  } catch (e) {
    return res.status(500).json({ error: 'FETCH_THROWN', message: e?.message || String(e), name: e?.name });
  }
}
