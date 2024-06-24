from flask import Flask, jsonify, request
from werkzeug.utils import secure_filename
from flask_cors import CORS
import geopandas as gpd
import zipfile
import ee
import requests
import os
import tempfile

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])   

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER) 
    
ee.Authenticate(auth_mode="appdefault", quiet=False)
ee.Initialize(project='soil-values-predictor')

@app.route('/', methods=['GET'])
def index():
    return ""

@app.route('/watsat', methods=['GET'])
def get_watsat():
    try:
            # Define el área de interés usando coordenadas
            bounds = ee.Geometry.Rectangle([-120, 35, -119, 36])

            # Cargar datos de NDVI de MODIS
            ndvi = ee.ImageCollection('MODIS/006/MOD13Q1').select('NDVI').filterDate('2020-01-01', '2020-12-31')

            # Cargar datos de precipitación de CHIRPS
            precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate('2020-01-01', '2020-12-31')

            # Cargar datos de evapotranspiración de referencia de MODIS
            et0 = ee.ImageCollection('MODIS/006/MOD16A2').select('ET').filterDate('2020-01-01', '2020-12-31')
            
            # Cálculo del FVC
# Cálculo del FVC utilizando una función map
            def calculate_FVC(image):
                ndvi_max = 0.9
                ndvi_min = 0.1
                fvc = image.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).subtract(ndvi_min).divide(ndvi_max - ndvi_min)
                return image.addBands(fvc.rename('FVC'))

            # Calcular FVC para cada imagen en la colección
            ndvi_fvc = ndvi.map(calculate_FVC)

            # Calcular el Agua Disponible (AW) - Ejemplo simplificado
            aw = precipitation.mean().subtract(et0.mean())

            # Calcular el Coeficiente de Estrés Hídrico (CWS)
            def calculate_CWS(img):
                cws = img.expression('0.5 + 0.5 * AW', {'AW': aw})
                return img.addBands(cws.rename('CWS'))

            # Aplicar el CWS a cada imagen en la colección
            cws_images = ndvi.map(calculate_CWS)

            predicted_soil_carbon=cws_images.first().select('CWS').clip(bounds)

            visualization_parameters = {
                'min': -10, 'max': 10, 'palette': ['red', 'blue']
            }
            
            print(type(predicted_soil_carbon))
            
            #map_id = predicted_soil_carbon.getMapId(visualization_parameters)
            
            # Multi-band GeoTIFF file wrapped in a zip file.
            url = predicted_soil_carbon.getDownloadUrl({
                'name': 'band',
                'bands': ['CWS'],
                'region': bounds,
                'scale': 100,
                'filePerBand': False
            })
            response = requests.get(url)
            with open('band.zip', 'wb') as fd:
                fd.write(response.content)
            
            return jsonify({"success": True, "output":url}), 200



    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500
    
    
