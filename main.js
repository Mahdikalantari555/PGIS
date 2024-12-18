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

    // Function to fetch and display data from Google Sheets
    async function fetchCoordinates() {
        const url = "https://sheetdb.io/api/v1/410bj6kkcmkv3";

        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();

                // Add points from Google Sheets to the map
                data.forEach((row) => {
                    if (row.Longitude && row.Latitude) {
                        const lon = parseFloat(row.Longitude);
                        const lat = parseFloat(row.Latitude);
                        const coordinate = ol.proj.fromLonLat([lon, lat]);

                        const feature = new ol.Feature({
                            geometry: new ol.geom.Point(coordinate),
                        });
                        userLayer.getSource().addFeature(feature);
                    }
                });
                console.log("Coordinates fetched and displayed.");
            } else {
                console.error("Error fetching coordinates.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // Fetch coordinates when the map loads
    fetchCoordinates();



    // Predefined allowed locations (example coordinates)
const allowedLocations = [
    { name: "Park A", coordinates: [51.395, 35.711] },
    { name: "Park B", coordinates: [51.4063, 35.7002] },
];

// Create features for the allowed locations
const allowedLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: allowedLocations.map(loc => {
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(loc.coordinates)),
                name: loc.name,
            });
            return feature;
        }),
    }),
    style: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: 'blue' }),
            stroke: new ol.style.Stroke({ color: 'white', width: 2 }),
        }),
    }),
});
map.addLayer(allowedLayer);

// Allow suggestions only for these predefined locations
map.on('singleclick', (event) => {
    let clickedFeature = null;

    // Check if the clicked feature belongs to allowedLayer
    map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (layer === allowedLayer) {
            clickedFeature = feature;
        }
    });

    if (clickedFeature) {
        const coordinates = ol.proj.toLonLat(
            clickedFeature.getGeometry().getCoordinates()
        );
        alert(`You selected: ${clickedFeature.get('name')}`);
        submitCoordinates(coordinates[0].toFixed(6), coordinates[1].toFixed(6));
    } else {
        alert("You can only suggest from predefined locations.");
    }
});

    
    // Create a button to clear the map
    const clearButton = document.createElement('button');
    clearButton.innerHTML = 'Clear Map';
    clearButton.onclick = () => {
        userLayer.getSource().clear(); // Clear user-suggested points
    };
    document.getElementById('map').appendChild(clearButton);

    const popup = new ol.Overlay({
        element: document.getElementById('popup'),
        positioning: 'bottom-center',
        stopEvent: false,
        offset: [0, -10],
    });
    map.addOverlay(popup);
    
    map.on('singleclick', (event) => {
        map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
            if (layer === allowedLayer) {
                const coordinates = feature.getGeometry().getCoordinates();
                const name = feature.get('name');
                popup.setPosition(coordinates);
                document.getElementById('popup-content').innerHTML = `Selected: ${name}`;
            }
        });
    });

    map.on('pointermove', (event) => {
        map.getTargetElement().style.cursor = '';
        map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
            if (layer === allowedLayer) {
                map.getTargetElement().style.cursor = 'pointer';
            }
        });
    });
