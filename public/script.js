// ---------------------
// تابع ترجمه خودکار انگلیسی → فارسی با LibreTranslate
// ---------------------
// ---------------------
// ترجمه هوشمند: تشخیص سریع و fallback به سرور (که خودش detect میکنه)
// ---------------------
async function translateIfEnglish(text) {
  // تشخیص سریع: نسبت کلمات لاتینِ قابل‌اعتنا یا تعداد حروف لاتین
  function likelyContainsEnglish(t) {
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;

    // کلمه‌ای که حداقل 3 حرف لاتین داشته باشد
    const enWords = words.filter((w) => /[A-Za-z]{3,}/.test(w));
    const enCharCount = (t.match(/[A-Za-z]/g) || []).length;

    // آستانه‌ها — تنظیم‌پذیر
    if (enWords.length / words.length >= 0.15) return true; // نسبت کلمات انگلیسی
    if (enCharCount > 30) return true; // یا تعداد حرف لاتین بیشتر از 30
    // اگر تنها اسم کوتاه انگلیسی (مثل "Yazd") هست و متن فارسی هم داره، بهتره هم ترجمه بشه تا یکدستی ایجاد شود
    return false;
  }

  if (!likelyContainsEnglish(text)) return text;

  // اگر متن مخلوطِ فارسی-انگلیسیه، ما می‌توانیم فقط بخش‌های لاتین را برای ترجمه جدا کنیم:
  // این بخش اختیاریه ولی در متن‌های مخلوط معمولاً نتیجه خواناتری می‌دهد.
  function splitByScript(t) {
    // برش به قطعات: قطعات فارسی/غیرلاتین و قطعات لاتین/نشانه‌گذاری
    const parts = [];
    let cur = "";
    let curIsLatin = null;
    for (const ch of t) {
      const isLatin = /[A-Za-z0-9]/.test(ch);
      if (curIsLatin === null) {
        curIsLatin = isLatin;
        cur = ch;
      } else if (isLatin === curIsLatin) {
        cur += ch;
      } else {
        parts.push({ text: cur, isLatin: curIsLatin });
        cur = ch;
        curIsLatin = isLatin;
      }
    }
    if (cur) parts.push({ text: cur, isLatin: curIsLatin });
    return parts;
  }

  const parts = splitByScript(text);

  // اگر تعداد قطعات لاتین خیلی کم و کوتاهه، فقط یک‌بار کل متن رو بفرست برای سریع بودن
  const totalLatinChars = (text.match(/[A-Za-z]/g) || []).length;
  if (totalLatinChars < 50) {
    // درخواست ساده به سرور — سرور خودش 'auto' detect میکنه (باید سرورو آپدیت کنیم)
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      return data.translated || text;
    } catch (e) {
      console.error("Translation error", e);
      return text;
    }
  }

  // اگر متن طولانی و مخلوطه: فقط قطعات لاتین را ترجمه کن و دوباره سرِ هم کن
  const translatedParts = await Promise.all(
    parts.map(async (p) => {
      if (!p.isLatin) return p.text; // فارسی یا غیرلاتین را دست نزن
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: p.text }),
        });
        const data = await response.json();
        return data.translated || p.text;
      } catch (e) {
        console.error("Segment translation error", e);
        return p.text;
      }
    })
  );

  return translatedParts.join("");
}

