export default async function handler(req, res) {
  try {
    // 1. Extract latitude and longitude from the request query parameters
    const lat = req.query.lat;
    const lon = req.query.lon;

    // 2. Validate input: Return 400 Bad Request if coordinates are missing
    if (!lat || !lon)
      return res.status(400).json({ error: "lat & lon required" });

    // 3. Construct the Nominatim API URL for Reverse Geocoding
    // format=jsonv2: returns a detailed JSON response
    // accept-language=fa: requests the address details in Persian
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&accept-language=fa`;

    // 4. Perform the fetch request to the OpenStreetMap (Nominatim) server
    // User-Agent is mandatory per Nominatim's Usage Policy to identify the application
    const r = await fetch(url, {
      headers: {
        "User-Agent": "MyLeafletProxy/1.0 (mailto:samin.mhr2004@gmial.com)",
      },
    });

    // 5. Check if the upstream server responded successfully (status 200-299)
    if (!r.ok) return res.status(502).json({ error: "Upstream failed" });

    // 6. Parse and return the location data as a JSON response
    const json = await r.json();
    return res.status(200).json(json);
  } catch (err) {
    // 7. Error handling for server-side failures (e.g., network issues)
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}
