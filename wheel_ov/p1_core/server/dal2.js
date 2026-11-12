//DAL v1.0
//import mongo from 'mongodb';
//import { ObjectId } from 'mongodb';

//https://discord.com/oauth2/authorize?client_id=YOUR_DISCORD_CLIENT_ID&permissions=3136&scope=bot

//export var dal = {};
var dal = exports;
dal.ObjID = mongo.ObjectID;
//var nodemailer = require('nodemailer');

dal.Init = function () {
    //e.db.createCollection("game", function (err, db) { });
    console.log("DB Initialized");
};

var maxString = 500;
var maxArray = 200;
dal.Sanitize = function (data) {
    Object.keys(data).forEach(key => {
        var v = data[key];
        data[key] = dal.SanitizeValue(v);
    });

    return data;
}

dal.SanitizeValue = function (v, depth = 0) {
    if (typeof v === 'string') {
        if (v.length > maxString)
            return data[key].substring(0, maxString);
    }
    if (Array.isArray(v)) {
        if (depth != 0 || v.length > maxArray)
            return [];
        else {
            for (var i = 0; i < v.length; i++)
                v[i] = dal.SanitizeValue(v[i], 1);
        }
    }

    return v;
}

dal.Save = async function (table, objs, done) {
    const objects = Array.isArray(objs) ? objs : [objs];

    for (let i = 0; i < objects.length; i++) {
        const ogId = objects[i]._id;
        const obj = { ...objects[i] }; // Create a copy to avoid modifying the original object
        delete obj._id; // Cannot save over ID

        try {
            const result = await dal.db.collection(table).updateOne(
                { "_id": new mongo.ObjectId(ogId) },
                { $set: obj },
                { upsert: true }
            );

            if (done) {

                if (result.upsertedCount) {
                    obj._id = result.upsertedId;
                } else {
                    obj._id = ogId;
                }
                done(obj);
            }
        } catch (err) {
            console.error(err);
        }
    }
};

dal.Select = async function (table, search, select, done) {
    const data = await dal.db.collection(table).find(search, select).toArray();
    if (done) done(data || []);
};

dal.Count = async function (table, search, done) {
	var count = await dal.db.collection(table).countDocuments(search);
	done(count);
}


dal.Get = async function (table, search, done) {
    if (search._id)
        search._id = new mongo.ObjectId(search._id);

    const data = await dal.db.collection(table).find(search).toArray();
    if (done) done(data || []);
};

dal.Delete = async function (table, obj, done) {
    await dal.db.collection(table).deleteOne({ "_id": new mongo.ObjectId(obj._id) });
    if (done) done();
};

dal.DeleteAll = async function (table, search, done) {
    await dal.db.collection(table).deleteMany(search);
    if (done) done();
};

//make this fix everywhere I think
dal.Connect = async function (mongoc, dbstring, done) {
    if (dal.tryingToConnect) {
        setTimeout(function () { dal.Connect(mongoc, dbstring, done) }, Math.random() * 1000)
    } else if (!dal.tryingToConnect && (!dal.client)) {
        dal.tryingToConnect = true;
        setTimeout(function () { dal.tryingToConnect = false; }, 5000);


        console.log(dbstring, 'dbstring-----------------------')

        var client = await mongoc.connect(dbstring);
        dal.tryingToConnect = false;
        dal.client = client;
        dal.db = client.db();
        console.log('success connect db');
        done(dal.db);

    } else if (dal.db) {
        done(dal.db);
    }
};