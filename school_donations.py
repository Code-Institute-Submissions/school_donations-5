from flask import Flask
from flask import render_template
from pymongo import MongoClient
import json
import os


app = Flask(__name__)

DBS_NAME = os.environ.get('DBS_NAME')
MONGO_URI = os.environ.get('MONGO_URI')
MONGODB_HOST = os.environ.get('MONGODB_HOST')
MONGODB_PORT = os.environ.get('MONGODB_PORT')
COLLECTION_NAME = 'school_donations'
FIELDS = {'funding_status': True, 'school_state': True, 'resource_type': True, 'poverty_level': True,
          'date_posted': True, 'total_donations': True, '_id': False, 'school_metro': True, 'primary_focus_area': True}


@app.route('/')
def index():
    return render_template("index.html")


@app.route("/donorsUS/projects")
def donor_projects():
    connection = MongoClient(MONGO_URI) #HOST, MONGODB_PORT)
    collection = connection[DBS_NAME][COLLECTION_NAME]
    projects = collection.find(projection=FIELDS, limit=55000)
    json_projects = []
    for project in projects:
        json_projects.append(project)
    json_projects = json.dumps(json_projects)
    connection.close()
    return json_projects


if __name__ == '__main__':
    app.run(debug=True)
