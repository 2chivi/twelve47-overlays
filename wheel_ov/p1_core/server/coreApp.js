
fs = require('fs');
glob = require('glob');
path = require('path');

UT = require('./ut');
UT.Extensions();
analy = require('./analy');
App = {};

var express = require('express');
var app = express();
var controllers = [];

var sio = require('socket.io');
var server = require('http').Server(app);
var io = new sio(server, {});// require('socket.io').listen(server);

var babel = require('@babel/core');//+need babel-preset-env
mongo = require('mongodb');
var uglify = require('uglify-es');
mongoc = mongo.MongoClient;
dbstring = PublishMode ? 'mongodb://10.2.96.3/mydb' : 'mongodb://127.0.0.1:27017/mydb';
var vnum = Math.floor(Math.random() * 1000);

dal = PublishMode ? require('./dal') : require('./dal2');
MAIN = { html: "", css: "", js: "", links:"" };
LANDING = { html: "", css: "", js: "", links:"" };
App.EventSources = new Map();

io.on('connection', function (req) {
    req.on('any', function (method, key, args) {
        console.log('method: ', method);
        analy.totalRequests++;
        if (key[0] == 'f') { //ignore Connect. Fast
            controllers._each(x => {
                if (x && x[method])
                    x[method](req, dal, key, args, function () { });
            });
        } else {
            dal.Connect(mongoc, dbstring, function () {
                controllers._each(x => {
                    if (x && x[method])
                        x[method](req, dal, key, args, function () { });
                });
            });
        }
    });
});

function PageRequest(req, res, isLanding) {
    PageLoad(req, function (data) {
        //include resources as text data as well??
        var html = "<script>loadData = " + JSON.stringify(data) + ";</script>";
        var buff = (isLanding ? LANDING.buff : MAIN.buff);

        if(buff){
            res.set('Content-Type', 'text/html');
            res.write(html + buff);
            res.end();
        }
        analy.pageRequests++;
        analy.totalRequests++;
    });
}

app.get('/events/*', function(req, res){
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    //countdown(res, 10)

    console.log('created thingy', req.params[0])
    App.EventSources.set(req.params[0], res);

    if (App.EventSources.size > 1){
        console.log('try');
        App.EventSources.forEach((es,key)=>{
            if(es._closed)
                App.EventSources.delete(key);
            console.log(App.EventSources.size, key, es.readyState);
        });
    }
});
app.get('/app/*', function (req, res) {
    PageRequest(req, res, false);
});
app.get('/', function (req, res) {
    var isLanding = App.hasLanding ? true : false;
    PageRequest(req, res, isLanding);
});

server.listen(PORT, '0.0.0.0', function () {

    var ips = Object.values(require('os').networkInterfaces()).reduce((r, list) =>
        r.concat(list.reduce((rr, i) => rr.concat(i.family === 'IPv4' && i.address || []), [])), []);

    App.localIP = ips[2];

    var readyFunc = function () {
        SiteMapper();
        dal.ObjID = mongo.ObjectID;
        console.log('listening');

        if (App.OnLoad)
            App.OnLoad(dal);
        if(PublishMode)
            App.Discord(__dirname + " started.", PublishMode);
    };

    FindDirs(function (dirs) {
        App.hasLanding = dirs._any(x => x == 'p4_landing');

        CompilePage('p4_landing', dirs, function () {
            if (App.hasLanding)
                dirs.splice(dirs.indexOf('p4_landing'), 1);

            WriteCompiled('landing', LANDING, function (data) {
                LANDING = data;
                if (App.hasLanding) readyFunc();

                var doneComp = dirs.length;
                for (var i = 0; i < dirs.length; i++) {
                    CompilePage(dirs[i], dirs, function (dir) {
                        doneComp--;
                        if (doneComp == 0) {
                            WriteCompiled('index', MAIN, function () {
                                MAIN.html = MAIN.html.replace('replace_with_links', MAIN.links);
                                if (!App.hasLanding) readyFunc();
                                MAIN.buff = new Buffer.from(MAIN.html);
                                LANDING.buff = new Buffer.from(LANDING.html);
                                
                                MAIN.html = null;
                                LANDING.html = null;
                                MAIN.js = null;
                                LANDING.js = null;
                            });
                        }
                    });
                }
            });
        });
    });

});

