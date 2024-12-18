async function updateSuggestedLocations() {
    const response = await fetch("https://sheetdb.io/api/v1/410bj6kkcmkv3");
    const locations = await response.json();

    const source = suggestedLayer.getSource();
    source.clear();
    locations.forEach((loc) => {
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([loc.Longitude, loc.Latitude])),
        });
        source.addFeature(feature);
    });
}

setInterval(updateSuggestedLocations, 60000); // Update every minute
