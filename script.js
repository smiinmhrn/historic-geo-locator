// script.js
// نسخهٔ ویرایش‌شده: کلیک روی نقشه، نشان‌گر و پوپ‌آپ با مختصات، معکوس‌ژئوکوودینگ (Nominatim)
// و جستجوی ویکی‌پدیا بر اساس مختصات برای نمایش خلاصهٔ تاریخی/اطلاعات مکانی.

function onFeatureClick(e) {
  const layer = e.target;
  if (layer.getBounds)
    map.flyToBounds(layer.getBounds(), { duration: 1.5, easeLinearity: 0.5 });
}

var map = L.map("map").setView([32, 53], 6);

// پلاگین پیدا کردن موقعیت کاربر
L.control
  .locate({
    position: "topleft",
    setView: true,
    flyTo: true,
    drawCircle: true,
    showPopup: false,
    strings: {
      title: "نمایش موقعیت من",
    },
  })
  .addTo(map);

// لایهٔ پایه OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

map.on("moveend", function () {
  var center = map.getCenter();
  console.log("Map center latitude:", center.lat, "longitude:", center.lng);
});

var geojsonFeatures = [
  {
    type: "FeatureCollection",
    features: [],
  },
];

async function fetchData() {
  try {
    const response = await fetch("./maps/geojson/shahrestan2.json");
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    geojsonFeatures = { ...data };
  } catch (error) {
    console.error("Error during fetch:", error);
  }
}

var geojsonFeatures2 = [
  {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "seventh point" },
        geometry: {
          coordinates: [51.3735946934878, 35.6401603986822],
          type: "Point",
        },
      },
      {
        type: "Feature",
        properties: { name: "eighth point" },
        geometry: {
          coordinates: [51.30202210653047, 35.709012093627564],
          type: "Point",
        },
      },
    ],
  },
];

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#1c375";
  for (var i = 0; i < 1; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// --- توابع شبکه: معکوس‌ژئوکوودینگ و ویکی‌جستجو ---

async function reverseGeocode(lat, lon) {
  // از Nominatim استفاده می‌کنیم. برای استفادهٔ تولیدی محدودیت‌ها را رعایت کنید.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&accept-language=fa`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MyLeafletApp/1.0 (mailto:you@example.com)" },
    });
    if (!res.ok) throw new Error("Reverse geocode failed");
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function wikiGeoSearch(lat, lon) {
  // ابتدا در ویکی‌پدیای فارسی جستجو می‌کنیم (geosearch)، سپس خلاصهٔ صفحهٔ مربوطه را می‌گیریم.
  const base = "https://fa.wikipedia.org/w/api.php";
  const geosearch = `${base}?action=query&list=geosearch&gsradius=1000&gscoord=${lat}%7C${lon}&gslimit=5&format=json&origin=*`;
  try {
    const r = await fetch(geosearch);
    const j = await r.json();
    if (j && j.query && j.query.geosearch && j.query.geosearch.length > 0) {
      const page = j.query.geosearch[0];
      const extractUrl = `${base}?action=query&pageids=${page.pageid}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
      const exRes = await fetch(extractUrl);
      const exJson = await exRes.json();
      const extract = exJson.query.pages[page.pageid].extract;
      return { title: page.title, extract };
    }
  } catch (err) {
    console.error("wiki fa error:", err);
  }

  // اگر فارسی چیزی پیدا نشد، به انگلیسی نگاه کن
  try {
    const baseEn = "https://en.wikipedia.org/w/api.php";
    const geosearchEn = `${baseEn}?action=query&list=geosearch&gsradius=1000&gscoord=${lat}%7C${lon}&gslimit=5&format=json&origin=*`;
    const r2 = await fetch(geosearchEn);
    const j2 = await r2.json();
    if (j2 && j2.query && j2.query.geosearch && j2.query.geosearch.length > 0) {
      const page = j2.query.geosearch[0];
      const extractUrl = `${baseEn}?action=query&pageids=${page.pageid}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
      const exRes = await fetch(extractUrl);
      const exJson = await exRes.json();
      const extract = exJson.query.pages[page.pageid].extract;
      return { title: page.title, extract };
    }
  } catch (err) {
    console.error("wiki en error:", err);
  }

  return null;
}

// --- هندل کردن کلیک روی نقشه ---

let clickMarker = null;

map.on("click", async function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  // پاک کردن مارکر قبلی
  if (clickMarker) map.removeLayer(clickMarker);

  clickMarker = L.marker([lat, lng]).addTo(map);
  clickMarker.bindPopup("در حال بارگذاری اطلاعات...").openPopup();

  // نمایش مختصات به صورت کوئری عددی
  const coordsHtml = `<b>مختصات:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br/>`;

  // معکوس‌ژئوکوودینگ برای گرفتن آدرس/نام محل
  const rev = await reverseGeocode(lat, lng);
  let addressHtml = "<b>نشانی:</b> نامشخص<br/>";
  if (rev) {
    // نمایش نام شاخص اگر موجود است (مثل university, building, display_name)
    const display = rev.display_name || "";
    addressHtml = `<b>نشانی:</b> ${display}<br/>`;
  }

  // جستجوی ویکی‌پدیا برای یافتن اطلاعات تاریخی/خلاصه
  const wiki = await wikiGeoSearch(lat, lng);
  let wikiHtml = "<b>اطلاعات تاریخی/ویکی:</b> موردی یافت نشد.";
  if (wiki && wiki.extract) {
    const short =
      wiki.extract.length > 600
        ? wiki.extract.slice(0, 600) + "..."
        : wiki.extract;
    wikiHtml = `<b>${wiki.title}</b><br/>${short}`;
  }

  clickMarker
    .setPopupContent(coordsHtml + addressHtml + "<hr/>" + wikiHtml)
    .openPopup();
});

