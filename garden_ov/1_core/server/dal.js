//DAL v1.0

var e = exports;
//var nodemailer = require('nodemailer');

e.Init = function () {
    //e.db.createCollection("game", function (err, db) { });
    console.log("DB Initialized");
};

e.Save = function (table, objs, done) {
    var objects = objs;
    if (!(objs instanceof Array))
        objects = [objs];

    for (var i = 0; i < objects.length; i++) {
        var ogId = objects[i]._id;
        var obj = objects[i];
        delete objects[i]._id; //cannot save over ID

        e.db.collection(table).updateOne({ "_id": e.ObjID(ogId) },
            { $set: objects[i] }, { upsert: true }, (er, data) => {
                if (done && data && data.result.upserted) {
                    var id = data.result.upserted[0]._id;
                    obj._id = id;
                } else
                    obj._id = ogId;
                if (done)
                    done(obj);
                if (er)
                    console.log(er);
            });
        if (!objects[i]._id)
            objects[i]._id = ogId;
        return;
    }
};

e.Select = function (table, search, select, done) {
    e.db.collection(table).find(search, select).toArray(function (er, data) {
        if (done) done(data ? data : []);
    });
};

e.Get = function (table, search, done) {
    if (search._id)
        search._id = e.ObjID(search._id);
    e.db.collection(table).find(search).toArray(function (er, data) {
        if (er)
            console.log(er);
        if (done) done(data ? data : []);
    });
};

e.Delete = function (table, obj, done) {
    e.db.collection(table).deleteOne({ "_id": e.ObjID(obj._id) }, function (er, data) {
        if (done) done();
    });
};

e.DeleteAll = function (table, search, done) {
    e.db.collection(table).deleteMany(search, function () {
        if (done) done();
    });
};

/*
e.SendEmail = function (emailTo, message) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: 'you@example.com', pass: 'YOUR_EMAIL_PASSWORD' }
    });

    var mailOptions = {
        from: 'you@example.com',
        to: emailTo,
        subject: 'WillDo::',
        html: message
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error)
            console.log(error);
        else
            console.log('Email sent: ' + info.response);
    });
};*/


//make this fix everywhere I think
e.Connect = function (mongoc, dbstring, done) {

    if (e.tryingToConnect) {
        setTimeout(function () { e.Connect(mongoc, dbstring, done) }, Math.random() * 1000)
    } else if (!e.tryingToConnect && (!e.db || !e.db.topology.isConnected())) {
        e.tryingToConnect = true;
        setTimeout(function () { e.tryingToConnect = false; }, 5000);

        mongoc.connect(dbstring, function (err, db) {
            e.tryingToConnect = false;
            e.db = db;
            console.log('helllooooooo', err);
            done(e.db);
        });
    } else if (e.db) {
        done(e.db);
    }
};