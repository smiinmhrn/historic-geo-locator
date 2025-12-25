import { translateIfEnglish, getRandomColor } from "./utils.js";
import { fetchData, reverseGeocode, wikiGeoSearch } from "./api.js";
import { citiesByProvince, cityCoords } from "./config.js";

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

  try {
    const rev = await reverseGeocode(lat, lng);

    let address = rev?.display_name || "نامشخص";

    const addressObj = rev?.address;
    const placeName =
      addressObj?.historic ||
      addressObj?.tourism ||
      addressObj?.bridge ||
      addressObj?.monument ||
      addressObj?.amenity ||
      address.split(",")[0];

    console.log("Searching Wiki for:", placeName); 
    const wiki = await wikiGeoSearch(lat, lng, placeName);

    const coordsHtml = `<b>مختصات:</b> ${lat.toFixed(6)}, ${lng.toFixed(
      6
    )}<br/>`;

    const translatedAddress = await translateIfEnglish(address);
    const addressHtml = `<b>نشانی:</b> ${translatedAddress}<br/>`;

    let wikiHtml = "<b>اطلاعات تاریخی/ویکی:</b> موردی یافت نشد.";
    if (wiki?.extract) {
      let translatedExtract = await translateIfEnglish(wiki.extract);
      const short =
        translatedExtract.length > 600
          ? translatedExtract.slice(0, 600) + "..."
          : translatedExtract;

      const translatedTitle = await translateIfEnglish(wiki.title);
      wikiHtml = `<b>${translatedTitle}</b><br/>${short}`;
    }

    clickMarker.setPopupContent(coordsHtml + addressHtml + "<hr/>" + wikiHtml);
  } catch (error) {
    console.error("Error in click handler:", error);
    clickMarker.setPopupContent("خطا در دریافت اطلاعات.");
  }
});

async function loadMapLayers() {
  const geojsonFeatures = await fetchData();
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
