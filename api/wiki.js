// api/wiki.js
export default async function handler(req, res) {
  try {
    const { lat, lon, name } = req.query;
    const headers = {
      "User-Agent": "MyLeafletWikiProxy/1.0 (samin@example.com)",
    };
    const base = "https://fa.wikipedia.org/w/api.php";

    let pageId = null;

    if (name && name !== "undefined" && name !== "نامشخص") {
      const searchUrl = `${base}?action=query&list=search&srsearch=${encodeURIComponent(
        name
      )}&format=json&origin=*`;
      const sr = await fetch(searchUrl, { headers });
      const sj = await sr.json();
      if (sj?.query?.search?.length > 0) {
        pageId = sj.query.search[0].pageid;
      }
    }

    if (!pageId) {
      const geoUrl = `${base}?action=query&list=geosearch&gsradius=200&gscoord=${lat}%7C${lon}&gslimit=1&format=json&origin=*`;
      const r = await fetch(geoUrl, { headers });
      const j = await r.json();
      pageId = j?.query?.geosearch?.[0]?.pageid;
    }

    if (pageId) {
      const extractUrl = `${base}?action=query&pageids=${pageId}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
      const exRes = await fetch(extractUrl, { headers });
      const exJson = await exRes.json();
      const page = exJson.query.pages[pageId];
      return res.status(200).json({ title: page.title, extract: page.extract });
    }

    return res.status(200).json({ message: "not found" });
  } catch (err) {
    return res.status(500).json({ error: "server error" });
  }
}
