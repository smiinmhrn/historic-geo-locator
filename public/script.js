async function translateIfEnglish(text) {
  function likelyContainsEnglish(t) {
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;

    const enWords = words.filter((w) => /[A-Za-z]{3,}/.test(w));
    const enCharCount = (t.match(/[A-Za-z]/g) || []).length;

    if (enWords.length / words.length >= 0.15) return true;
    if (enCharCount > 30) return true;
    return false;
  }

  if (!likelyContainsEnglish(text)) return text;

  function splitByScript(t) {
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

  const totalLatinChars = (text.match(/[A-Za-z]/g) || []).length;
  if (totalLatinChars < 50) {
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

  const translatedParts = await Promise.all(
    parts.map(async (p) => {
      if (!p.isLatin) return p.text;
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

var map = L.map("map").setView([32, 53], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

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

map.on("locationfound", function (e) {
  if (!map._justZoomedToLocation) {
    map.flyTo([e.latitude, e.longitude], 16, { duration: 1.2 });
    map._justZoomedToLocation = true;

    setTimeout(() => {
      map._justZoomedToLocation = false;
    }, 2000);
  }
});

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

  const rev = await reverseGeocode(lat, lng);
  let address = rev?.display_name || "نامشخص";
  address = await translateIfEnglish(address);
  let addressHtml = `<b>نشانی:</b> ${address}<br/>`;

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

function getRandomColor() {
  return "#1c375" + Math.floor(Math.random() * 16).toString(16);
}

var geojsonFeatures2 = [
  {
    type: "FeatureCollection",
    features: [],
  },
];

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
          L.DomEvent.stopPropagation(e);
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
