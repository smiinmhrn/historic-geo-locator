import { translateIfEnglish, getRandomColor } from "./utils.js";
import { fetchData, reverseGeocode, wikiGeoSearch } from "./api.js";
import { citiesByProvince, cityCoords } from "./config.js";
import { specialPlaces } from "./specialPlaces.js";
import { pointInPolygon } from "./geoUtils.js";

// 1. Map Initialization: Center the view on Iran [lat, lon] with zoom level 6
var map = L.map("map").setView([32, 53], 6);

// 2. Base Layer: Load OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// 3. Location Control: Configure the "Show My Location" button (GPS)
let lc = L.control
  .locate({
    position: "topleft",
    setView: false,
    flyTo: true,
    keepCurrentZoomLevel: false,
    drawCircle: true,
    showPopup: false,
    strings: { title: "نمایش موقعیت من" },
    locateOptions: {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 8000,
      watch: false,
    },
  })
  .addTo(map);

// Smooth transition when user's location is detected
map.on("locationfound", function (e) {
  if (!map._justZoomedToLocation) {
    map.flyTo([e.latitude, e.longitude], 16, { duration: 1.2 });
    map._justZoomedToLocation = true;
    setTimeout(() => {
      map._justZoomedToLocation = false;
    }, 2000);
  }
});

let clickMarker = null;

// 4. MAP CLICK EVENT: The core logic for fetching historical data
map.on("click", async function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  // Manage Marker: Remove previous marker and add a new one at the click location
  if (clickMarker) map.removeLayer(clickMarker);
  clickMarker = L.marker([lat, lng]).addTo(map);
  clickMarker.bindPopup("در حال بارگذاری اطلاعات...").openPopup();

  // Cleanup: Remove marker from map when the popup is closed
  clickMarker.on("popupclose", function () {
    map.removeLayer(clickMarker);
    clickMarker = null;
  });

  console.log(`--- [Client] شروع عملیات برای مختصات: ${lat}, ${lng} ---`);

  try {
    let detectedPlace = null;

    for (const place of specialPlaces) {
      const centerLat = place.polygon[0][0];
      const centerLng = place.polygon[0][1];

      const distance = map.distance(e.latlng, [centerLat, centerLng]);

      console.log(
        "[DEBUG]",
        place.name,
        "Distance:",
        distance.toFixed(0),
        "meters"
      );

      if (distance < 350) {
        detectedPlace = place;
        break;
      }
    }

    if (detectedPlace) {
      console.log("[Client] مکان خاص تشخیص داده شد:", detectedPlace.name);
    }

    // Step A: Fetch Address Details using Reverse Geocoding
    const rev = await reverseGeocode(lat, lng);
    console.log("[Client] پاسخ کامل Reverse Geocode:", rev);

    let address = rev?.display_name || "نامشخص";
    const addressObj = rev?.address;

    // Step B: Smart Name Extraction - Prioritize specific tags (historic, tourism, etc.)
    let placeName = null;

    if (detectedPlace) {
      placeName = detectedPlace.wikiName;
    } else {
      placeName =
        addressObj?.historic ||
        addressObj?.tourism ||
        addressObj?.monument ||
        addressObj?.fort ||
        addressObj?.castle ||
        addressObj?.bridge ||
        addressObj?.amenity;

      if (!placeName) {
        const firstPart = address.split(",")[0].trim();
        const forbidden = [
          "خیابان",
          "کوچه",
          "بزرگراه",
          "منطقه",
          "استان",
          "شهرستان",
          "بخش",
        ];

        if (!forbidden.some((w) => firstPart.includes(w))) {
          placeName = firstPart;
        }
      }
    }

    console.log(
      `[Client] نام نهایی استخراج شده برای جستجو: "${
        placeName || "فقط مختصات"
      }"`
    );

    // Step C: Call Wikipedia API with coordinates and the extracted place name
    const wiki = await wikiGeoSearch(lat, lng, placeName || "");
    console.log("[Client] پاسخ خام دریافت شده از بک‌اِند (wiki.js):", wiki);

    // Step D: Translation and Popup Content Preparation
    const coordsHtml = `<b>مختصات:</b> ${lat.toFixed(6)}, ${lng.toFixed(
      6
    )}<br/>`;

    console.log("[Client] در حال ارسال آدرس برای ترجمه...");
    const translatedAddress = await translateIfEnglish(address);
    const addressHtml = `<b>نشانی:</b> ${translatedAddress}<br/>`;

    let wikiHtml =
      "<b>اطلاعات تاریخی:</b> در این نقطه مورد ثبت شده‌ای یافت نشد.";

    if (wiki && (wiki.extract || wiki.title)) {
      console.log("[Client] دیتای ویکی یافت شد. در حال ترجمه محتوای ویکی...");

      // Translate the Wiki Title and Extract (Summary)
      let translatedTitle = wiki.title
        ? await translateIfEnglish(wiki.title)
        : "بدون عنوان";
      let translatedExtract = wiki.extract
        ? await translateIfEnglish(wiki.extract)
        : "";

      console.log(`[Client] عنوان پس از ترجمه: ${translatedTitle}`);

      // Character Limit: Truncate long texts for better UI
      const short =
        translatedExtract.length > 600
          ? translatedExtract.slice(0, 600) + "..."
          : translatedExtract;

      wikiHtml = `<b style="color: #b52b2b;">🏛️ ${translatedTitle}</b><br/>${short}`;

      if (wiki.url) {
        wikiHtml += `<br/><a href="${wiki.url}" target="_blank" style="font-size: 11px; color: blue;">ادامه در ویکی‌پدیا</a>`;
      }
    } else {
      console.warn("[Client] دیتای معتبری از ویکی دریافت نشد یا خالی بود.");
    }

    // Step E: Update the Popup with combined information
    clickMarker.setPopupContent(coordsHtml + addressHtml + "<hr/>" + wikiHtml);
    console.log("--- [Client] پایان موفقیت‌آمیز عملیات ---");
  } catch (error) {
    console.error("[Client] خطا در هندلر کلیک:", error);
    clickMarker.setPopupContent(
      "خطا در دریافت اطلاعات. لطفا دوباره تلاش کنید."
    );
  }
});

