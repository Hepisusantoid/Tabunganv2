export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Log untuk debug (hati-hati, jangan log password di production)
  console.log('Login attempt:', username);

  // Validasi login sederhana - bisa diganti dengan sistem yang lebih aman
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    console.log('Login success');
    return res.json({ success: true });
  } else {
    console.log('Login failed');
    return res.json({ success: false });
  }
}
