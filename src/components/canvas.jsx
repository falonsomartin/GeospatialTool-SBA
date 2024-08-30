import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import MapboxTraffic from '@mapbox/mapbox-gl-traffic';
import mapboxgl from 'mapbox-gl';
import React from 'react';


import geocoder from '@plugins/geocoder.plugin';
import marker from '@plugins/marker.plugin';
import Minimap from '@plugins/minimap.plugin';

import { ACCESS_TOKEN } from '@/config';
import '@styles/map.style.css';
import emitter from '@utils/events.utils';
import { mapStyles } from '@utils/map.utils';

const styles = {
    root: {
        width: '100%',
        position: 'fixed',
        top: 64,
        bottom: 0
    }
};

class Canvas extends React.Component {
    constructor(props) {
        super(props);
        this.mapContainer = React.createRef();
        this.state = {
            map: null,
            draw: null,
            minimap: null,
            popup: null,
            gettingPoint: null,
            tempId: null,
            styleCode: Object.values(mapStyles)[0].substring(16)
        }    
    }
    
    flyToGeometry(map, geometry) {
        const type = geometry.type;
        let coordinates;
    
        if (type === 'FeatureCollection') {
            // Si es una colección de características, toma la primera característica
            const firstFeature = geometry.features[0];
            console.log(firstFeature)
            coordinates = firstFeature.geometry.coordinates;

        } else if (type === 'Feature') {
            coordinates = geometry.geometry.coordinates;
        } else {
            // Asume que es una estructura GeoJSON directa
            coordinates = geometry.coordinates;
        }
    
        // Ajuste en base al tipo de geometría
        if (geometry.features[0].geometry.type === 'Polygon') {
            // Usa el primer conjunto de coordenadas del primer polígono
            console.log(coordinates)
            this.state.map.flyTo({
                center: coordinates[0][0], // Coordenadas del primer punto del polígono
                zoom: 15 // Ajusta según necesidades
            });
        } else if (geometry.features[0].geometry.type === 'Point') {
            // Vuela directamente al punto
            this.state.map.flyTo({
                center: coordinates,
                zoom: 17 // Ajusta según necesidades
            });
        }
    }    

    removeTempLayer = () => {
        // Remove layers
        const layers = this.state.map.getStyle().layers;
        console.log(layers)
        this.setState({
            map: null
        })
        layers.map(layer => {
            if (layer.id === 'custom-temp-point') {
                this.state.map.removeLayer('custom-temp-point');
                this.state.map.removeSource('custom-temp-point');
            }
            return true;
        });

        // Remove popup
        if (this.state.popup.isOpen()) {
            this.state.popup.remove();
        }
    }

    removeAllLayer = () => {
        // Remove layers
        const layers = this.state.map.getStyle().layers;

        layers.map(layer => {
            if (layer.id.includes('-points')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }

            return true;
        });

        layers.map(layer => {
            if (layer.id.includes('-boundary')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }

            return true;
        });

        // Remove popup
        if (this.state.popup.isOpen()) {
            this.state.popup.remove();
        }

        emitter.emit('handleDatasetRemove');
    }