// 5. MAP LAYERS: Loading administrative boundaries and zoom-level logic
async function loadMapLayers() {
  // Fetch GeoJSON for districts (Shahrestans)
  const geojsonFeatures = await fetchData();

  // Layer 1: District Polygons
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
        mouseover: function () {
          layer.setStyle({ weight: 2, fillColor: "blue", fillOpacity: 0.7 });
        },
        mouseout: function () {
          geojsonLayer1.resetStyle();
        },
        click: function (e) {
          L.DomEvent.stopPropagation(e);
          const bounds = layer.getBounds();
          map.flyToBounds(bounds, { padding: [20, 20], duration: 1.1 });
        },
      });
      // Show Tooltip with city/district name on hover
      if (feature.properties?.CityName || feature.properties?.name) {
        layer.bindTooltip(
          feature.properties.CityName || feature.properties.name
        );
      }
    },
    // Only show polygons when zoom is 8 or lower
    filter: function () {
      return map.getZoom() <= 8;
    },
  }).addTo(map);

  // Layer 2: Specific Point Markers (Initial collection is empty)
  var geojsonFeatures2 = [{ type: "FeatureCollection", features: [] }];
  var points = [];
  geojsonFeatures2[0].features.forEach(function (f) {
    if (f.geometry?.type === "Point") {
      const [lng, lat] = f.geometry.coordinates;
      points.push(
        L.marker([lat, lng])
          .bindTooltip(f.properties.name)
          .on("click", async function () {
            const wiki = await wikiGeoSearch(lat, lng);
            let content = `<b>${
              f.properties.name
            }</b><br/>مختصات: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br/>`;
            if (wiki?.extract) {
              let extract = await translateIfEnglish(wiki.extract);
              content += `<hr/><b>${await translateIfEnglish(
                wiki.title
              )}</b><br/>${extract.slice(0, 600)}...`;
            }
            this.bindPopup(content).openPopup();
          })
      );
    }
  });

  var geojsonLayer2 = L.layerGroup(points).addTo(map);

  // 6. ZOOM SWITCH: Toggle layers based on zoom level for better performance/visibility
  map.on("zoomend", function () {
    if (map.getZoom() <= 8) {
      map.removeLayer(geojsonLayer2);
      map.addLayer(geojsonLayer1);
    } else {
      map.removeLayer(geojsonLayer1);
      map.addLayer(geojsonLayer2);
    }
  });

  // Initial layer state check
  if (map.getZoom() >= 8) map.addLayer(geojsonLayer2);
  else map.addLayer(geojsonLayer1);
}

loadMapLayers();

// 7. SEARCH UI: Province and City selection logic
const provinceInput = document.getElementById("provinceInput");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const cityDatalist = document.getElementById("cities");

// Dynamic dropdown update for cities based on selected province
function updateCityList(province) {
  cityDatalist.innerHTML = "";
  if (citiesByProvince[province]) {
    citiesByProvince[province].forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      cityDatalist.appendChild(option);
    });
  }
}

provinceInput.addEventListener("change", function () {
  cityInput.value = "";
  updateCityList(this.value);
});

cityInput.addEventListener("focus", function () {
  updateCityList(provinceInput.value);
});

// Navigation: Fly to the selected city coordinates
searchButton.addEventListener("click", async function () {
  lc.stop(); // Stop current geolocation tracking
  const city = cityInput.value;
  if (cityCoords[city]) {
    const [lat, lng] = cityCoords[city];
    map.flyTo([lat, lng], 12, { duration: 1.5 });
  } else {
    alert("لطفا یک شهر معتبر از لیست انتخاب کنید!");
  }
});
