// api/reverse.js
export default async function handler(req, res) {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;
    if (!lat || !lon)
      return res.status(400).json({ error: "lat & lon required" });

    // درخواست به Nominatim (سرور ما به‌جای مرورگر درخواست را می‌فرستد)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&accept-language=fa`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "MyLeafletProxy/1.0 (mailto:samin.mhr2004@gmial.com)",
      },
    });
    if (!r.ok) return res.status(502).json({ error: "Upstream failed" });
    const json = await r.json();
    return res.status(200).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}
