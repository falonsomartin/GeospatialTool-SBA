/* Written by Ye Liu */

const mapStyles = {
    Satellite:'mapbox://styles/mapbox/satellite-v9',
    Custom:'mapbox://styles/almafe2510/clw7qv6il02ok01qr9w4wdbv0',
    Standard: ''
};

const buildHeatmapStyle = (color) => {
    const heatmap = {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 10, 10, 16, 16],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 10, 19, 19],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 19, 30],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, '#67A9CF', 0.4, '#D1E5F0', 1]
    };

    heatmap['heatmap-color'].push(color);
    return heatmap;
}

const buildPolygonStyle = (color) => {
    console.log(color)
    const polygon = {
        'fill-color': '#f08',
        'fill-opacity': 0.4    
    };

    return polygon;
}

export { mapStyles, buildHeatmapStyle, buildPolygonStyle };