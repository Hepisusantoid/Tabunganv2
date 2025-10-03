export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    console.log('Login attempt for user:', username);
    console.log('Expected username:', process.env.ADMIN_USERNAME);

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username dan password harus diisi' 
      });
    }

    // Validasi login
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      console.log('Login successful');
      return res.json({ success: true });
    } else {
      console.log('Login failed - invalid credentials');
      return res.json({ 
        success: false, 
        error: 'Username atau password salah' 
      });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Terjadi kesalahan server' 
    });
  }
}
