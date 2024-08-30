/* Written by Ye Liu */

// Mapbox-GL library access token
const ACCESS_TOKEN = 'pk.eyJ1IjoiYWxtYWZlMjUxMCIsImEiOiJjbGdxandyNTcwcjAyM2htcms4d2p0bjdsIn0.CHmWlpKySeT-H08_G7a5gw';

// Server host URL
const API_ROOT = 'http://localhost:9000/api/v1';

const SERVICE = {
    // User login interface
    login: {
        url: `${API_ROOT}/users`,
        method: 'POST'
    },

    // User logout interface
    logout: {
        url: `${API_ROOT}/logout`,
        method: 'POST'
    },

    // Dataset fetching interface
    getDataset: {
        url: `${API_ROOT}/getDataset`,
        method: 'GET'
    },

    // Spatial query interface
    search: {
        url: `${API_ROOT}/search`,
        method: 'GET'
    },

    // Insert spatial object interface
    insert: {
        url: `${API_ROOT}/insert`,
        method: 'POST'
    },

    // Update spatial object interface
    update: {
        url: `${API_ROOT}/update`,
        method: 'POST'
    },

    // Delete spatial object interface
    delete: {
        url: `${API_ROOT}/delete`,
        method: 'POST'
    }
}

export { ACCESS_TOKEN, SERVICE };
