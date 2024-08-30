export const clearMapData = (map) => {
    if (!map) return;

    // Reset datasets
    var datasets = {};  // Asegúrate de que `datasets` es accesible aquí, posiblemente pasándolo como argumento o importándolo

    // Eliminar todas las capas y fuentes
    map.getStyle().layers.forEach(layer => {
        if (layer.id.includes('-boundary') || layer.id.includes('-points')) {
            map.removeLayer(layer.id);
            map.removeSource(layer.source);
        }
    });
};
