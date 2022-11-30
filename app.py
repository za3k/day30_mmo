#!/bin/python3
import flask, flask_login
from flask import url_for, request, render_template, redirect
from flask_login import current_user
from flask_sock import Sock
import collections, json, queue, random
from datetime import datetime
from base import app,load_info,ajax,DBDict,DBList,random_id,hash_id,full_url_for

# -- Info for every Hack-A-Day project --
load_info({
    "project_name": "Hack-An-MMO",
    "source_url": "https://github.com/za3k/day30_mmo",
    "subdir": "/hackaday/mmo",
    "description": "A relaxing coloring book mmo. It is nice.",
    "instructions": "To play, you make an account. Then you can explore!",
    "login": True,
    "fullscreen": True,
})

# -- Routes specific to this Hack-A-Day project --
objects = DBDict("object")

@app.route("/")
def index():
    return render_template('index.html')

def play():
    return render_template('index.html')

@ajax("/ajax/store")
def store(j):
    value = j["value"]
    if k["type"] in ["art"]
        key = hash_id(json.dumps(value))
    else:
        key = k["id"] or random_id()
    objects[key] = value
    return {"key":key, "value": value}

@ajax("/ajax/get")
def get(json):
    key = json["key"]
    value = objects.get(key)
    if value is None:
        return "", 404
    return {"key": key, "value":value}
