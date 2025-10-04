export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const { username, password } = req.body || {};
  const ok = username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS;
  if (!ok) return res.status(401).json({ok:false, message:'Login gagal'});
  // Token sederhana (stateless di client) – cukup flag saja untuk kamu
  res.status(200).json({ ok:true });
}
