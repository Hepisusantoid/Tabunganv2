export default async function handler(req, res) {
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`;
  const headers = {
    'X-Master-Key': process.env.JSONBIN_API_KEY,
    'Content-Type': 'application/json'
  };

  try {
    switch (req.method) {
      case 'GET':
        const getResponse = await fetch(JSONBIN_URL + '/latest', { headers });
        const data = await getResponse.json();
        return res.json(data.record || []);

      case 'PUT':
        const putResponse = await fetch(JSONBIN_URL, {
          method: 'PUT',
          headers,
          body: JSON.stringify(req.body)
        });
        
        if (putResponse.ok) {
          return res.json({ success: true });
        } else {
          throw new Error('Failed to update data');
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