// ---------------------
// نقشه اصلی
// ---------------------
var map = L.map("map").setView([32, 53], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// ---------------------
// پلاگین موقعیت کاربر
// ---------------------
let lc = L.control
  .locate({
    position: "topleft",
    setView: false, // نقشه به طور خودکار جا نمی‌ره، درست
    flyTo: true, // وقتی موقعیت پیدا شد، نقشه روی اون پرش کنه
    keepCurrentZoomLevel: false,
    drawCircle: true,
    showPopup: false,
    strings: { title: "نمایش موقعیت من" },
    locateOptions: {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 8000,
      watch: false, // << اضافه شد: فقط یک بار موقعیت رو بگیر
    },
  })
  .addTo(map);

map.on("locationfound", function (e) {
  if (!map._justZoomedToLocation) {
    map.flyTo([e.latitude, e.longitude], 16, { duration: 1.2 });
    map._justZoomedToLocation = true;

    // بعد از 2 ثانیه اجازه بده دوباره دکمه کار کند
    setTimeout(() => {
      map._justZoomedToLocation = false;
    }, 2000);
  }
});

// ---------------------
// داده‌ها و fetch
// ---------------------
var geojsonFeatures = [{ type: "FeatureCollection", features: [] }];

async function fetchData() {
  try {
    const response = await fetch("./maps/geojson/shahrestan2.json");
    if (!response.ok) throw new Error("Network error");
    geojsonFeatures = await response.json();
  } catch (error) {
    console.error("Error during fetch:", error);
  }
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function wikiGeoSearch(lat, lon) {
  try {
    const res = await fetch(`/api/wiki?lat=${lat}&lon=${lon}`);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

// ---------------------
// کلیک روی نقشه و marker
// ---------------------
let clickMarker = null;

map.on("click", async function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  if (clickMarker) map.removeLayer(clickMarker);

  clickMarker = L.marker([lat, lng]).addTo(map);
  clickMarker.bindPopup("در حال بارگذاری اطلاعات...").openPopup();

  clickMarker.on("popupclose", function () {
    map.removeLayer(clickMarker);
    clickMarker = null;
  });

  const coordsHtml = `<b>مختصات:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br/>`;

  // --- Reverse Geocode ---
  const rev = await reverseGeocode(lat, lng);
  let address = rev?.display_name || "نامشخص";
  address = await translateIfEnglish(address);
  let addressHtml = `<b>نشانی:</b> ${address}<br/>`;

  // --- Wikipedia ---
  const wiki = await wikiGeoSearch(lat, lng);
  let wikiHtml = "<b>اطلاعات تاریخی/ویکی:</b> موردی یافت نشد.";

  if (wiki?.extract) {
    let translatedExtract = await translateIfEnglish(wiki.extract);
    const short =
      translatedExtract.length > 600
        ? translatedExtract.slice(0, 600) + "..."
        : translatedExtract;

    wikiHtml = `<b>${await translateIfEnglish(wiki.title)}</b><br/>${short}`;
  }

  clickMarker
    .setPopupContent(coordsHtml + addressHtml + "<hr/>" + wikiHtml)
    .openPopup();
});

// ---------------------
// GeoJSON و Polygon
// ---------------------
function getRandomColor() {
  return "#1c375" + Math.floor(Math.random() * 16).toString(16);
}

var geojsonFeatures2 = [
  {
    type: "FeatureCollection",
    features: [
      // {
      //   type: "Feature",
      //   properties: { name: "seventh point" },
      //   geometry: {
      //     coordinates: [51.3735946934878, 35.6401603986822],
      //     type: "Point",
      //   },
      // },
      // {
      //   type: "Feature",
      //   properties: { name: "eighth point" },
      //   geometry: {
      //     coordinates: [51.30202210653047, 35.709012093627564],
      //     type: "Point",
      //   },
      // },
    ],
  },
];

// ---------------------
// بارگذاری لایه‌ها
// ---------------------
async function loadMapLayers() {
  await fetchData();

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
          L.DomEvent.stopPropagation(e); // جلوگیری از رویداد کلیک نقشه

          const bounds = layer.getBounds();
          map.flyToBounds(bounds, { padding: [20, 20], duration: 1.1 });
        },
      });

      if (feature.properties?.CityName || feature.properties?.name) {
        layer.bindTooltip(
          feature.properties.CityName || feature.properties.name
        );
      }
    },

    filter: function () {
      return map.getZoom() <= 8;
    },
  }).addTo(map);

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

  map.on("zoomend", function () {
    if (map.getZoom() <= 8) {
      map.removeLayer(geojsonLayer2);
      map.addLayer(geojsonLayer1);
    } else {
      map.removeLayer(geojsonLayer1);
      map.addLayer(geojsonLayer2);
    }
  });

  if (map.getZoom() >= 8) map.addLayer(geojsonLayer2);
  else map.addLayer(geojsonLayer1);
}

loadMapLayers();

// ---------------------
// Search Bar
// ---------------------
const citiesByProvince = {
  فارس: ["شیراز", "مرودشت", "کازرون"],
  تهران: ["تهران", "ری", "شهریار"],
  اصفهان: ["اصفهان", "کاشان", "نجف آباد"],
};

const cityCoords = {
  شیراز: [29.5918, 52.5836],
  مرودشت: [29.8761, 52.8083],
  کازرون: [29.6213, 51.6513],
  تهران: [35.6892, 51.389],
  ری: [35.5536, 51.4295],
  شهریار: [35.666, 50.992],
  اصفهان: [32.6525, 51.6776],
  کاشان: [33.985, 51.4231],
  "نجف آباد": [32.6319, 51.4598],
};

const provinceInput = document.getElementById("provinceInput");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const cityDatalist = document.getElementById("cities");

provinceInput.addEventListener("input", function () {
  const province = this.value;
  cityDatalist.innerHTML = "";
  if (citiesByProvince[province]) {
    citiesByProvince[province].forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      cityDatalist.appendChild(option);
    });
  }
});

searchButton.addEventListener("click", async function () {
  lc.stop();

  const city = cityInput.value;
  if (cityCoords[city]) {
    const [lat, lng] = cityCoords[city];
    map.flyTo([lat, lng], 12, { duration: 1.5 });
  } else {
    alert("لطفا یک شهر معتبر انتخاب کنید!");
  }
});
