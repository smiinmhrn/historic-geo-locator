export async function fetchData() {
  try {
    // 1. Request the local GeoJSON file containing district shapes
    const response = await fetch("./maps/geojson/shahrestan2.json");

    // 2. Error handling: throw an error if the file is missing or inaccessible
    if (!response.ok) throw new Error("Network error while fetching GeoJSON");

    // 3. Parse and return the map data
    return await response.json();
  } catch (error) {
    // 4. Fallback: Return an empty FeatureCollection to prevent the map from crashing
    console.error("Error during fetch:", error);
    return { type: "FeatureCollection", features: [] };
  }
}

export async function reverseGeocode(lat, lon) {
  try {
    // 5. Fetch location details based on the user's click point
    const res = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`);

    // 6. Return JSON data if successful, otherwise return null
    return res.ok ? res.json() : null;
  } catch (error) {
    // 7. Silent failure: return null if the network request fails
    return null;
  }
}

export async function wikiGeoSearch(lat, lon, name = "") {
  try {
    // 8. Call the internal /api/wiki endpoint with coordinates and the place name
    // encodeURIComponent ensures the name is safe for the URL (handles spaces/special chars)
    const res = await fetch(
      `/api/wiki?lat=${lat}&lon=${lon}&name=${encodeURIComponent(name)}`
    );

    // 9. Return the Wikipedia extract and metadata if found
    return res.ok ? res.json() : null;
  } catch (error) {
    // 10. Fallback: return null so the UI can show a "Not Found" message
    return null;
  }
}