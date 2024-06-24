from flask import Flask, jsonify, request, make_response
from flask_cors import CORS  # Importa CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, get_jwt_identity, jwt_required, set_access_cookies, set_refresh_cookies
import pandas as pd
import psycopg2
import json

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
import ee


app = Flask(__name__) 
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:Evenor2510Tech@localhost/biolivar'
app.config['JWT_SECRET_KEY'] = 'super-secret'  # Cambia esto por una clave secreta real
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # CSRF protection

ee.Authenticate()
ee.Initialize(project='soil-values-predictor')

jwt = JWTManager(app)
db = SQLAlchemy(app)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])    


parcel_user = db.Table('parcel_users',
    db.Column('users_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('parcels_id', db.Integer, db.ForeignKey('parcels.id'), primary_key=True)
)

class Users(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(50), default='base')  # default role is 'base'
    parcels = db.relationship('Parcels', secondary=parcel_user, lazy='subquery',
                              backref=db.backref('users', lazy=True))
    

class Parcels(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    catastral_ref = db.Column(db.String(255), unique=True, nullable=False)
    geojson_data = db.Column(JSONB, nullable=False)

# Asegúrate de eliminar ParcelRequest si no es necesario con la nueva estructura

@app.route('/login', methods=['POST'])
def login():
    if not request.json["username"] or not request.json["password"]:
        return make_response('Bad form', 401, {'WWW-Authenticate': 'Basic realm="Login required!"'})
    res=Users.query.all()
    user = Users.query.filter_by(username=request.json["username"]).first()
    if not user:
        return make_response('User not found', 404, {'WWW-Authenticate': 'Basic realm="Login required!"'})
    
    if user.password==request.json["password"]:
        access_token = create_access_token(identity=request.json["username"])
        refresh_token = create_refresh_token(identity=request.json["username"])
        # Set the JWT cookies in the response
        resp = jsonify({'message': [user.id, access_token]})
        set_access_cookies(resp, access_token)
        set_refresh_cookies(resp, refresh_token)

        return resp

    return make_response('Password does not match', 401, {'WWW-Authenticate': 'Basic realm="Login required!"'})

# Protect a route with jwt_required, which will kick out requests
# without a valid JWT present.
@app.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    # Access the identity of the current user with get_jwt_identity
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200

@app.route('/users', methods=['GET'])
def users():
    res=Users.query.all()
    print((res[0].username))
    user = Users.query.filter_by(username="almafe").first()
    print(user)
    return make_response('Password does not match', 200, {'WWW-Authenticate': 'Basic realm="Login required!"'})
    
 #HC Air temperature   
 
@app.route('/users/<int:user_id>/parcels', methods=['GET'])
def get_user_parcels(user_id):
    user = Users.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    parcelss = [{
        'id': parcel.id,
        'catastral_ref': parcel.catastral_ref,
        'geojson_data': parcel.geojson_data
    } for parcel in user.parcels]

    return jsonify(parcelss), 200

@app.route('/animales_por_localidad', methods=['GET'])
def animales_por_localidad():
    try:
        conn = psycopg2.connect(dbname="biolivar", user="postgres", password="Evenor2510Tech")
        cur = conn.cursor()
        
        # Consulta SQL para obtener todos los avistamientos agrupados por localidad
        query = """
        SELECT localidad, date, especie, num
        FROM census
        ORDER BY localidad, date;
        """
        
        df = pd.read_sql(query, conn)

        # Pivotea el DataFrame para mejorar la organización por localidad y fecha
        df_pivot = df.pivot_table(index=['localidad', 'date'], columns='especie', values='num', aggfunc='sum').fillna(0).reset_index()

        # Convertimos el DataFrame pivotado a JSON
        result_json = df_pivot.to_json(orient='records')
        
        return jsonify({"success": True, "output": result_json}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    

@app.route('/capas', methods=['GET'])
def capas():
    try:
        def addNDVI(image):
            return image.addBands(image.normalizedDifference(['B5', 'B4']).rename('NDVI'))

        # Función para máscara de nubes
        def cloudMask(image):
            clouds = ee.Algorithms.Landsat.simpleCloudScore(image).select(['cloud'])
            return image.updateMask(clouds.lt(10))

        aoi = ee.Geometry.Rectangle([-122.45, 37.74, -121.90, 38.1])  # Example coordinate

        # Cargar la colección de imágenes Landsat
        collection = ee.ImageCollection('LANDSAT/LC08/C01/T1_TOA') \
            .filterBounds(ee.Geometry.Point([-122.262, 37.8719])) \
            .filterDate('2014-03-01', '2014-05-31') \
            .map(addNDVI) \
            .map(cloudMask)

        # Calcular la imagen promedio
        meanImage = collection.reduce(ee.Reducer.mean())

        # Definir parámetros de visualización con colores personalizados
        vizParams = {
        'bands': ['NDVI_mean'], # Usar el NDVI calculado
        'min': -1, 
        'max': 1,
        'palette': ['blue', 'white', 'green'] # Colores personalizados para valores bajos, medios y altos de NDVI
        }

        # Load the NDVI image (assuming 'meanImage' from your script has the NDVI data)
        ndvi = meanImage.select('NDVI_mean')

        # Threshold NDVI to identify features, e.g., vegetation
        vegetation = ndvi.gt(0.3)  # NDVI > 0.3 for vegetation

        # Convert the raster to vector
        vector = vegetation.addBands(ndvi).reduceToVectors(
            geometryType = 'polygon',
            reducer = ee.Reducer.mean(),
            scale = 50,  # Depends on the dataset resolution
            maxPixels = 1e8,
            geometry = aoi
        )

        # Get information as GeoJSON
        geojson = vector.getInfo()
        
        return jsonify({"success": True, "output": json.dumps(geojson, indent=2)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
    
if __name__ == '__main__':
    with app.app_context():  # Asegura que el contexto de la aplicación esté activo
        db.create_all()
    app.run(debug=True)