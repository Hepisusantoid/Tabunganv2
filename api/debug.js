export default async function handler(req, res) {
  const base = process.env.JSONBIN_BASE || null;
  const bin  = process.env.JSONBIN_BIN_ID || null;
  const hasKey = Boolean(process.env.JSONBIN_MASTER_KEY && process.env.JSONBIN_MASTER_KEY.length > 5);

  // Jangan bocorkan secret; cukup statusnya
  const url = base && bin ? `${base}/b/${bin}/latest` : null;

  res.status(200).json({
    env: {
      JSONBIN_BASE: !!base,
      JSONBIN_BIN_ID: !!bin ? (bin.length + ' chars') : false,
      JSONBIN_MASTER_KEY: hasKey
    },
    composed_url: url,
    note: "Kalau ada false berarti ENV belum kebaca di deploy yang ini (cek Production & redeploy)."
  });
}
