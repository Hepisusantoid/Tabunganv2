export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
    const r = await fetch(`${process.env.JSONBIN_BASE}/b/${process.env.JSONBIN_BIN_ID}`, {
      headers: { 'X-Master-Key': process.env.JSONBIN_MASTER_KEY }
    });
    const json = await r.json();
    // JSONBin v3: { record: {...}, metadata: {...} }
    const data = json?.record || { nasabah: [] };
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({error: e?.message || 'GET failed'});
  }
}
