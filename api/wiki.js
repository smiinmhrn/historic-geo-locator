export default async function handler(req, res) {
  try {
    // 1. Get user coordinates and location name from the query string
    const { lat: rawLat, lon: rawLon, name } = req.query;
    const userLat = parseFloat(rawLat);
    const userLon = parseFloat(rawLon);
    const base = "https://fa.wikipedia.org/w/api.php";

    // 2. Normalization function to standardize Persian characters and remove special characters
    // This ensures that "ی" and "ک" variants don't break the search matching
    const simplify = (str) =>
      str
        ?.replace(/[\u200B-\u200D\uFEFF\s]/g, "") // Remove zero-width non-joiners and spaces
        .replace(/ی/g, "ی") // Standardize Persian 'Ye'
        .replace(/ک/g, "ک") // Standardize Persian 'Keh'
        .trim() || "";

    const searchNameSimplified = simplify(name);
    let pageId = null;

    // Perform a text search on Wikipedia to find potential articles
    const srRes = await fetch(
      `${base}?action=query&list=search&srsearch=${encodeURIComponent(
        name
      )}&srlimit=8&format=json&origin=*`
    );
    const sj = await srRes.json();
    const searchResults = sj?.query?.search || [];

    if (searchResults.length > 0) {
      // 3. Coordinate Fetching: Get coordinates for all search results to verify proximity
      const ids = searchResults.map((r) => r.pageid).join("|");
      const coordRes = await fetch(
        `${base}?action=query&pageids=${ids}&prop=coordinates&format=json&origin=*`
      );
      const coordData = await coordRes.json();
      const pagesWithCoords = coordData?.query?.pages || {};

      for (let result of searchResults) {
        const page = pagesWithCoords[result.pageid];

        // 4. Verification Logic (Cross-Referencing)
        if (page && page.coordinates && page.coordinates[0]) {
          const pLat = page.coordinates[0].lat;
          const pLon = page.coordinates[0].lon;

          // Calculate Euclidean distance (approximate 0.05 deg ≈ 5km)
          // This prevents showing historical sites from other cities
          const dist = Math.sqrt(
            Math.pow(pLat - userLat, 2) + Math.pow(pLon - userLon, 2)
          );

          if (dist < 0.05) {
            pageId = result.pageid; // Validated by proximity
            break;
          }
        }
        // 5. Fallback Logic: If no coordinates exist, verify by strict name similarity
        else if (
          simplify(result.title).includes(searchNameSimplified) ||
          searchNameSimplified.includes(simplify(result.title))
        ) {
          // Filter out "Disambiguation" pages (صفحات ابهام‌زدایی)
          if (!result.title.includes("(ابهام‌زدایی)")) {
            pageId = result.pageid;
            break;
          }
        }
      }
    }

    if (pageId) {
      // Fetch the introductory summary (extract) of the validated page
      const exRes = await fetch(
        `${base}?action=query&pageids=${pageId}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`
      );
      const exJson = await exRes.json();
      const page = exJson.query.pages[pageId];

      // Final check: ensure the extract is valid and not a placeholder
      if (
        page &&
        page.extract &&
        page.extract.length > 50 &&
        !page.extract.includes("به یکی از موارد زیر")
      ) {
        return res.status(200).json({
          title: page.title,
          extract: page.extract,
          url: `https://fa.wikipedia.org/wiki/${encodeURIComponent(
            page.title
          )}`,
        });
      }
    }

    // 6. Response if no exact historical match is found near the click location
    return res.status(200).json({
      message: "مورد تاریخی دقیقی در این نزدیکی یافت نشد.",
      error: "NOT_FOUND",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}