if(PublishMode){
    process.stderr.write = (ch, enc, callback) => {
        if (typeof ch === 'string') {
            App.Discord(ch, PublishMode, 'normal - stderr.write log');
        }
    }
    process.on('uncaughtException', function (err) {
        console.log(((err && err.stack) ? err.stack : err) + " \n FYI: Process exited");
        console.error(((err && err.stack) ? err.stack : err) + " \n FYI: Process exited");
        setTimeout(function () { process.exit(1) }, 500);
    });

    process.on('unhandledRejection', (reason, promise) => {   
        App.Discord(reason.toString(), PublishMode, 'normal - unhandled rejection');
     });
}else{
    process.on("unhandledRejection", (error) => {
        console.error(error); // This prints error with stack included (as for normal errors)
        throw error; // Following best practices re-throw error and let the process exit with error code
    });
}

App.Discord = function (info, alert, context) {
    info = info.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').toString();

    if (alert)
        info += " <@115893129378398210> " + GPATH + " -- " + context;
    request.post(
        'https://discordapp.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
        { json: { content: info } },
        function (er, resp, body) { }
    );
};


function FindDirs(done) {
    var dirs = [];

    glob(__dirname + '/../../*', function (er, files) {
        files._each(x => {
            var hier = x.split('/');
            var nme = hier[hier.length - 1];

            if (nme.indexOf('.') < 0 && nme.indexOf('node_modules') < 0)
                dirs.push(nme);
        });

        dirs._each(x => {
            app.use('/', express.static(__dirname + '/../../' + x + '/res'));
            controllers.push(require(GPATH + '/' + x + '/server/controller'));
        });
        done(dirs);
    });
}

//Custom Pre Loaded Data per Site
function PageLoad(req, done) {
    var q = req.query;
    done({ PORT, IP: App.localIP });
}

//populate dynamic pages
function SiteMapper() {
}


function Compile(location, includeUtil, done) {
    var pg = {
        html: "", js: "", css: "", links:""
    };

    var files = glob.sync(location);

    var hasHtml = false;

    for (var i = 0; i < files.length; i++) {
        var file = files[i];

        if(file.indexOf('links.html') > -1){
            pg.links += fs.readFileSync(file, 'utf-8');
        }
        if (file.indexOf("main.html") > -1){
            pg.html += fs.readFileSync(file, 'utf-8').replace('</html>', '');
            hasHtml = true;
        }
        if (file.indexOf(".js") > -1 && file.indexOf('.json') <= -1) {
            var tempjs = fs.readFileSync(file, 'utf-8');
            var fileName = file.split('/').slice(-1)[0];

            if (fileName[0] == 'r' || fileName == 'main.js')
                tempjs = babel.transform(tempjs, { presets: ["@babel/react"] }).code;

            pg.js += tempjs ? tempjs : "";
        }
        if (file.indexOf(".css") > -1) {
            var tempcss = fs.readFileSync(file, 'utf-8');
            pg.css += tempcss ? tempcss : "";
        }
    }

    if(hasHtml){
        pg.html += "</html>";
        pg.html = pg.html.replace('_vn_', vnum);
    }
    
    if(PublishMode)
        pg.js = babel.transform(pg.js, { presets: ["@babel/env"] }).code;
    //else
        //pg.js = babel.transform(pg.js, { presets: ["@babel/react"] }).code;
    pg.js = "/* ======== No Steal Code (>.>) support@example.com ======== */ \n" + pg.js;

    done(pg, location);
}

function WriteCompiled(filename, targ, done) {
    var api = fs.readFileSync(__dirname + '/api.js', 'utf-8');
    var ut = fs.readFileSync(__dirname + '/ut.js', 'utf-8');
    var util = fs.readFileSync(__dirname + '/util.js', 'utf-8');
    targ.js = api + ut + util + targ.js;

    if (PublishMode) {
        var result = uglify.minify(targ.js, {
            mangle: { properties: { regex: /_$/ } }
        });

        targ.js = result.code;
    }

    fs.writeFileSync(__dirname + '/../res/' + filename + '.html', targ.html);
    fs.writeFileSync(__dirname + '/../res/' + filename + '.css', targ.css);
    fs.writeFileSync(__dirname + '/../res/' + filename + '.js', targ.js);
    console.log(filename + ' compiled');
    targ.js = null;
    targ.css = null;
    done(targ);
}

// Auto creates index.html from main.html.  <web> tags are broken down.
function CompilePage(dir, dirs, done) {
    if (!dirs._any(x => x == dir))
        return done();

    var location = __dirname + "/../../" + dir + "/web/**/*";
    var isLanding = dir == 'p4_landing';
    var includeUtils = dir == 'p1_core' || isLanding;
    var targ = isLanding ? LANDING : MAIN;


    Compile(location, includeUtils, function (page, name) {
        targ.html += page.html;
        targ.css += page.css;
        targ.js += page.js;
        targ.links += page.links;
        done(dir);
    });
}