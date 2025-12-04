document.addEventListener("DOMContentLoaded", function () {
    var map = L.map("map").setView([0, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Load and display the shapefile
    const geojson1 = [];
    fetch("./maps/Iran_Shapefiles/Ostan.shp")
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => {
            shapefile.open(arrayBuffer).then((source) => {
                source.read().then(function log(result) {
                    if (result.done) return;
                    geojson1.push(result.value);
                    L.geoJSON(result.value).addTo(map);
                    return source.read().then(log);
                });
            });
        })
        .then(() => {
            console.log(geojson1);
        });

    // fetch("./maps/IRN_adm0.shp")
    //     .then((response) => response.arrayBuffer())
    //     .then((arrayBuffer) => {
    //         shapefile.open(arrayBuffer).then((source) => {
    //             source.read().then(function log(result) {
    //                 if (result.done) return;
    //                 var properties = result.value.properties;
    //                 var label =
    //                     properties && properties.name
    //                         ? properties.name
    //                         : "Unnamed Place";
    //                 L.marker([
    //                     result.value.geometry.coordinates[1],
    //                     result.value.geometry.coordinates[0],
    //                 ])
    //                     .addTo(map)
    //                     .bindPopup(label)
    //                     .openPopup();
    //                 return source.read().then(log);
    //             });
    //         });
    //     });
});
