// api/wiki.js
export default async function handler(req, res) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon)
      return res.status(400).json({ error: "lat & lon required" });

    const headers = {
      "User-Agent": "MyLeafletWikiProxy/1.0 (mailto:samin.mhr2004@gmial.com)",
    };

    // ==== FA WIKIPEDIA ====
    const base = "https://fa.wikipedia.org/w/api.php";
    const geosearch = `${base}?action=query&list=geosearch&gsradius=1000&gscoord=${encodeURIComponent(
      lat
    )}%7C${encodeURIComponent(lon)}&gslimit=5&format=json&origin=*`;

    const r = await fetch(geosearch, { headers });
    const j = await r.json();

    if (j?.query?.geosearch?.length > 0) {
      const page = j.query.geosearch[0];
      const extractUrl = `${base}?action=query&pageids=${page.pageid}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
      const exRes = await fetch(extractUrl, { headers });
      const exJson = await exRes.json();
      const extract = exJson.query.pages[page.pageid].extract;

      return res.status(200).json({ title: page.title, extract });
    }

    // ==== EN WIKIPEDIA fallback ====
    const baseEn = "https://en.wikipedia.org/w/api.php";
    const geosearchEn = `${baseEn}?action=query&list=geosearch&gsradius=1000&gscoord=${encodeURIComponent(
      lat
    )}%7C${encodeURIComponent(lon)}&gslimit=5&format=json&origin=*`;

    const r2 = await fetch(geosearchEn, { headers });
    const j2 = await r2.json();

    if (j2?.query?.geosearch?.length > 0) {
      const page = j2.query.geosearch[0];
      const extractUrl = `${baseEn}?action=query&pageids=${page.pageid}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
      const exRes = await fetch(extractUrl, { headers });
      const exJson = await exRes.json();
      const extract = exJson.query.pages[page.pageid].extract;

      return res.status(200).json({ title: page.title, extract });
    }

    return res.status(200).json({ message: "not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}