    add3dLayer = () => {
        var layers = this.state.map.getStyle().layers;
        for (var layer in layers) {
            if (layer.type === 'symbol' && layer.layout['text-field']) {
                var labelLayerId = layer.id;
                break;
            }
        }

        if (this.state.map.getLayer('3d-buildings')) {
            this.state.map.moveLayer('3d-buildings', labelLayerId);
            return;
        }

        this.state.map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 12,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "height"]
                ],
                'fill-extrusion-base': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "min_height"]
                ],
                'fill-extrusion-opacity': .6
            }
        }, labelLayerId);
    }

    removeTempPoint = () => {
        this.state.draw.delete(this.state.tempId);
        this.setState({
            tempId: null
        });
    }

    componentDidMount() {
        // Verify access token
        mapboxgl.accessToken = ACCESS_TOKEN;

        // Check for browser support
        if (!mapboxgl.supported()) {
            alert('Your browser does not support Mapbox GL');
            return;
        }

        // Initialize map object
        const map = new mapboxgl.Map({
            container: this.mapContainer.current,
            style: Object.values(mapStyles)[1],
            center: [-6.002481, 37.377469],
            zoom: 17,
            antialias: true
        });
        // Initialize map draw plugin
        const draw = new MapboxDraw({
            controls: {
                combine_features: false,
                uncombine_features: false
            }
        });

        // Add map controls
        const minimap = new Minimap({
            center: map.getCenter()
        });

        map.addControl(new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            localGeocoder: geocoder,
            placeholder: 'Search Address',
            marker: {
                color: 'red'
            }
        }), 'top-left');
        map.addControl(new mapboxgl.NavigationControl(), 'top-left');
        map.addControl(new mapboxgl.GeolocateControl(), 'top-left');
        map.addControl(new MapboxTraffic({
            trafficSource: new RegExp('/*/')
        }), 'top-left');
        map.addControl(draw, 'top-left');
        map.addControl(minimap, 'bottom-left');

        // Initialize popup
        const popup = new mapboxgl.Popup({
            closeButton: false,
            anchor: 'bottom'
        }).setHTML('<div id="popup-container"></div>');

        // Cover search box style
        document.getElementsByClassName('mapboxgl-ctrl-geocoder--input')[0].setAttribute('type', 'search-box');

        // Bind event listeners
        map.on('load', () => {
            this.add3dLayer();
            // Hide loader
            document.getElementById('loader-wrapper').classList.add('loaded');        
            
        });
        

        map.on('click', (event) => {
            const { lng, lat } = event.lngLat;
            console.log(`Longitude: ${lng}, Latitude: ${lat}`); // Muestra en consola o procesa según necesites
        });

        // Suponiendo que 'map' es tu objeto Mapbox
        map.on('zoomend', function() {
            var zoomLevel = map.getZoom();
            emitter.emit('setMapZoom', zoomLevel);

            // Haz algo con el nivel de zoom, como actualizar la UI o hacer una nueva consulta a tu base de datos
        });

  
        map.on('draw.create', e => {
            if (!this.state.gettingPoint) {
                return;
            }

            // Save temp id
            this.setState({
                tempId: e.features[0].id
            });

            // Set point
            emitter.emit('setPoint', e.features[0], this.state.styleCode, this.state.map.getZoom());

            // Reset state
            this.setState({
                gettingPoint: false
            })
        });
        

        this.fetchData();

        this.setMapStyleListener = emitter.addListener('setMapStyle', e => {
            // Remove last popup
            if (this.state.popup.isOpen()) {
                this.state.popup.remove();
            }

            // Set main map style
            this.state.map.setStyle(mapStyles[e]);

            // Set minimap style
            const minimap = new Minimap({
                center: this.state.map.getCenter(),
                style: Object.values(mapStyles)[1]
            });
            this.state.map.removeControl(this.state.minimap);
            this.state.map.addControl(minimap, 'bottom-left');
            this.setState({
                minimap: minimap,
                styleCode: mapStyles[e].substring(16)
            });

            
        });

        this.displayDatasetListener = emitter.addListener('displayDataset', (id, geometry) => {

            if (this.state.map.getSource(id)) {
                this.state.map.removeSource(id);
            }
             
            map.addSource(id, {
                'type': 'geojson',
                'data': geometry
            });

            map.addLayer({
                'id': id + '-boundary', // Se utiliza el id proporcionado para generar un identificador único para la capa
                'type': 'fill',
                'source': id,
                'paint': {
                    'fill-color': '#888888',
                    'fill-opacity': 0.4
                },
                'filter': ['==', '$type', 'Polygon']
            });

            map.addLayer({
                'id': id + '-points', // Genera un identificador único para la capa de puntos
                'type': 'circle',
                'source': id,
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#B42222'
                },
                'filter': ['==', '$type', 'Point']
            });

            this.flyToGeometry(map, geometry)
               
        });

        this.removeDatasetListener = emitter.addListener('removeDataset', e => {
            // Identificadores de capas basados en el id del conjunto de datos
            const layerIds = [e + '-boundary', e + '-points'];
        
            // Recorre cada id de capa derivado para eliminar las capas y la fuente de datos
            layerIds.forEach(layerId => {
                // Verifica si la capa existe antes de intentar removerla
                if (this.state.map.getLayer(layerId)) {
                    console.log('Removing layer and source:', layerId);
                    // Remueve la capa
                    this.state.map.removeLayer(layerId);
                }
            });
        
            // Verifica si la fuente de datos existe antes de intentar removerla
            if (this.state.map.getSource(e)) {
                // Remueve la fuente de datos asociada al id original del conjunto de datos
                this.state.map.removeSource(e);
            }
        });
        

        this.moveLayerListener = emitter.addListener('moveLayer', (id, beforeId) => {
            // Move layer
            if (beforeId) {
                this.state.map.moveLayer(id, beforeId);
            } else {
                this.state.map.moveLayer(id);
            }
        });

        this.displayTempLayerListener = emitter.addListener('displayTempLayer', e => {
            // Remove previews temp layer
            this.removeTempLayer();

            // Add rendering resource
            if (!this.state.map.hasImage('marker')) {
                this.state.map.addImage('marker', marker, { pixelRatio: 3 });
            }

            // Add point layer on map
            this.state.map.addLayer({
                id: 'custom-temp-point',
                type: 'symbol',
                source: {
                    type: 'geojson',
                    data: e.geometry
                },
                layout: {
                    'icon-image': 'marker'
                }
            });

            // Add popup on map
            this.state.popup.setLngLat(e.geometry.geometry.coordinates).addTo(this.state.map);
            emitter.emit('bindPopup', e);

            // Fly to the point
            this.state.map.flyTo({
                center: e.geometry.geometry.coordinates,
                zoom: 6,
                bearing: 0
            });
        });

        this.removeAllLayerListener = emitter.addListener('removeAllLayer', () => {
            // Remove temp layer
            this.removeAllLayer();
        });

        this.removeTempLayerListener = emitter.addListener('removeTempLayer', () => {
            // Remove temp layer
            this.removeTempLayer();
        });

        this.getPointListener = emitter.addListener('getPoint', () => {
            // Remove temp point
            this.removeTempPoint();

            // Active draw_point mode
            this.state.draw.changeMode('draw_point');
            emitter.emit('showSnackbar', 'default', 'Click on the map to select a point.');
            this.setState({
                gettingPoint: true
            })
        });

        this.removeTempPointListener = emitter.addListener('removeTempPoint', () => {
            // Remove temp point
            this.removeTempPoint();
        });

        // Set state
        this.setState({
            map: map,
            draw: draw,
            style: Object.values(mapStyles)[1],
            minimap: minimap,
            popup: popup
        });

        this.moveMAPistener = emitter.addListener('moveMAP', () => {
            console.log("MAP")
            this.moveMAP();
        });

        emitter.on('moveURL', this.handleURLMoved);

        
    }
    moveMAP = () => {
        var map = this.state.map
        console.log(map)
        this.setState({ movedMAP: map });
        console.log(this.state.movedMAP)

    }

    handleURLMoved = (movedURL) => {
        console.log('Received moved data:', movedURL);
        this.removeAllLayer();
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.setState({ url: movedURL.output[0] });
        console.log(movedURL.output[0])
        this.state.map.addLayer({
            'id': 'predictedSOC',
            'type': 'raster',
            'source': {
                'type': 'raster',
                'tiles': [
                    this.state.url
                ],
                'tileSize': 256
            },
            'paint': {
                'raster-opacity': 0.8  // Opacidad de la capa de ráster
            }
        });
        this.updateLegend(movedURL.output[1]);
        emitter.emit('moveMAP', this.state.map);

    };
    
    
    updateLegend = (visualization_parameters) => {
        const { min, max, palette } = visualization_parameters;
        const legend = document.getElementById('legend');
        
        if (!legend) {
            console.error('Legend element not found');
            return;
        }
    
        legend.innerHTML = '';
    
        const steps = palette.length;
        const stepValue = (max - min) / (steps - 1);
    
        palette.forEach((color, index) => {
            const value = (min + stepValue * index).toFixed(2);
            const item = document.createElement('div');
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.marginBottom = "5px";
            item.innerHTML = `<i style="background: ${color}; width: 20px; height: 20px; display: inline-block; margin-right: 8px;"></i> <span style="font-size: 12px;">${value}</span>`;
            legend.appendChild(item);
        });
    
        // Apply additional styles to the legend container
        legend.style.position = "fixed";
        legend.style.bottom = "10px";
        legend.style.left = "10px";
        legend.style.width = "150px";
        legend.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        legend.style.border = "2px solid grey";
        legend.style.borderRadius = "8px";
        legend.style.padding = "10px";
        legend.style.fontSize = "12px";
        legend.style.zIndex = "9999";
        legend.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.5)";
    };
    

    fetchData = () => {

    

    }

    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.setMapStyleListener);
        emitter.removeListener(this.displayDatasetListener);
        emitter.removeListener(this.removeDatasetListener);
        emitter.removeListener(this.moveLayerListener);
        emitter.removeListener(this.displayTempLayerListener);
        emitter.removeListener(this.removeTempLayerListener);
        emitter.removeListener(this.removeAllLayerListener);
        emitter.removeListener(this.getPointListener);
        emitter.removeListener(this.removeTempPointListener);
        emitter.removeListener(this.moveMAPistener);


    }


    render() {
        
        return (
            <div id="map" style={styles.root} ref={this.mapContainer}>
                <div id="legend"></div>
            </div>
            
        );
    }
}

export default Canvas;