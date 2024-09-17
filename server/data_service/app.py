import psycopg2
from flask import Flask, jsonify, request, make_response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
from flasgger import Swagger, swag_from


app = Flask(__name__)
Swagger(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:Evenor2510Tech@db/biolivar'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

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

@app.route('/', methods=['GET'])
def index():
    return ""

@app.route('/users', methods=['GET'])
def users():
    """Example endpoint returning a list of users
    This is using docstrings for specifications.
    ---
    responses:
        200:
          description: A successful response, indicating that the users were retrieved and basic authentication information is included in the response header.
          headers:
            WWW-Authenticate:
              type: string
              description: Prompts the client for username and password.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: 'Password does not match'
    """
    res=Users.query.all()
    user = Users.query.filter_by(username=res[0].username).first()
    return make_response('Password does not match', 200, {'WWW-Authenticate': 'Basic realm="Login required!"'})

if __name__ == '__main__':
    with app.app_context():  # Asegura que el contexto de la aplicación esté activo
        db.create_all()
    app.run(port=5002)