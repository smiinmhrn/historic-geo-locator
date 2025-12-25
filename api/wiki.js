// api/wiki.js
export default async function handler(req, res) {
  try {
    const { lat, lon, name } = req.query;
    const headers = {
      "User-Agent": "MyLeafletWikiProxy/1.0 (samin@example.com)",
    };
    const base = "https://fa.wikipedia.org/w/api.php";

    const geoUrl = `${base}?action=query&list=geosearch&gsradius=800&gscoord=${lat}%7C${lon}&gslimit=1&format=json&origin=*`;
    const r = await fetch(geoUrl, { headers });
    const j = await r.json();

    let pageId = j?.query?.geosearch?.[0]?.pageid;

    if (!pageId && name && name !== "undefined") {
      const searchUrl = `${base}?action=query&list=search&srsearch=${encodeURIComponent(
        name
      )}&srlimit=1&format=json&origin=*`;
      const sr = await fetch(searchUrl, { headers });
      const sj = await sr.json();

      if (sj?.query?.search?.length > 0) {
        const tempPageId = sj.query.search[0].pageid;

        const coordCheckUrl = `${base}?action=query&pageids=${tempPageId}&prop=coordinates&format=json&origin=*`;
        const cRes = await fetch(coordCheckUrl);
        const cJson = await cRes.json();
        const coords = cJson.query.pages[tempPageId]?.coordinates?.[0];

        if (coords) {
          const dist = Math.sqrt(
            Math.pow(coords.lat - lat, 2) + Math.pow(coords.lon - lon, 2)
          );
          if (dist < 0.1) {
            pageId = tempPageId;
          }
        } else {
          if (sj.query.search[0].title.includes(name.split(" ")[0])) {
            pageId = tempPageId;
          }
        }
      }
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
