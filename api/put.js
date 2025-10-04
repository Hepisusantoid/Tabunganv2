export default async function handler(req, res) {
  try {
    if (req.method !== 'PUT') return res.status(405).json({error: 'Method not allowed'});
    const body = req.body || {};
    const r = await fetch(`${process.env.JSONBIN_BASE}/b/${process.env.JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY
      },
      body: JSON.stringify(body)
    });
    const out = await r.json();
    if (!r.ok) return res.status(r.status).json(out);
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({error: e?.message || 'PUT failed'});
  }
}