@app.route('/get_spectral_indexes', methods=['POST'])
def get_spectral_indexes():
    try:
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        aoi_file = request.files['aoiDataFiles']

        print(f"Fetching image from {start_date} to {end_date}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

        # Directorio base donde se encuentra el script

        # Ruta al archivo shapefile
            aoi_file.save(aoi_filepath)

            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])   
                
        
            coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")\
                .filterDate(start_date, end_date)\
                .filterBounds(bbox)\
                .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10)
                
            mosaico = coleccion_sentinel.median().clip(bbox)
                
            mosaico_bands = mosaico.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])
            
            def calculate_ndvi(image):
                # Calcular NDVI usando la expresión
                ndvi = image.expression(
                    'float((NIR - RED) / (NIR + RED))', {
                    'NIR': image.select('B8'),
                    'RED': image.select('B4')
                }).rename('NDVI')  # Renombrar como 'NDVI'
                
                # Imprimir NDVI (opcional, principalmente para debugging o exploración)
                
                return ndvi
            
            def calculate_evi(image):
                return image.expression(
                    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                        'NIR': image.select('B8'),
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('EVI')
                
            def calculate_gndvi(image):
                gndvi = image.expression(
                    '(NIR - GREEN) / (NIR + GREEN)', 
                    {
                        'NIR': image.select('B8'),  
                        'GREEN': image.select('B3')
                    }).rename('GNDVI')
                return gndvi
            
            def add_indices(image):
                indices = [
                    calculate_ndvi(image), calculate_evi(image), calculate_gndvi(image)
                ]
                return image.addBands(indices)


            composite_indices = add_indices(mosaico_bands)
            
            band = request.args.get('indexType')
            
            composite_clipped = []
            
            if band=="NDVI" :
                composite_clipped = composite_indices.clip(bbox).select("NDVI")
                
            elif band=="GNDVI":
                composite_clipped = composite_indices.clip(bbox).select("GNDVI")

                
            elif band=="EVI":
                composite_clipped = composite_indices.clip(bbox).select("EVI")
            

            palette = [
            'a50026', 'd73027', 'f46d43', 'fdae61', 'fee08b',
            'ffffbf', 'd9ef8b', 'a6d96a', '66bd63', '1a9850', '006837'
            ]
            visualization_parameters = {
            'min': 0.3, 'max': 0.8,  'palette':  palette
                }
            
            map_id = composite_clipped.getMapId(visualization_parameters)
            
                
        return jsonify({"success": True, "output": map_id['tile_fetcher'].url_format}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500
        
@app.route('/soil_organic_prediction', methods=['POST'])
def get_image():
    try:
        if 'soilDataFiles' not in request.files or 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No file part"}), 400

        soil_file = request.files['soilDataFiles']
        aoi_file = request.files['aoiDataFiles']

        if soil_file.filename == '' or aoi_file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        with tempfile.TemporaryDirectory() as temp_dir:
            soil_filepath = os.path.join(temp_dir, secure_filename(soil_file.filename))
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

            soil_file.save(soil_filepath)
            aoi_file.save(aoi_filepath)

            # Suponiendo que el shapefile se extrae en el directorio temporal
            
            data_scale = 20
            
            gdf = gpd.read_file(soil_filepath)
            geojson_dict = gdf.__geo_interface__
            table = ee.FeatureCollection(geojson_dict['features'])

            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])
            
            coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")\
            .filterDate('2021-12-30', '2022-12-30')\
            .filterBounds(bbox)\
            .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10)
            
            mosaico = coleccion_sentinel.median().clip(bbox)
            
            mosaico_bands = mosaico.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])
            
            def calculate_ndvi(image):
                return image.normalizedDifference(['B8', 'B4']).rename('NDVI')

            def calculate_evi(image):
                return image.expression(
                    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                        'NIR': image.select('B8'),
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('EVI')


            def calculate_nbr(image):
                nbr = image.expression(
                    '(NIR - SWIR2) / (NIR + SWIR2)', 
                    {
                        'NIR': image.select('B8'),  
                        'SWIR2': image.select('B12')
                    }).rename('NBR')
                return nbr

            def calculate_nbr2(image):
                nbr2 = image.expression(
                    '(SWIR - SWIR2) / (SWIR + SWIR2)', 
                    {
                        'SWIR': image.select('B11'),  
                        'SWIR2': image.select('B12')
                    }).rename('NBR2')
                return nbr2

            def calculate_ndmi(image):
                ndmi = image.expression(
                    '(NIR - SWIR) / (NIR + SWIR)', 
                    {
                        'SWIR': image.select('B11'),  
                        'NIR': image.select('B8')
                    }).rename('NDMI')
                return ndmi

            def calculate_arvi(image):
                arvi = image.expression(
                    '((NIR - (2 * RED) + BLUE) / (NIR + (2 * RED) + BLUE))', 
                    {
                        'NIR': image.select('B8'),
                        'BLUE': image.select('B2'), 
                        'RED': image.select('B4')
                    }).rename('ARVI')
                return arvi

            def calculate_sipi(image):
                sipi = image.expression(
                    '((NIR - BLUE) / (NIR - RED))', 
                    {
                        'NIR': image.select('B8'),
                        'BLUE': image.select('B2'), 
                        'RED': image.select('B4')
                    }).rename('SIPI')
                return sipi

            def calculate_rgr(image):
                rgr = image.expression(
                    'RED / GREEN', 
                    {
                        'RED': image.select('B4'),  
                        'GREEN': image.select('B3')
                    }).rename('RGR')
                return rgr

            def calculate_gli(image):
                gli = image.expression(
                    '(((GREEN - RED) + (GREEN - BLUE)) / ((2 * GREEN) + RED + BLUE))', 
                    {
                        'GREEN': image.select('B3'),  
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('GLI')
                return gli

            def calculate_msi(image):
                msi = image.expression(
                    'NIR / SWIR', 
                    {
                        'NIR': image.select('B8'),
                        'SWIR': image.select('B11')
                    }).rename('MSI')
                return msi

            def calculate_soci(image):
                soci = image.expression(
                    'BLUE / (GREEN * RED)', 
                    {
                        'BLUE': image.select('B2'),
                        'GREEN': image.select('B3'),
                        'RED': image.select('B4')
                    }).rename('SOCI')
                return soci

            def calculate_bi(image):
                bi = image.expression(
                    'sqrt(((RED * RED) / (GREEN * GREEN)) / 2)', 
                    {
                        'GREEN': image.select('B3'),
                        'RED': image.select('B4')
                    }).rename('BI')
                return bi

            def calculate_savi(image):
                savi = image.expression(
                    '((NIR - RED) / (NIR + RED + L)) * (1 + L)', 
                    {
                        'L': 0.5,  # Cover of vegetation 0-1
                        'NIR': image.select('B8'),
                        'RED': image.select('B4')
                    }).rename('SAVI')
                return savi

            def calculate_gci(image):
                gci = image.expression(
                    '((NIR) / (GREEN)) - 1', 
                    {
                        'NIR': image.select('B8'),  
                        'GREEN': image.select('B3')
                    }).rename('GCI')
                return gci

            def calculate_gndvi(image):
                gndvi = image.expression(
                    '(NIR - GREEN) / (NIR + GREEN)', 
                    {
                        'NIR': image.select('B8'),  
                        'GREEN': image.select('B3')
                    }).rename('GNDVI')
                return gndvi

            def add_indices(image):
                indices = [
                    calculate_nbr(image), calculate_nbr2(image), calculate_ndmi(image),
                    calculate_arvi(image), calculate_sipi(image), calculate_rgr(image),
                    calculate_gli(image), calculate_msi(image), calculate_soci(image),
                    calculate_bi(image), calculate_savi(image), calculate_gci(image),
                    calculate_gndvi(image), calculate_ndvi(image), calculate_evi(image)
                ]
                return image.addBands(indices)


            composite_indices = add_indices(mosaico_bands)
            
            precipitation_1d = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').select('precipitation')
            LST= ee.ImageCollection('MODIS/061/MOD11A2').select('LST_Day_1km')
            surface_radiance = ee.ImageCollection('MODIS/061/MCD18A1').select('DSR')
            npp = ee.ImageCollection('MODIS/061/MOD17A3HGF').select('Npp')
            eti = ee.ImageCollection('FAO/WAPOR/2/L1_AETI_D').select('L1_AETI_D')
            lulc = ee.Image('COPERNICUS/Landcover/100m/Proba-V-C3/Global/2019').select('discrete_classification')
            
            def prec(image):
                x = image.select("precipitation")
                return x.rename('Precipitation')

            def statistics(image_collection, bbox):
                first_image = image_collection.first()
                band_name = first_image.bandNames().get(0).getInfo()
                mean = image_collection.mean().rename(band_name + '_mean')
                mode = image_collection.mode().rename(band_name + '_mode')
                min_ = image_collection.min().rename(band_name + '_min')
                max_ = image_collection.max().rename(band_name + '_max')
                median = image_collection.median().rename(band_name + '_median')
                stats = ee.Image.cat([mean, mode, min_, max_, median]).clip(bbox)
                return stats

            temperature_stats = statistics(LST, bbox)
            precipitation_stats = statistics(precipitation_1d.map(prec), bbox)
            
            lulc_clipped = lulc.clip(bbox)
            
            stack = composite_indices.select("NDVI", "EVI",
                "SAVI", "SIPI",
                "SOCI", "NBR",
                "BI", "NBR2",
                "MSI", "RGR",
                "ARVI", "GLI", "GCI",
                "GNDVI", "NDMI","B8", "B11" )
            
            # Sampling and Classifier
            training_samples = stack.sampleRegions(
                collection=table,
                properties=['SOC'],
                scale=data_scale,
                geometries=True
            )

            classifier_rf = ee.Classifier.smileRandomForest(500).setOutputMode('REGRESSION').train(
                features=training_samples,
                classProperty='SOC',
                inputProperties=stack.bandNames()
            )
            
            predicted_soil_carbon = stack.classify(classifier_rf).rename("Predicted_SOC")
            visualization_parameters = {
                'min': 0,
                'max': 6,
                'palette': ['yellow', 'GreenYellow', 'DarkGreen']
            }
            map_id = predicted_soil_carbon.getMapId(visualization_parameters)
            
            return jsonify({"success": True, "output": map_id['tile_fetcher'].url_format}), 200



    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5004)