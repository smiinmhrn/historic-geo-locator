// api.js
export async function fetchData() {
  try {
    const response = await fetch("./maps/geojson/shahrestan2.json");
    if (!response.ok) throw new Error("Network error");
    return await response.json();
  } catch (error) {
    console.error("Error during fetch:", error);
    return { type: "FeatureCollection", features: [] };
  }
}

export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function wikiGeoSearch(lat, lon, name = "") {
  try {
    const res = await fetch(
      `/api/wiki?lat=${lat}&lon=${lon}&name=${encodeURIComponent(name)}`
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}