// --- لایه‌های GeoJSON و کلیک روی فیچرها ---

async function loadMapLayers() {
  await fetchData();
  console.log(geojsonFeatures);

  var geojsonLayer1 = L.geoJSON(geojsonFeatures, {
    style: function () {
      return {
        weight: 1,
        fillColor: getRandomColor(),
        fillOpacity: 0.4,
        color: "#0d2e58",
        opacity: 0.7,
      };
    },
    onEachFeature: function (feature, layer) {
      layer.on({
        click: async function (e) {
          // اگر فیچر پلیگون یا لاین است، زوم به آن و اطلاعات را نمایش بده
          try {
            if (layer.getBounds)
              map.flyToBounds(layer.getBounds(), { duration: 1.2 });
          } catch (err) {}

          // اگر ویژگی دارای نام است، از آن برای جستجوی ویکی استفاده کن
          const name =
            (feature.properties &&
              (feature.properties.name || feature.properties.CityName)) ||
            null;
          let content = "اطلاعات مکان موجود نیست.";
          if (name) content = `<b>نام:</b> ${name}<br/>`;

          // اگر فیچر یک نقطه است و دارای مختصات است، می‌توان مستقیماً از آن‌ها استفاده کرد
          if (feature.geometry && feature.geometry.type === "Point") {
            const [lng, lat] = feature.geometry.coordinates;
            const wiki = await wikiGeoSearch(lat, lng);
            if (wiki && wiki.extract)
              content += `<hr/><b>${wiki.title}</b><br/>${wiki.extract.slice(
                0,
                600
              )}...`;
            layer.bindPopup(content).openPopup();
          } else {
            layer.bindPopup(content).openPopup();
            // اگر نام موجود است، سعی کن مختصات تقریبی از مرکز لایه بدست آوری و به ویکی بفرستی
            if (layer.getBounds) {
              const c = layer.getBounds().getCenter();
              const wiki = await wikiGeoSearch(c.lat, c.lng);
              if (wiki && wiki.extract)
                layer
                  .bindPopup(
                    content +
                      `<hr/><b>${wiki.title}</b><br/>${wiki.extract.slice(
                        0,
                        600
                      )}...`
                  )
                  .openPopup();
            }
          }
        },
        mouseover: function (e) {
          layer.setStyle({ weight: 2, fillColor: "blue", fillOpacity: 0.7 });
          geojsonLayer1.eachLayer(function (lay) {
            if (lay !== e.target) {
              lay.setStyle({
                fillColor: "#28549254",
                color: "#303032",
                opacity: 0.7,
              });
            }
          });
        },
        mouseout: function () {
          geojsonLayer1.resetStyle();
        },
      });

      // نمایش تولتیپ در صورت وجود
      if (
        feature.properties &&
        (feature.properties.CityName || feature.properties.name)
      ) {
        layer.bindTooltip(
          feature.properties.CityName || feature.properties.name
        );
      }
    },
    filter: function () {
      return map.getZoom() <= 8;
    },
  }).addTo(map);

  // نقاط کوچک را به صورت مارکر اضافه کن تا قابلیت کلیک و popup بهتر شود
  var points = [];
  if (geojsonFeatures2 && geojsonFeatures2[0] && geojsonFeatures2[0].features) {
    geojsonFeatures2[0].features.forEach(function (f) {
      if (f.geometry && f.geometry.type === "Point") {
        const [lng, lat] = f.geometry.coordinates;
        points.push(
          L.marker([lat, lng])
            .bindTooltip(f.properties.name)
            .on("click", async function () {
              const wiki = await wikiGeoSearch(lat, lng);
              let content = `<b>${
                f.properties.name
              }</b><br/>مختصات: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br/>`;
              if (wiki && wiki.extract)
                content += `<hr/><b>${wiki.title}</b><br/>${wiki.extract.slice(
                  0,
                  600
                )}...`;
              this.bindPopup(content).openPopup();
            })
        );
      }
    });
  }
  var geojsonLayer2 = L.layerGroup(points).addTo(map);

  map.on("zoomend", function () {
    if (map.getZoom() <= 8) {
      if (map.hasLayer(geojsonLayer2)) map.removeLayer(geojsonLayer2);
      if (!map.hasLayer(geojsonLayer1)) map.addLayer(geojsonLayer1);
    } else {
      if (map.hasLayer(geojsonLayer1)) map.removeLayer(geojsonLayer1);
      if (!map.hasLayer(geojsonLayer2)) map.addLayer(geojsonLayer2);
    }
  });

  // مقداردهی اولیه براساس زوم فعلی
  if (map.getZoom() >= 8) map.addLayer(geojsonLayer2);
  else map.addLayer(geojsonLayer1);
}

loadMapLayers();
