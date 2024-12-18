// Initialize the OpenLayers map
var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM(), // OpenStreetMap as base layer
        }),
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([51.3890, 35.6892]), 
        zoom: 12
    }),
    controls : ol.control.defaults().extend([
        new ol.control.ZoomSlider(),
        new ol.control.ScaleLine(),
        new ol.control.FullScreen(),
        new ol.control.OverviewMap(),
        new ol.control.Rotate(),
        new ol.control.Attribution(),
        new ol.control.Zoom(),
        new ol.control.ZoomToExtent(), 
    ])  
});

    // Create a vector layer for user-suggested points
    const userLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({ color: 'red' }),
                stroke: new ol.style.Stroke({ color: 'white', width: 2 }),
            }),
        }),
    });
    map.addLayer(userLayer);

    // Add event listener for map clicks
    map.on('singleclick', (event) => {
        const coordinates = ol.proj.toLonLat(event.coordinate);
        const lon = coordinates[0].toFixed(6);
        const lat = coordinates[1].toFixed(6);

        // Add a marker at the clicked location
        const userPoint = new ol.Feature({
            geometry: new ol.geom.Point(event.coordinate),
        });
        userLayer.getSource().addFeature(userPoint);

        // Display the coordinates
        alert(`Location Suggested:\nLongitude: ${lon}\nLatitude: ${lat}`);

        // Send data to Google Sheets or other storage
        submitCoordinates(lon, lat);
    });

    // Function to send coordinates to Google Sheets
    async function submitCoordinates(lon, lat) {
        const url = "https://sheetdb.io/api/v1/410bj6kkcmkv3";
        const data = { Longitude: lon, Latitude: lat };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                console.log("Coordinates submitted successfully.");
            } else {
                console.error("Error submitting coordinates.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
