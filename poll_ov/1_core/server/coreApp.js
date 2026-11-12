UT = require('./ut');
UT.Extensions();

var mongo = require('mongodb');
var uglify = require('uglify-es');
var express = require('express');
var sio = require('socket.io');
var dal = require('./dal');

fs = require('fs');
glob = require('glob');
analy = require('./analy');
mongoc = mongo.MongoClient;
dbstring = PublishMode ? 'mongodb://10.2.96.3/mydb' : 'mongodb://127.0.0.1:27017/mydb';
App = {
    EventSources: new Map(),
};

var app = express();
var server = require('http').Server(app);
io = new sio(server, {});// require('socket.io').listen(server);

var controllers = [];
var vnum = Math.floor(Math.random() * 1000);

io.on('connection', function (req) {
    req.on('any', function (method, key, args) {
        analy.totalRequests++;

        dal.Connect(mongoc, dbstring, function () {
            controllers._each(xc => {
                if (xc && xc[method]){
                    xc[method](req, dal, key, args);
                }
            });
        });
    });
});

function PageRequest(req, res, page) {
    var stream = fs.createReadStream(__dirname + '/../res/' + page + '.html');
    stream.pipe(res);
}

//For Game Stuff?
app.get('/events/*', function(req, res){
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    //countdown(res, 10)

    App.EventSources.set(req.params[0], res);

    if (App.EventSources.size > 1){
        App.EventSources.forEach((es,key)=>{
            if(es._closed)
                App.EventSources.delete(key);
            console.log(App.EventSources.size, key, es.readyState);
        });
    }
});
app.get('/app/*', function (req, res) {
    PageRequest(req, res, 'index');
});
app.get('/', function (req, res) {
    if(req.query.controls){
        PageRequest(req, res, 'control');
    }else{
        PageRequest(req, res, 'index');
    }
});
app.get('/control', function (req, res) {
    PageRequest(req, res, 'control');
});

server.listen(PORT, '0.0.0.0', function () {
    console.log('listening at: ', PORT)

    var ips = Object.values(require('os').networkInterfaces()).reduce((r, list) =>
        r.concat(list.reduce((rr, i) => rr.concat(i.family === 'IPv4' && i.address || []), [])), []);

    App.localIP = ips[2];

    
    var readyFunc = function () {
        dal.ObjID = mongo.ObjectID;
        console.log('everything - compiled');

        if (App.OnLoad)
            App.OnLoad(dal);
        if(PublishMode)
            App.Discord(__dirname + " started.", PublishMode);
    };

    //is a folder a website, or package.  What packages do each website use?
    //ability to have mutlple sites -> Landing Main etc.
    FindDirs(function (dirs) {
        console.log(dirs);

        var doneCollector = new UT.DoneCollector(dirs.length);

        for (var i = 0; i < dirs.length; i++)
            CompilePage(dirs[i], dirs, doneCollector.done(i));

        doneCollector.allDone(function(data){
            var packages = {};
            var sites = {};

            dirs._each((d,i)=>{
                if(isNaN(d.split('_')[0]))
                    sites[d] = data[i];
                else
                    packages[d] = data[i];
            });

            //check 
            var doneCollector2 = new UT.DoneCollector(Object.keys(sites).length);

            Object.keys(sites)._each((key,ind)=>{
                var site = sites[key];
                var packageNums = key.split('_')[1];
                var sitePackages = [];
                packageNums._each(pn=>{ 
                    var dir = dirs._first(x=> x[0] == pn);
                    sitePackages.push(packages[dir]);
                });
                sitePackages.push(site);

                var main = { js: '', html: '', css: '', links: '' };
                sitePackages._each(sp=>{
                    main.js += sp.js;
                    main.html += sp.html;
                    main.css += sp.css;
                    main.links += sp.links 
                });

                var siteName = key.split('_')[0];
                var data = { PORT: PORT, IP: App.localIP };
                main.html = main.html.replace('replace_with_links', main.links);
                main.html = "<script>loadData = " + JSON.stringify(data) + ";</script>" + main.html;

                WriteCompiled(siteName, main, doneCollector2.done(ind));
            });

            doneCollector2.allDone(function(){
                readyFunc();
            });
        })

        //get HTML, and JS for all files in each dir
        //minify maybe
        //write this HTML to index.html / index.js
    });
});

//finds controllers
//allows for static file-get rom /res
//get directories for code-compiling to index files
function FindDirs(done) {
    var dirs = [];

    glob(__dirname + '/../../*', function(er, files){
        files._each(x => {
            var hier = x.split('/');
            var nme = hier[hier.length - 1];

            if (nme.indexOf('.') < 0 && nme.indexOf('node_modules') < 0)
                dirs.push(nme);
        });
        console.log(dirs);

        dirs._each(x => {
            app.use('/', express.static(__dirname + '/../../' + x + '/res'));
            controllers.push(require(GPATH + '/' + x + '/server/controller'));
        });

        done(dirs.reverse());
    });
}

function CompilePage(dir, dirs, done) {
    if (!dirs._any(x => x == dir))
        return done();

    var location = __dirname + "/../../" + dir + "/web/**/*";
    var pg = { html: "", js: "", css: "", links: "" };

    glob(location, function(er, files){
        var hasHtml = false;

        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            if (file.indexOf('links.html') > -1)
                pg.links += fs.readFileSync(file, 'utf-8');

            if (file.indexOf("main.html") > -1) {
                pg.html += fs.readFileSync(file, 'utf-8').replace('</html>', '');
                hasHtml = true;
            }
            if (file.indexOf(".js") > -1 && file.indexOf('.json') <= -1) {
                var tempjs = fs.readFileSync(file, 'utf-8');
                var fileName = file.split('/').slice(-1)[0];
                pg.js += tempjs ? tempjs : "";
            }
            if (file.indexOf(".css") > -1) {
                var tempcss = fs.readFileSync(file, 'utf-8');
                pg.css += tempcss ? tempcss : "";
            }
        }

        if (hasHtml) {
            pg.html += "</html>";
            pg.html = pg.html.replace('_vn_', vnum);
        }

        pg.js = "/* ======== Twelev47 support@example.com ======== */ \n" + pg.js;

        done(pg, location);
    });
}

function WriteCompiled(filename, targ, done) {
    var api = fs.readFileSync(__dirname  + '/api.js', 'utf-8');
    var ut = fs.readFileSync(__dirname + '/ut.js', 'utf-8');

    targ.js = api + ut + targ.js;

    if (PublishMode && Minify) {
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

//replace w/ fetch
App.Discord = function (info, alert, context) {
    info = info.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').toString();

    if (alert)
        info += " <@115893129378398210> " + GPATH + " -- " + context;


    var req = https.request({
        host: 'discordapp.com', path: '/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        }
    }, (result) => {
        result.setEncoding('utf8')
        result.on('data', function (d) {
            console.log('data info', d);
        });
    });

    req.on('error', (e) => { console.log('error', e); });

    req.write(JSON.stringify({ content: info }))
    req.end();

    /*
    request.post(
        'https://discordapp.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
        { json: { content: info } },
        function (er, resp, body) { }
    );*/
};


if (PublishMode) {
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
} else {
    process.on("unhandledRejection", (error) => {
        console.error(error); // This prints error with stack included (as for normal errors)
        throw error; // Following best practices re-throw error and let the process exit with error code
    });
}
