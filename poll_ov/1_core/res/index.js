var IsServer = (typeof exports) !== 'undefined';

class API {
    constructor(port, ip, reconnect = true, serverLoc) {
        var t = this;
        t.reconnect = reconnect;
        t.Unique = 0;
        t.DoneFuncs = {};
        t.firstCall = true;
        
        if(serverLoc)
            t.ServerLoc = serverLoc;
        else{
            if (!IsServer && window.location.hostname == 'localhost')
                t.ServerLoc = 'http://localhost:' + port;
            else if (IsServer) {
                t.ServerLoc = 'http://localhost:' + port;
                if (ip)
                    t.ServerLoc = 'http://' + ip + ":" + port;
            }
            else {
                t.ServerLoc = ServerLoc + '?port=' + port;
                if (ip)
                    t.ServerLoc += "&ip=" + ip;
            }
        }
        t.Init();
    }

    Init() {
        var t = this;
        console.log('api con');
        t.Sock = io(t.ServerLoc, { reconnectionDelayMax: 10000, reconnection: t.reconnect, reconnectionDelay: 2000 });

        

        t.Sock.on('any', function (key, args) {
            var df = t.DoneFuncs[key];
            if (df && df.func) {
                t.DoneFuncs[key].func(args);
                delete t.DoneFuncs[key];
            }else{
                console.log(key);
                console.log(t.DoneFuncs);
                console.log('API Sock Failure?')
            }
        });
    }


    Call(method, args, done, fast=false) {
        var t = this;
        var key = t.Unique;
        var time = Date.now();
        t.Unique++;

        //restricts sending a ton of requests on reconnect
        if (!t.Sock.connected && t.Sock.sendBuffer.length > 5)
            t.Sock.sendBuffer = [];

        if (done)
            t.DoneFuncs[key] = { func: done, time, key, method };

        t.Sock.emit('any', method, key, args);

        var removals = [];
        t.DoneFuncs._each(df=> {
            if ((df.time+(1000*60*2)) < time){
                removals.push(df);
            }
        });
        removals._each(r=> { delete t.DoneFuncs[r.key] });
    }
};
if (IsServer) module.exports = API;//LINQ 1.3 : Fix inherit != null

var UT = {};
(function (exp) {
    var t = exp;
    t.Events = {};

    t.ran = function (arr) {
        return arr[Math.floor(arr.length * Math.random())];
    };

    //type = ai..  /core defaults.js
    t.DefaultObject = function(type){
        var newObj = {};
        Object.keys(defaults[type])._each(key=>{
            newObj[key] = defaults[type][key] != null ? defaults[type][key] : null;
        });
        return newObj;
    };

    t.Median = function (arro, order = true) {
        var arr = arro.slice();
        if (order)
            arr = arr._orderBy(x => x);
        var half = Math.floor(arr.length / 2);
        return arr[half];
    }

    t.DoneCollector = class DoneCollector{
        constructor(length, done){
            this.length = length;
            if(done)
                this.complete = done;
            this.allData = new Array(length);
        }

        //done()() may be needed here
        done(index){
            var t = this;
            return function(data){
                t.length--;
                t.allData[index] = data;

                if(t.length <= 0)
                    t.complete(t.allData);
            }
        }

        allDone(done){ this.complete = done; }
    }

    t.Queue = class Queue {
        constructor() {
            this.data = {};
            this.head = 0;
            this.tail = 0;
            this.length = 0;
        }

        enQ(item, max) {
            this.data[this.tail] = item;
            this.tail++;
            if (this.tail > max)
                this.deQ();

            this.length = this.tail - this.head;
        };

        deQ() {
            let item = this.data[this.head];
            delete this.data[this.head];
            this.head++;

            this.length = this.tail - this.head;
            return item;
        };

        array() {
            return Object.values(this.data);
        }
    }

    t.IQR = function (arro) { //outlier resistance way of telling variance
        if (arro.length == 1) return 0;
        var arr = arro.slice()._orderBy(x => x);
        var half = Math.floor(arr.length / 2);
        var arrTop = arr.splice(0, half);
        var arrBot = arr.splice(-half);

        return t.Median(arrBot, false) - t.Median(arrTop, false);
    };

    //obsolete now, cause of Map
    t.List = function (obj) {
        if (!obj) return [];
        var nlist = [];

        if ('next' in obj) {
            for (var jn = obj; jn; jn = jn.next) nlist.push(jn);
            return nlist;
        }
        if ('m_next' in obj) {
            for (var jn = obj; jn; jn = jn.m_next) nlist.push(jn);
            return nlist;
        }

        return Object.keys(obj).map(function (key) {
            return obj[key];
        });
    };

    t.Extensions = function () {
        //LINQ pseudo.. pick == select
        Array.prototype._select = function (func) {
            return t.Select(this, func);
        };
        Array.prototype._each = function (func) {
            return t.Select(this, func);
        };
        Array.prototype._orderBy = function () {
            return t.OrderBy(this, arguments);
        };
        Array.prototype._max = function (func) {
            return t.Max(this, func, true);
        };
        Array.prototype._min = function (func) {
            return t.Max(this, func, false);
        };
        Array.prototype._avg = function () {
            var sum = 0;
            this._each(x => { sum += x });
            return sum / this.length;
        };
        Array.prototype._where = function (func) {
            return t.Where(this, func);
        };
        Array.prototype._any = function (func) {
            return t.Where(this, func).length > 0;
        };
        Array.prototype._first = function (func) {
            return t.First(this, func);
        };

        Map.prototype._where = function (func) { return t.WhereMap(this, func); };
        Map.prototype._each = function (func) { return t.WhereMap(this, func); };
        Map.prototype._any = function (func) { return (t.WhereMap(this, func).length > 0); };
        Map.prototype._first = function (func) { return t.WhereMap(this, func)[0]; };

        Object.defineProperty(Object.prototype, "_each", {
            value: function (func) { return t.SelectObj(t.List(this), func); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_where", {
            value: function (func) { return t.Where(t.List(this), func); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_any", {
            value: function (func) { return (t.Where(t.List(this), func).length > 0); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_first", {
            value: function (func) { return t.First(t.List(this), func); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_orderBy", {
            value: function (func) { return t.OrderBy(t.List(this), arguments); },
            enumerable: false, writable: true
        });
        Object.defineProperty(String.prototype, 'hashCode', {
            value: function () {
                var hash = 0, i, chr;
                for (i = 0; i < this.length; i++) {
                    chr = this.charCodeAt(i);
                    hash = ((hash << 5) - hash) + chr;
                    hash |= 0; // Convert to 32bit integer
                }
                return hash;
            }
        });
    };

    if (typeof $ != 'undefined') {
        $.prototype._select = function (func) {
            return t.Select(this, func);
        };
        $.prototype._onoff = function (e1, e2, e3) {
            if (e3)
                $(this).off(e1, e2).on(e1, e2, e3);
            else
                $(this).off(e1).on(e1, e2);
            return $(this);
        };
    }

    t.Iterate = function (iterable) {

    };

    t.SelectObj = function (objs, func) {
        var filtered = [];
        var index = 0;
        var vals = Object.values(objs);
        vals.forEach(val => {
            filtered.push(func(val, index, vals.length));
        });
        return filtered;
    };

    t.Select = function (objs, func) {
        var filtered = [];
        for (var i = 0; i < objs.length; i++)
            filtered.push(func(objs[i], i, objs.length));
        return filtered;
    };

    t.SelectMap = function (objs, func) {
        var filtered = [];
        objs.forEach((ta, key) => { filtered.push(func(ta, key)); });
        return filtered;
    };

    t.Where = function (objs, func) {
        var filtered = [];
        for (var i = 0; i < objs.length; i++) {
            if (!func || func(objs[i]))
                filtered.push(objs[i]);
        }
        return filtered;
    };

    t.WhereMap = function (objs, func) {
        var filtered = [];
        objs.forEach((ta, key) => {
            if (!func || func(ta))
                filtered.push(ta);
        });
        return filtered;
    };

    t.First = function (objs, func) {
        if (func)
            objs = t.Where(objs, func);
        if (objs.length > 0)
            return objs[0];
        return null;
    };

    t.Max = function (objs, func, isMax) {
        var max = null;
        var maxObj = null;
        for (var i = 0; i < objs.length; i++) {
            if (max == null || (isMax ? (func(objs[i]) > max) : (func(objs[i]) < max))) {
                max = func(objs[i]);
                maxObj = objs[i];
            }
        }
        return maxObj;
    };

    t.OrderBy = function (objs, args) {
        var orderedList = objs;
        orderedList.sort(function (a, b) {
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                var a1 = (arg(a) ? arg(a) : null);
                var a2 = (arg(b) ? arg(b) : null);

                if (typeof a1 == 'string')
                    return a1.localeCompare(a2);
                if (a1 != a2)
                    return a1 - a2;
            }
        });
        return orderedList;
    };

    t.on = function (ev, uid, done) {
        var evt = t.Events[ev] ? t.Events[ev] : { ev, subevents: {} };
        evt.subevents[uid] = done;
        t.Events[ev] = evt;
    };

    t.off = function (ev, uid) {
        var evt = t.Events[ev] ? t.Events[ev] : { ev, subevents: {} };
        if (evt.subevents[uid])
            delete evt.subevents[uid];
    };

    t.trigger = function (ev, stuff) {
        if (t.Events[ev]) {
            Object.keys(t.Events[ev].subevents)._each(key => {
                t.Events[ev].subevents[key](stuff);
            });
        }
    };

}(typeof exports === 'undefined' ? UT : exports));

/* ======== Twelev47 support@example.com ======== */ 
/* ======== Twelev47 support@example.com ======== */ 
//xgame v1.01 : window resize errors
//gravity == 0.285

//G
var G = {};

(function (G) {
    G.IsServer = typeof exports !== 'undefined';
    G.StartWidth_ = 1920;
    G.StartHeight_ = 1080;
    G.Loader_ = !G.IsServer ? PIXI.Loader.shared : null;
    //threejs stuff
    G.Loader2 = !G.IsServer ? new THREE.TextureLoader() : null;
    G.pad = { index: null, x: 0, y: 0 };
    G.ObjectsToAdd = [];
    G.ObjectsToRemove = [];
    G.tickActions_ = new Map();
    G.Objs = new Map();
    G.cycleAvg = G.renderAvg = G.packetAvg = G.avgTotal = 0;
    G.EngineBehind = 0;
    G.RenderBehind = 0;
    G.bounds = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    G.Dudes = [];
    G.reOrderNeeded = false;
    G.lerps = {};

    G.Init_ = function (con, onLoad) {
        PL = planck;
        PL.v2 = PL.Vec2;
        PL.internal.Settings.maxPolygonVertices = 48;

        G.FRate_ = 100 / 3;
        G.Width = G.Width ? G.Width : G.StartWidth_;
        G.Height = G.Height ? G.Height : G.StartHeight_;
        G.HasServer = typeof (SN) != 'undefined';
        G.tickActions_.clear();
        G.Tick = G.RTick = G.ATick = 0;
        G.tslf = new UT.Queue();
        G.renderTimes = new UT.Queue();
        G.cycleTimes = new UT.Queue();
        G.packetTimes = new UT.Queue();
        G.LastTime_ = Date.now();
        G.LastAccumTime_ = Date.now();
        G.LastPivotPos = { x: 0, y: 0 };
        G.pscale = 30;
        G.pause = false;
        G.gravity = 70;//60
        G.con = con;
        G.ObjTicker = 0;
        G.Dudes = [];

        if (!G.World_) {
            G.World_ = planck.World(PL.Vec2(0, G.gravity));
            G.Events_();
        }

        if (!G.IsServer) {
            var firstRender = G.Renderer2 == null;

            if (firstRender) {
                //fov/aspect/near/far   1/860
                G.Cam = new THREE.PerspectiveCamera(60, G.Width/G.Height, 500, 860);


                var aspect = G.Width / G.Height;
                G.Cam = new THREE.OrthographicCamera(G.Height * aspect / -2, G.Height * aspect / 2, G.Height / 2, G.Height / -2, 1, 2000);
                G.Cam.position.set(0, 0, 800);

                G.Renderer2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
                G.Renderer2.shadowMap.enabled = true;

                //G.Renderer2.shadowMap.type = THREE.PCFShadowMap;
                G.Renderer2.setSize(G.Width, G.Height);

                G.Scene = new THREE.Scene();


                //G.Scene.background = new THREE.Color(0x333333); //background color
                var ambient = new THREE.AmbientLight(0xadbb93, 0.21);//404040
                G.Scene.add(ambient);

                var directionalLight = new THREE.DirectionalLight(0xffffff, 1.6);
                G.DirLight = directionalLight;

                G.DirLight.shadow.mapSize.width = 1024;
                G.DirLight.shadow.mapSize.height = 1024;

                G.DirLight.shadow.camera.near = 5;
                G.DirLight.shadow.camera.far = 2000;

                G.DirLight.shadow.camera.right = G.Width * 1;
                G.DirLight.shadow.camera.left = -G.Width * 1;
                G.DirLight.shadow.camera.top = G.Height * 1;
                G.DirLight.shadow.camera.bottom = -G.Height * 1;


                G.DirLight.castShadow = true;
                G.DirLight.target.position.set(0, 0, -300);//-250
                G.DirLight.position.set(-200, 200, 400);//300

                //-2 vs -31
                //800 = cam pos
                //G.Scene.fog = new THREE.Fog(0x180946, 795, 855);//795 855  790 815

                //G.DirLight.target.position.set(-500, 1,200);
                G.Scene.add(G.DirLight);
                G.Scene.add(G.DirLight.target);


                /*
                G.badPass = new THREE.ShaderPass(THREE.BadTVShader);
                G.filmPass = new THREE.ShaderPass(THREE.FilmShader);
                G.rgbPass = new THREE.ShaderPass(THREE.RGBShiftShader);

                GU.DefaultUniforms();

                G.composer = new THREE.EffectComposer(G.Renderer2, G.renderTarget);
                G.composer.setSize(500, 500);
                G.composer.addPass(new THREE.RenderPass(G.Scene, G.camera));
                G.composer.addPass(G.filmPass);
                G.composer.addPass(G.badPass);
                G.composer.addPass(G.rgbPass);

                G.composer.addPass(new THREE.ShaderPass(THREE.CopyShader));
                G.composer.renderToScreen = true;


                G.planemateriala = new THREE.MeshBasicMaterial({
                    map: G.renderTarget.texture,
                });
                */

                /*
                var scale = 200;
                var planegeometrya = new THREE.PlaneGeometry(1 * scale, scale * 1, scale * 1, 1 * scale);
                G.planemateriala = new THREE.MeshBasicMaterial({
                    map: G.renderTarget.texture,
                });
                var planea = new THREE.Mesh(planegeometrya, G.planemateriala);
                planea.position.x = 400;
                G.Scene.add(planea);*/

            }

            PIXI.Ticker.shared.autoStart = false;
            PIXI.Ticker.shared.stop();

            if (firstRender) {
                con.appendChild(G.Renderer2.domElement);

                //G.render.domElement.style.border = '10px solid black';
                //con.appendChild(G.render.domElement);
            }
        }



        G.onLoad = onLoad;
        G.PlayReset_();
    };

    G.Events_ = function () {
        G.ends = [];
        G.begins = [];

        G.World_.on('begin-contact', function (contact) {
            G.begins.push({
                fixA: contact.getFixtureA(),
                fixB: contact.getFixtureB(),
                obA: G.Objs.get(contact.getFixtureA().oid),
                obB: G.Objs.get(contact.getFixtureB().oid),
                contact
            });
        });
        G.World_.on('end-contact', function (contact) {
            G.ends.push({
                fixA: contact.getFixtureA(),
                fixB: contact.getFixtureB(),
                obA: G.Objs.get(contact.getFixtureA().oid),
                obB: G.Objs.get(contact.getFixtureB().oid),
                contact
            });
        });
    }

    G.InitObj = function (type, oid) {
        if (oid)
            eval('var ob = new ' + type + "('" + oid + "', '" + type + "');");
        else
            eval('var ob = new ' + type + "(null, '" + type + "');");
        return ob;
    };

    G.LoadObj = function (obj, state) {
        if (state)
            Object.keys(state)._each(key => { obj[key] = state[key]; });
        obj.loadProps = JSON.parse(JSON.stringify(state));//creates copy
        G.AddObject(obj);
        return obj;
    }

    G.InitLoad = function (oid, type, state) {
        var obj = G.InitObj(type, oid);
        return G.LoadObj(obj, state);
    };

    G.AddObject = function (obj) {
        G.ObjectsToAdd.push(obj);
    };

    G.AddObjectHelp_ = function (obj) {
        if (G.Objs.has(obj.oid))
            G.RemoveObjectHelp_(G.Objs.get(obj.oid));
        G.Objs.set(obj.oid, obj);

        if (obj.IsPlayer)
            G.Dudes = G.Objs._where(x => x.IsPlayer);
    }

    G.RemoveObject_ = function (obj) {
        G.ObjectsToRemove.push(obj);
    };

    G.RemoveObjectHelp_ = function (obj) {
        if (obj && !obj.removedObject) {
            obj.children._each(c => { G.RemoveObject_(c); });

            var stage = obj.stage;
            obj.removedObject = true;

            if (obj.OnRemove)
                obj.OnRemove();

            if (obj.parentObj)
                obj.parentObj.children = obj.parentObj.children._where(x => x.removedObject == null);

            obj.parts._each(part => {


                part.grs._each(gr => {
                    //stage.removeChild(gr); 

                    G.Scene.remove(G.Scene.getObjectById(gr.id));
                });
            });

            G.World_.destroyBody(obj.con);
            G.Objs.delete(obj.oid);

            if (obj.IsPlayer)
                G.Dudes = G.Objs._where(x => x.IsPlayer);
        }
    }

    G.TickFunc_ = function (delta) {
        G.TickInputCheck_();

        G.Objs.forEach(ob => {
            ob.Tick(delta);
        });

        G.ObjectsToRemove._each(x => { G.RemoveObjectHelp_(x); });

        if (G.ObjectsToAdd.length > 0) {
            G.reOrderNeeded = true;
            if (G.objOrder)
                G.ObjectsToAdd = G.ObjectsToAdd._orderBy(x => G.objOrder[x.oid]);

            var l1 = G.ObjectsToAdd.length;
            for (var i = 0; i < l1; i++) {
                if (!G.ObjectsToAdd[i].parentObj)
                    G.ObjectsToAdd[i].Init();
            }

            if (G.objOrder) {
                G.ObjectsToAdd = G.ObjectsToAdd._orderBy(x => G.objOrder[x.oid]);
                G.objOrder = null;
            }

            G.ObjectsToAdd._each(x => { G.AddObjectHelp_(x); });
        }

        G.ObjectsToAdd = [];
        G.ObjectsToRemove = [];
    };

    G.TickForward_ = function () {
        G.Tick++;
        if (G.HasServer && !G.IsServer && CN)
            CN.ServerTick_++;
    };

    G.PostPhysics_ = function () {
        G.begins._each(b => {
            if (b.obA && b.obB) {
                b.obA.refreshData(); b.obB.refreshData();
                if (b.obA.CollideStart)
                    b.obA.CollideStart({ myType: b.fixA.etype, oType: b.fixB.etype, other: b.obB, t: b.obA, contact: b.contact, myFix: b.fixA, oFix: b.fixB });
                if (b.obB.CollideStart && b.obA.oid != b.obB.oid)
                    b.obB.CollideStart({ myType: b.fixB.etype, oType: b.fixA.etype, other: b.obA, t: b.obB, contact: b.contact, myFix: b.fixB, oFix: b.fixA });
            }
        });
        G.ends._each(b => {
            if (b.obA && b.obB) {
                b.obA.refreshData(); b.obB.refreshData();
                if (b.obA.CollideEnd)
                    b.obA.CollideEnd({ myType: b.fixA.etype, oType: b.fixB.etype, other: b.obB, t: b.obA, contact: b.contact, myFix: b.fixA, oFix: b.fixB });
                if (b.obB.CollideEnd && b.obA.oid != b.obB.oid)
                    b.obB.CollideEnd({ myType: b.fixB.etype, oType: b.fixA.etype, other: b.obA, t: b.obB, contact: b.contact, myFix: b.fixB, oFix: b.fixA });
            }
        });
        G.begins = [];
        G.ends = [];

        G.Objs.forEach(ob => {
            ob.PostPhysics();

            if (ob.IsServerObject) { //ob.IsServerObject){//ob.IsServerObject){

                var old = {
                    stick: G.IsServer ? G.Tick : (ob.IsGuy ? CN.ServerTick_ : CN.ServerTick_ - CN.InterpDelay_),
                    pos: { x: ob.pos.x, y: ob.pos.y },
                    vel: { x: ob.vel.x, y: ob.vel.y },
                    angle: ob.con.getAngle(),
                    state: {},
                };
                if (ob.state) {
                    //old.state = ob.GetState();
                    if (ob.IsGuy)
                        ob.state._each(key => { old.state[key] = ob[key]; });
                    ob.olds.enQ(old, 10);

                    if (ob.IsServerObject && !G.IsServer && G.HasServer)
                        CN.Interpolate_(ob);
                }
            }
        });

        //needs to be here so roundedSync happens same instant

        if (G.IsServer) //putting this after collision - for server SN.ApplyInput_'s
            SN.PostPhysics_(); //sends out packets on the server
    };

    //subTick 1->4
    G.RenderFunc_ = function (mainTick, rate, delta) {
        //var mainTick = !G.hasUpdatedRender;
        G.hasUpdatedRender = true;
        G.RTick = Math.min(G.Tick, G.RTick + rate); //(delta / G.FRate_);
        G.ATick += (delta / G.FRate_);

        if (!G.IsServer) {
            if (mainTick)
                Parts.UpdateParticles();
            //G.UpdateParticles_(mainTick);

            if (!G.bounds)
                G.bounds = { buffer: 700, min: {}, max: {} }

            G.bounds.buffer = 700;
            G.bounds.min.x = G.Cam.position.x - (G.Width / G.Cam.zoom) * 0.5;
            G.bounds.min.y = -G.Cam.position.y - (G.Height / G.Cam.zoom) * 0.5;
            G.bounds.max.x = G.Cam.position.x + (G.Width / G.Cam.zoom) * 0.5;
            G.bounds.max.y = -G.Cam.position.y + (G.Height / G.Cam.zoom) * 0.5;

            //Screen Movement detection (performance)
            if (mainTick) {
                //Calc the Edges of the scren

                var pivotDelta = G.dist(G.LastPivotPos, G.Cam.position);
                G.ScreenMoved = false;
                if (pivotDelta > (G.bounds.buffer * 0.5)) {
                    G.ScreenMoved = true;
                    G.LastPivotPos.x = G.Cam.position.x;
                    G.LastPivotPos.y = G.Cam.position.y;
                }
            }
        }

        //var pct = (G.acc_ + (Date.now() - G.old60)) / G.FRate_;
        //pct = mainTick ? 0.5 : 1;
        var tickDiff = G.Tick - G.RTick;
        var tickDiffRnd = Math.floor(tickDiff);
        var pct = 1 - (tickDiff % 1);// Math.ceil(tickDiff) - tickDiff;
        //console.log(tickDiff + " " + pct);

        G.Objs.forEach(ob => {
            if (!G.IsServer) {
                ob.PreRender(mainTick, tickDiffRnd, pct, rate);
                ob.Render(mainTick, tickDiffRnd, pct, rate);
            }
        });

        //camera stuff
        //switch to a basic Camera Trap.  Box which you can pass from cenx/ceny
        if (typeof CN != 'undefined' && CN.Guy) {

            //G.Stage_.x = -(CN.Guy.interpX - (G.Width / G.Stage_.scale.x)/2);
            //G.Stage_.y = -(CN.Guy.interpY -(G.Height / G.Stage_.scale.x)/2);

            var settings = { xpct: 0.5, ypct: 0.65, boxWidth: 40, boxHeight: 100 };
            if (CN.Guy.cameraSettings)
                Object.assign(settings, CN.Guy.cameraSettings);


            var cenx = (G.Cam.position.x);
            var ceny = -(G.Cam.position.y);
            //G.Cam.position.x = (G.Width) * settings.xpct;
            //G.Cam.position.y = -((G.Height) * settings.ypct);

            //G.Stage_.pivot.x = CN.Guy.interpX;// - ((G.Width / G.Stage_.scale.x) / 2);
            //G.Stage_.pivot.y = CN.Guy.interpY;// - ((G.Height / G.Stage_.scale.x) / 2);

            if (CN.Guy.interpX > (cenx + settings.boxWidth))
                G.Cam.position.x = (CN.Guy.interpX - settings.boxWidth);
            if (CN.Guy.interpX < (cenx - settings.boxWidth))
                G.Cam.position.x = (CN.Guy.interpX + settings.boxWidth);

            if (CN.Guy.interpY < (ceny - settings.boxHeight))
                G.Cam.position.y = -(CN.Guy.interpY + settings.boxHeight);
            if (CN.Guy.interpY > (ceny + settings.boxHeight))
                G.Cam.position.y = -(CN.Guy.interpY - settings.boxHeight);


                /*
            G.DirLight.position.x = G.Cam.position.x + 150;
            G.DirLight.position.y = G.Cam.position.y - 350;
            G.DirLight.target.position.x = G.Cam.position.x - 100;
            G.DirLight.target.position.y = G.Cam.position.y + 100;*/

            if (CG.UpdatePointer && mainTick)
                CG.UpdatePointer();
        }

        if (G.Shake && mainTick) {

            var xdir = Math.random() > 0.5 ? 1 : -1;
            var ydir = Math.random() > 0.5 ? 1 : -1;
            G.Cam.position.x += xdir * G.Shake * 0.75;
            G.Cam.position.y += ydir * G.Shake * 0.75;
            G.Shake = G.Shake * 0.4;
            if (G.Shake < 0.1)
                G.Shake = null;
        } else if (!G.Shake) {
            G.Cam.position.x = 0;
            G.Cam.position.y = 0;
        }

    };

    /*
    G.UpdateParticles_ = function(mainTick){

        G.ParticleContainers.forEach((con,key)=> {
            if (mainTick || con.alwaysUpdate) {
                for (var i = 0; i < con.children.length; i++) {
                    var p = con.children[i];
                    p.rx += p.vel.x;
                    p.ry += p.vel.y;
                    p.x = p.rx;
                    p.y = p.ry;

                    if (p.scaleVel) {
                        p.scale.x += p.scaleVel.x;
                        p.scale.y += p.scaleVel.y;
                    }
                    if (p.rotVel)
                        p.rotation += p.rotVel;

                    if (p.decay)
                        p.life--;

                    p.alpha = p.life / p.maxLife;

                    if (p.func)
                        p.func(p);

                    if (p.life <= 0) {
                        //con.removeChild(p);
                        p.destroy();
                    }
                }
            }
        });
    }*/

    G.Cleanup_ = function (x, y) {
        return;
        //physics
        console.log('G.Cleanup_');
        G.Objs.clear();
        UT.List(G.World_.getBodyList())._each(b => G.World_.destroyBody(b));
        UT.List(G.World_.getContactList())._each(b => G.World_.destroyContact(b));
        UT.List(G.World_.getJointList())._each(b => G.World_.destroyJoint(b));

        if (!G.IsServer && G.Scene) {

            for (var i = G.Scene.children.length - 1; i >= 0; i--) {
                obj = G.Scene.children[i];
                if (!obj.isLight && obj.id != G.DirLight.target.id)
                    G.Scene.remove(obj);
            }
        }
    };

    G.PlayReset_ = function (x, y) {
        G.Cleanup_(x, y);

        if (G.onLoad)
            G.onLoad();
        UT.trigger('g_init');

        //SERVER SIDE LOOOOP=======================
        var fpsInt = Math.ceil(G.FRate_);
        G.old60 = Date.now();
        G.old60r = Date.now();
        G.LastRender = Date.now();
        G.LastFinishedTime = Date.now() - 100;
        G.acc_ = 0;
        G.deltaStore_ = 0;

        if (G.IsServer) {

            G.Loop_ = function () {
                if (G.pause) return;

                var info = G.basicLoop_();
                G.CalcStats(info);

                if ((Date.now() - G.old60) < (fpsInt - 4))
                    G.ttServer1 = setTimeout(G.Loop_);
                else
                    G.ttServer2 = setImmediate(G.Loop_);

                G.ttime = Date.now();
            };
            G.Loop_();
        } else { //CLIENT SIDE LOOOP------------------

            if (G.AnimationRequest_ != null)
                cancelAnimationFrame(G.AnimationRequest_);
            if (G.RenderRequest_ != null)
                cancelAnimationFrame(G.RenderRequest_);

            G.anim = function () {
                G.AnimationRequest_ = requestAnimationFrame(G.anim);
                var info = G.basicLoop_();
                G.CalcStats(info);
            }
            G.anim();

        }
    };

    G.CalcStats = function (basicLoopInfo) {
        if (basicLoopInfo.engineStart) {
            G.cycleTimes.enQ(basicLoopInfo.engineStop - basicLoopInfo.engineStart, 10);
            G.cycleAvg = G.cycleTimes.array()._avg();//G.cycleTimes._max(x => x);
            if (G.IsServer)
                G.packetAvg = Object.values(G.packetTimes.data)._avg();
            G.avgTotal = G.renderAvg * 2 + G.cycleAvg + G.packetAvg;
        }
        if (basicLoopInfo.renderStart) {
            G.renderTimes.enQ(Date.now() - basicLoopInfo.renderStart, 10);
            G.renderAvg = G.renderTimes.array()._avg();// G.renderTimes._max(x => x);
        }
        if (basicLoopInfo.renderStart || basicLoopInfo.engineStart) {
            G.tslf.enQ(basicLoopInfo.time - G.LastFinishedTime, 10);
            G.SinceLastAvg = G.tslf.array()._avg();
            G.LastFinishedTime = Date.now();
        }
    }

    G.basicLoop_ = function () {
        var renderStart = null;
        var engineStart = null;
        var engineStop = null;
        var time = Date.now();
        var mainTickTriggered = false;
        G.deltaStore_ += (time - G.old60);
        G.acc_ += (time - G.old60);
        G.old60 = time;
        G.LastAccumTime_ = time;
        G.TimeStep = 1 / G.FRate_;

        if (G.acc_ >= G.FRate_) {
            engineStart = Date.now();
            if (!G.IsServer)
                G.CheckGamepad();

            G.hasDoneSecondRender = false;
            G.hasUpdatedRender = false;
            mainTickTriggered = true;
            G.TickFunc_(G.deltaStore_ / G.FRate_);
            G.deltaStore_ = 0;

            G.World_.step(G.TimeStep);

            G.PostPhysics_();
            //G.RenderFunc_(true); //interpolation ?? vel changes

            G.TickForward_();
            G.LastTime_ = Date.now();
            G.LastAccumTime_ = G.LastTime_;
            G.acc_ = G.acc_ - G.FRate_;

            if (Math.abs(G.acc_) >= G.FRate_ * 20) {
                UT.trigger('g_accum');
                G.acc_ = 0;
            }

            engineStop = Date.now();
            UT.trigger('g_tick');
            //return { time: update, main: true };
        }

        if (G.acc_ > (G.FRate_))
            G.EngineBehind = Math.max(60, G.EngineBehind + 2);
        else if (G.EngineBehind > 0)
            G.EngineBehind--;

        if (!G.IsServer) {
            var time = Date.now();
            G.old60r = time;
            var timeSinceLast = time - G.LastRender;
            var ticksBehind = G.Tick - G.RTick;
            G.renderFreq = (G.EngineBehind || G.avgTotal > 21) ? 1 : 0.6; //0.5 == 60fps if FRate=33.33.  increase to lower render rate

            if (ticksBehind > 4)
                G.RTick = G.Tick - G.renderFreq;

            if (mainTickTriggered || (ticksBehind >= G.renderFreq && timeSinceLast > 10 && !G.EngineBehind)) {
                var renderStart = time;
                var behind = ticksBehind > 2;

                G.LastRender = Date.now();
                G.RenderFunc_(mainTickTriggered, (behind ? (G.renderFreq + 0.2) : G.renderFreq), timeSinceLast);

                PIXI.Ticker.shared.update(Date.now());

                G.Renderer2.render(G.Scene, G.Cam);
            }

            if ((G.Tick - G.RTick) > 1.1) {
                G.RenderBehind = Math.max(30, G.RenderBehind + 2);
            }
            else if (G.RenderBehind > 0)
                G.RenderBehind--;
        }

        if (renderStart || engineStart) {
            G.tslf.enQ(time - G.LastFinishedTime, 10);
            G.SinceLastAvg = G.tslf.array()._avg();
            G.LastFinishedTime = Date.now();
        }

        return { renderStart, engineStart, engineStop, time };
    };

    G.CheckGamepad = function () {
        var pads = navigator.getGamepads();

        if (G.pad.index == null && pads[0]) {
            G.pad.index = 0;
            for (var i = pads.length - 1; i >= 0; i--) {
                if (pads[i] && pads[i].mapping.length > 0)
                    G.pad.index = i;
            }
        }

        if (G.pad.index != null) {
            var gp = pads[G.pad.index];
            var ax = 0.45;


            if (gp && CN.Guy) {
                // console.log(gp);

                for (var i = 0; i < 4; i++) {
                    var a = gp.axes[i];
                    var padplus = G.pad['aplus' + i];
                    var padminus = G.pad['aminus' + i];
                    var xAxis = i == 0 || i == 2;

                    if (i < 2) {
                        G.pad['aplus' + i] = a > ax ? 1 : 0;
                        G.pad['aminus' + i] = a < -ax ? 1 : 0;

                        if (a > ax && !padplus)
                            UT.trigger('key', { button: xAxis ? EN.Btns.get('right') : EN.Btns.get('down'), val: 1 });
                        else if (a < ax && padplus)
                            UT.trigger('key', { button: xAxis ? EN.Btns.get('right') : EN.Btns.get('down'), val: 0 });

                        if (a < -ax && !padminus)
                            UT.trigger('key', { button: xAxis ? EN.Btns.get('left') : EN.Btns.get('up'), val: 1 });
                        else if (a > -ax && padminus)
                            UT.trigger('key', { button: xAxis ? EN.Btns.get('left') : EN.Btns.get('up'), val: 0 });

                    } else {
                        var update = Math.abs(gp.axes[2]) > ax || Math.abs(gp.axes[3]) > ax;
                        if (update) {
                            if (xAxis)
                                G.pad['x'] = update ? a : 0;
                            else
                                G.pad['y'] = update ? a : 0;
                            G.activePad = true;
                        }

                    }
                }

                for (var i = 0; i < gp.buttons.length; i++) {
                    var b = gp.buttons[i];
                    var padv = G.pad['b' + i];
                    G.pad['b' + i] = b.value;

                    if (b.value && !padv) {
                        G.activePad = true;
                        UT.trigger('key', { button: i, val: 1 });
                    }
                    else if (!b.value && padv)
                        UT.trigger('key', { button: i, val: 0 });


                }
            }
        }
    }

    G.TogglePause = function (onoff) {
        if (!onoff) {
            clearInterval(G.ttServer1);
            clearImmediate(G.ttServer2);
        }
        if (G.pause && !onoff && G.IsServer) {
            G.pause = onoff;
            G.Loop_();
        }
        G.pause = onoff;
    }

    G.TickFunc = function (tick, func, func2, oid) {
        var id = G.UID_(true) + Date.now();

        if (func2 != null)
            G.tickActions_.set(id, { tick, key: null, val: null, func: func2, data: func, id, oid });
        else
            G.tickActions_.set(id, { tick, key: null, val: null, func, id, oid });

        return G.tickActions_.get(id);
    };

    G.TickAction = function (oid, tick, key, val, func) {
        var id = G.UID_(true) + Date.now();
        G.tickActions_.set(id, { tick, key, val, oid, func, id });
    };

    G.TickInputCheck_ = function () {

        G.tickActions_.forEach((ta, key) => {
            if (ta && G.Tick >= ta.tick) {
                if (!ta.oid || G.Objs.has(ta.oid)) {
                    if (ta.key)
                        G.Objs.get(ta.oid)[ta.key] = ta.val;
                    if (ta.func) {
                        if (ta.data != null)
                            ta.func(ta.data)
                        else
                            ta.func(ta.oid != null ? G.Objs.get(ta.oid) : null, ta.key, ta.val);
                    }
                }
                G.tickActions_.delete(key);
            }
        });
    };

    G.HandleAnimations = function (x, gobj, isGraphic) {
        if (x.animate) {
            if (!x.astarted && x.animate.active) {
                x.astarted = true;
                x.aTime = Math.floor(G.Tick);
            }

            if (!x.animate.active)
                x.astarted = false;//x.aTime = G.Tick;

            //done
            if (x.astarted && G.Tween(x, gobj, isGraphic)) {
                var dfunc = x.animate.done;

                if (!x.animate.repeat) {
                    gobj.animations[x.animate.name].active = false;
                    x.animate.active = false;
                    x.astarted = false;
                }

                if (dfunc) dfunc();
            }

            if (!x.animate.active) {
                x.astarted = false;
            }
        }
        return x.animate && x.animate.active;
    };

    G.Tween = function (part, gobj, isGraph) {
        var type = part.animate.type ? part.animate.type : EN.Curves.get('linear');
        var period = part.animate.period;
        var states = part.animate.states;
        if (period == Infinity || period == null)
            return false;
        var tick = G.Tick - part.aTime;

        //if(tick%period==0 && tick > 0 && part.animate.repeat)
        //    states = states.reverse();
        if (tick > period && tick > 0 && part.animate.repeat) {
            part.aTime = Math.floor(G.Tick - (tick % period));
            if (!part.animate.loop)
                states = states.reverse();
        }

        var offset = (part.animate.offset != null ? part.animate.offset : 0);
        G.TweenMove(part, gobj, isGraph, G.TweenStep(states, period, (tick + offset) % (period + 1), type));

        //returns if it is done
        return (Math.floor(tick) + 1) > period && !part.animate.repeat;
    };

    G.TweenStep = function (states, period, tick, type) {
        var pct = tick / period;

        if (type == EN.Curves.get('sin')) {
            pct = Math.sin(Math.PI * 0.5 * tick / period);
        }
        else if (type == EN.Curves.get('quad'))
            pct = G.Quad(null, tick, 0, 1, period);
        else if (type == EN.Curves.get('cubic'))
            pct = G.Cubic(null, tick, 0, 1, period);

        var t1 = 1 / (states.length - 1);
        var key = Math.floor((states.length - 1) * pct);
        var t2 = pct - (t1 * key);
        var statePct = t2 / t1;

        var state = states[Math.min(key, states.length - 1)];
        if (!state) return;
        var nstate = states[(key + 1) % (states.length)];
        if (!nstate) return;


        return {
            x: state.x != null ? state.x + ((nstate.x - state.x) * statePct) : null,
            y: state.y != null ? state.y + ((nstate.y - state.y) * statePct) : null,
            ang: state.ang != null ? state.ang + ((nstate.ang - state.ang) * statePct) : null,
            scale: state.scale != null ? state.scale + ((nstate.scale - state.scale) * statePct) : null,
            scaleX: state.scaleX != null ? state.scaleX + ((nstate.scaleX - state.scaleX) * statePct) : null,
            scaleY: state.scaleY != null ? state.scaleY + ((nstate.scaleY - state.scaleY) * statePct) : null,
            opac: state.alpha != null ? state.alpha + ((nstate.alpha - state.alpha) * statePct) : null,
            z: state.z != null ? state.z + ((nstate.z - state.z) * statePct) : null,
        };
    };

    G.TweenMove = function (part, gobj, isGraphic, step) {
        var x = step.x;
        var y = step.y;
        var angle = step.ang;

        if (isGraphic) {
            var dir = (part.orient ? gobj.orient : part.animate.dir);
            if (x != null)
                part.wx = (part.ogx + x) * dir;
            if (y != null)
                part.wy = part.ogy + y;

            if (step.z != null)
                part.z = step.z;
            if (angle != null)
                part.wa = part.oga * dir + angle * dir;
            if (step.scale != null) {
                part.scale.y = step.scale * part.ogscaleY;
                part.scale.x = step.scale * part.ogscaleX * dir;
            }
            if (step.scaleX != null)
                part.scale.x = step.scaleX * part.ogscaleX * dir;
            if (step.scaleY != null)
                part.scale.y = step.scaleY * part.ogscaleY;

            if (step.opac != null)
                part.grAlpha = step.opac;

        } else {
            //real object animations?
        }
        return part;
    };

    //----------------------------------------------------------------------------------------

    //0->16  Mask is stuff you can hit?
    //generic = 0, dude = 1, terrain = 2, gate=5, punchbox=6,hurtbox=7 hurtbox=8(t2)
    //--- serverTerrain = 14, delayTerrain = 15 (moving plats)
    G.cats = [0x0001, 0x0002, 0x0004, 0x0008, 0x0010, 0x0020,
        0x0040, 0x0080, 0x0100, 0x0200, 0x0400, 0x0800, 0x1000, 0x2000, 0x4000, 0x8000];

    G.Default = {
        color: 0x000000,
        lineColor: 0x000000,
        alignment: 1, //  (0.5 = middle, 1 = outer, 0 = inner).
        zIndex: 0
    };

    /*
    G.ToImg = function(gr, filter, ops, size){

        var ft = G.filterTex(filter, 28, gr, {});
        return G.image(null, ft, ops);
    }*/

    //sprite to FX texture?
    /*
    G.filterTex = function (filter, pad, gr, ops = {}) {
        if(filter){
            filter.padding = pad * 2;
            gr.filters = [filter];
        }

        gr.pivot.set(0, 0);
        
        Object.assign(gr, ops);
        var bounds = gr.getLocalBounds();

        var dx = 0 - bounds.x;
        var dy = 0 - bounds.y;
        bounds.x += dx;
        bounds.y += dy;
        gr.x += dx;
        gr.y += dy;

        return G.Renderer_.generateTexture(gr, null, null, new PIXI.Rectangle(
            bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2
        ));
    }*/

    //Three.js stuff new
    G.Default3 = {
        scaleX: 1,
        scaleY: 1,
        size: 1,
        z: 0,
    };


    G.Image = function (material, ops = {}) {
        var mat = material.clone();
        var gr = new THREE.Sprite(mat);

        if (!ops.z)
            ops.z = 1;
        if (!ops.size)
            ops.size = 1;
        if (!ops.height)
            ops.height = ops.width;

        if (ops.scaleX) {
            gr.scale.set(material.map.source.data.width * ops.scaleX,
                material.map.source.data.height * ops.scaleY, 1);
        } else {
            gr.scale.set(material.map.source.data.width * ops.size,
                material.map.source.data.height * ops.size, 1);
        }

        //gr.center.set(0,0);

        Object.assign(gr, ops);

        return gr;
    },

        G.Plane = function (material, ops = {}) {
            /*
            var scale = 200;
            var planegeometrya = new THREE.PlaneGeometry(1 * scale, scale * 1, scale * 1, 1 * scale);
            G.planemateriala = new THREE.MeshBasicMaterial({
                map: G.renderTarget.texture,
            });
            var planea = new THREE.Mesh(planegeometrya, G.planemateriala);
            planea.position.x = 400;*/
            var h = material.map.source.data.height;
            var w = material.map.source.data.width;
            var mat = material.clone();
            var geo = new THREE.PlaneGeometry(w, h, w, h);
            var gr = new THREE.Mesh(geo, mat);

            if (ops.size != null)
                gr.scale.set(1 * ops.size, 1 * ops.size, 1);

            Object.assign(gr, ops);

            return gr;
        },

        G.CirclePoints = function (rad, segments) {
            var points = [];
            var ang = 0;
            var interval = (Math.PI * 2) / segments;

            for (var i = 0; i < segments; i++) {
                points.push({ x: rad * Math.cos(ang), y: rad * Math.sin(ang) })
                ang += interval;
            }

            return points;
        }

    G.GeoExtrude = (verts, ops) => {
        var shape = new THREE.Shape(verts);
        var settings = ops;
        if (ops.bevel)
            Object.assign(settings, { bevelThickness: 6, bevelSize: 4, bevelSegments: 5, bevelOffset: -4 });

        return new THREE.ExtrudeGeometry(shape, settings);
    }

    G.ShapeCircle = function (mat, ops = {}) {
        if (!mat)
            mat = Parts.mats.blue;

        var points = G.CirclePoints(ops.radius ? ops.radius : 100, ops.segments ? ops.segments : 20);
        var geo = G.GeoExtrude(points, { depth: ops.depth ? ops.depth : 4 })

        return G.Shape(mat, geo, ops);
    }

    G.ShapeLine = function (mat, points, ops = {}) {
        if (!mat)
            mat = Parts.mats.blue;

        var geo = new THREE.BufferGeometry().setFromPoints(G.flipVerts(points));

        var gr = new THREE.Line(geo, mat);
        Object.assign(gr, ops);

        return gr;
    }

    G.ShapeBox = function (mat, width, height, ops = {}) {
        if (!mat)
            mat = Parts.mats.blue;
        var verts = [
            { x: -width / 2, y: -height / 2 },
            { x: width / 2, y: -height / 2 },
            { x: width / 2, y: height / 2 },
            { x: -width / 2, y: height / 2 }
        ];

        return G.Shape(mat, verts, ops);
    }

    G.GeoFromPath = function (path, ops) {
        if (!isNaN(path[0]))
            path = G.VertsFromPath(path);

        if (ops.rounded != null)
            path = G.roundedPath(path, ops.rounded);

        var geo = G.GeoExtrude(G.flipVerts(path), ops);

        var bbox = {};
        path._each((p, i) => {
            if (i == 0) {
                bbox.max = { x: p.x, y: p.y };
                bbox.min = { x: p.x, y: p.y };
            } else {
                if (p.x > bbox.max.x)
                    bbox.max.x = p.x;
                if (p.y > bbox.max.y)
                    bbox.max.y = p.y;
                if (p.x < bbox.min.x)
                    bbox.min.x = p.x;
                if (p.y < bbox.min.y)
                    bbox.min.y = p.y;
            }
        });

        geo.width = bbox.max.x - bbox.min.x;
        geo.height = bbox.max.y - bbox.min.y;

        if (!ops.noCenter)
            geo.center();
        return geo;
    }

    //extrude Geometry from a shape
    G.Shape = function (mat, shapeGeo, ops = {}) {
        var geo = shapeGeo;

        if (Array.isArray(shapeGeo)) {

            if (ops.rounded)
                shapeGeo = G.roundedPath(shapeGeo, 12);

            geo = G.GeoExtrude(G.flipVerts(shapeGeo), ops);

            if (!ops.noCenter)
                geo.center();
        }

        var gr = new THREE.Mesh(geo, mat);
        gr.castShadow = ops.shadow ? true : false;
        gr.receiveShadow = ops.shadow ? true : false;
        Object.assign(gr, ops);


        if (ops.size != null)
            gr.scale.set(ops.size, ops.size, gr.scale.z);
        if (ops.scaleX != null)
            gr.scale.set(ops.scaleX, gr.scale.y, gr.scale.z);
        if (ops.scaleY != null)
            gr.scale.set(gr.scale.x, ops.scaleY, gr.scale.z);
        if (ops.scaleZ != null)
            gr.scale.set(gr.scale.x, gr.scale.y, ops.scaleZ);

        //gr.position.z = ops.z != null ? ops. z: 0;
        return gr;
    }

    G.Sphere = function (mat, ops = {}) {
        var geo = new THREE.IcosahedronGeometry(ops.radius, 2);
        var gr = new THREE.Mesh(geo, mat);

        Object.assign(gr, ops);
        return gr;
    }

    G.roundedPath = function (path, radius = 10) {
        var t = this;
        var newPath = [];

        if (path[0].x != path[path.length - 1].x || path[0].y != path[path.length - 1].y) {
            path.push({ x: path[0].x, y: path[0].y });
        }

        for (var i = 0; i < path.length; i++) {
            var corner = null;

            if (i == 0)
                corner = G.roundedCorner(path[path.length - 2], path[0], path[1], radius)
            else if (i != path.length - 1)
                corner = G.roundedCorner(path[i - 1], path[i], path[i + 1], radius);

            if (corner)
                corner._each(c => { newPath.push(c); })
        }

        var nx = { x: newPath[0].x, y: newPath[0].y };
        if (newPath[newPath.length - 1].x != newPath[0].x || newPath[newPath.length - 1].y != newPath[0].y)
            newPath.push(nx);
        return newPath;
    },

        G.roundedCorner = function (p1, p2, p3, rad = 10, segments = 1) {
            //paralell lines towards center.
            var v1 = G.vnorm(G.vsub(p2, p1));
            var v2 = G.vnorm(G.vsub(p3, p2));

            var perpM1 = { x: -v1.y, y: v1.x };

            var similarity = G.vdot(perpM1, v2);
            if (similarity < 0)
                perpM1 = { x: v1.y, y: -v1.x };

            var offset11 = { x: p1.x + perpM1.x * rad, y: p1.y + perpM1.y * rad };
            var offset12 = { x: p2.x + perpM1.x * rad, y: p2.y + perpM1.y * rad };

            var perpM2 = { x: -v2.y, y: v2.x };
            var similarity = G.vdot(perpM2, v1);
            if (similarity > 0)
                perpM2 = { x: v2.y, y: -v2.x };
            var offset21 = { x: p3.x + perpM2.x * rad, y: p3.y + perpM2.y * rad };
            var offset22 = { x: p2.x + perpM2.x * rad, y: p2.y + perpM2.y * rad };

            var cept = G.intercept(offset11.x, offset11.y, offset12.x, offset12.y, offset22.x, offset22.y, offset21.x, offset21.y);

            //circle center
            if (cept) {
                var pnt1 = G.pointIntercept(p1, p2, cept);
                var pnt2 = G.pointIntercept(p3, p2, cept);

                pnt1_origin = G.vsub(pnt1, cept);
                pnt2_origin = G.vsub(pnt2, cept);


                var ang1 = Math.asin(pnt1_origin.x / rad);
                var ang2 = Math.asin(pnt2_origin.x / rad);

                ang1 = Math.atan2(pnt1_origin.y, pnt1_origin.x);
                ang2 = Math.atan2(pnt2_origin.y, pnt2_origin.x);

                var diff = G.AngDiff(ang2, ang1);
                var newAng = ang1 + diff * 0.5;
                var newPos = { x: cept.x + rad * Math.cos(newAng), y: cept.y + rad * Math.sin(newAng) };
                var newPath = [pnt1, newPos, pnt2]; //[pnt1, newPos, pnt2];

                return newPath;
            }
            return 0;
        },

        /*
            G.image = function(gr, texture, ops = {}){
                if (G.IsServer) return null;
                if (!gr) { gr = new PIXI.Sprite(); Object.assign(gr, G.Default); }
                Object.assign(gr, ops);
                gr.texture = texture;
                gr.pivot.set(gr.width / 2, gr.height / 2);
                if(ops.size)
                    gr.scale.set(gr.size, gr.size);
               
                if(ops.fitx){
                    gr.scale.x = ops.fitx / gr.width;
                    gr.scale.y = ops.fity / gr.height;
                }
        
                return gr;
            };*/

        /*
        G.circle = function(gr, radius, ops){
            if (G.IsServer) return null;
            if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
            Object.assign(gr, ops);
    
            gr.clear();
            if (gr.texture != null)
                gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
            else
                gr.beginFill(gr.color, gr.alpha);
    
            gr.lineStyle(gr.lineWidth, gr.lineColor, gr.lineAlpha, gr.alignment);
    
            gr.drawCircle(0, 0, radius);
            gr.endFill();
    
            if(ops.hole){
                gr.beginHole();
                gr.drawCircle(0,0, ops.hole);
                gr.endHole();
            }
    
            gr.filters = gr.filter ? [gr.filter] : null;
    
            return gr;
        };*/

        G.texMatrix = function (ops) {
            return new PIXI.Matrix(ops.tscale ? ops.tscale : 1, 0, 0, ops.tscale ? ops.tscale : 1, ops.tpivot ? ops.tpivot.x : 0, ops.tpivot ? ops.tpivot.y : 0)
        }


    G.center = function (verts) {
        return {
            x: (verts._min(v => v.x).x + verts._max(v => v.x).x) / 2,
            y: (verts._min(v => v.y).y + verts._max(v => v.y).y) / 2
        };
    }

    G.flipVerts = function (verts) {
        var newVerts = [];
        for (var i = 0; i < verts.length; i++) {
            newVerts.push({ x: verts[i].x, y: -verts[i].y })
        }
        return newVerts;
    }

    G.displaceVerts = function (verts, x, y) {
        verts._each(v => {
            v.x += x;
            v.y += y;
        });
        return verts;
    }

    G.offsetToCenter = function (verts) {
        var newPoints = [];
        var center = G.center(verts);

        for (var i = 0; i < verts.length; i++) {
            var v = verts[i];
            newPoints.push({ x: v.x - center.x, y: v.y - center.y });
        }
        return newPoints;
    }

    /*
    G.poly = function(gr, points, ops){
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        //gr.scale = {x:1,y:1};
        gr.clear();
        if (gr.texture)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);
        gr.lineStyle({ width: gr.lineWidth, color: gr.lineColor ? gr.lineColor : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha: 1, alignment: gr.alignment, join: 'round', cap: 'round'});

        var newPoints = points;

        if(ops.center !== false){
            var newPoints = G.offsetToCenter(points);
        }
        
        gr.drawPolygon(newPoints)

        gr.endFill();
        gr.filters = gr.filter ? [gr.filter] : null;
        //gr.scale = ops.scale;

        if (ops.size)
            gr.scale.set(gr.size, gr.size);
        //gr.pivot.set(gr.offx, gr.offy);
        return gr;
    };*/

    //name, gr, z, fps, canScale=false, isStatic=false
    /*
    G.particle = function(ops){
        var part = {};
        var activeScale = ops.canScale != null ? ops.canScale : false;
        var activeRotation = ops.canRotate != null ? ops.canRotate : false;

        part.con = new PIXI.ParticleContainer(1000, 
            { scale: activeScale, alpha: true, rotation: activeRotation});
        
        if(ops.gr.baseTexture)
            part.texture = ops.gr;
        else{
            ops.gr.pivot.set(0,0);
            part.texture = G.Renderer_.generateTexture(ops.gr);
        }

        part.con.gr = ops.gr;
        part.con.zIndex = ops.z!=null ? ops.z : 0;
        part.con.alwaysUpdate = ops.alwaysUpdate != null ? ops.alwaysUpdate : false;
        part.con.isStatic = ops.isStatic != null ? ops.isStatic : false;

        var existing = G.ParticleContainers.get(ops.name);
        if(existing){
            existing.removeChildren();
            G.Stage_.removeChild(G.ParticleContainers.get(ops.name));
            G.ParticleContainers.delete(ops.name);
        }

        G.Stage_.addChild(part.con);
        G.ParticleContainers.set(ops.name, part.con);

        //G.Stage_.children = G.Stage_.children._orderBy(x => x.zIndex);
        return part;
    };*/

    //gr can be a fitlerTex as well
    /*
    G.spawnParticle = function(part, renderParent, ops){
        if (G.IsServer) return null;
        if (renderParent && !renderParent.InFrame && !part.isStatic)
            return;

        var grPart = new PIXI.Sprite();

        if(renderParent)
            grPart.oid = renderParent.oid;
        grPart.texture = part.texture;
        grPart.decay = true;
        Object.assign(grPart, ops);
        grPart.maxLife = grPart.maxLife ? grPart.maxLife : grPart.life;
        grPart.x = grPart.rx = grPart.rx0 = ops.pos.x;
        grPart.y = grPart.ry = grPart.ry0 = ops.pos.y;
        //grPart.rotation = Math.Pi*0.5;
        grPart.alpha = grPart.life / grPart.maxLife;
        if(grPart.background){
            grPart.cBack = -100 / grPart.background;
            grPart.offx = grPart.rx0 - ((G.bounds.min.x + grPart.rx0)/grPart.cBack);
            grPart.offy = grPart.ry0 - ((G.bounds.min.y + grPart.ry0)/grPart.cBack);
        }
        if(!grPart.vel)
            grPart.vel = {x: 0, y: 0};

        //grPart.pivot = { x: -gr.width/2, y: -gr.height/2 };

        //if(!grPart.anchor)
        grPart.anchor = { x: 0.5, y: 0.5 }; //0.5??
        //depends if it was centered prior to coming in??

        part.con.addChild(grPart);
        return grPart;
    };*/

    //Helper Functions-------------------------------------------------------

    G.sound = function (sound, item, vol, alwaysPlay = false) {
        if (!G.IsServer && (item == null || item.InFrame)) {
            var globalVol = 1;
            var soundfx = CG[sound];


            if (item && item.IsPlayer && (!item.IsGuy || item.IsAI))
                vol = vol * 0.1;

            if (!soundfx.total)
                soundfx.total = new UT.Queue();

            if (alwaysPlay || (item != null && item.IsGuy) || !soundfx.playing(soundfx.total.data[soundfx.total.head])) {
                var soundId = soundfx.play();

                if (vol != null)
                    soundfx.volume(vol * globalVol, soundId);
                soundfx.total.enQ(soundId, 5);
            }

        }
    }

    G.pEdge = function (x1, y1, x2, y2) {
        var ob = PL.Edge(PL.v2(x1 / G.pscale, y1 / G.pscale), PL.v2(x2 / G.pscale, y2 / G.pscale));
        ob.ptype = EN.Shapes.get('edge');
        ob.v1 = { x: x1, y: y1 };
        ob.v2 = { x: x2, y: y2 };
        return ob;
    }

    G.pCircle = function (r, wx = 0, wy = 0) {
        var ob = PL.Circle(PL.v2(wx / G.pscale, wy / G.pscale), r / G.pscale);
        ob.ptype = EN.Shapes.get('circle');
        ob.r = r;
        return ob;
    }

    G.pBox = function (w, h, offx = 0, offy = 0) {
        var ob = PL.Box(w / G.pscale / 2, h / G.pscale / 2, PL.v2(offx / G.pscale, offy / G.pscale))

        ob.ptype = EN.Shapes.get('rect');
        ob.w = w;
        ob.h = h;
        return ob;
    }

    G.pPoly = function (verts) {
        var pverts = [];
        verts._each(v => { pverts.push(PL.Vec2(v.x / G.pscale, v.y / G.pscale)) });
        var ob = PL.Polygon(pverts);
        ob.ptype = EN.Shapes.get('poly');
        return ob;
    }

    G.vnorm = function (v) {
        var m = G.vmag(v);
        if (m == 0) return { x: 0, y: 0 };
        return { x: v.x / m, y: v.y / m };
    }

    G.vsimilarity = function (v1, v2) {
        var denom = (G.vmag(v1) * G.vmag(v2));
        if (denom == 0) return 0;
        return G.vdot(v1, v2) / denom;
    };

    //finds how similar two vectors are 0==perpendicular
    G.vdot = function (v1, v2) { return (v1.x * v2.x) + (v1.y * v2.y) }

    G.vmag = function (v) { return Math.sqrt(v.x * v.x + v.y * v.y); }

    G.vsub = function (v1, v2) { return { x: v1.x - v2.x, y: v1.y - v2.y }; };

    G.dist = function (v1, v2) {
        return Math.sqrt(((v2.x - v1.x) * (v2.x - v1.x)) + ((v2.y - v1.y) * (v2.y - v1.y)));
    };

    G.Form = function (num, round = 3) {
        return Number(num.toFixed(round));
    };

    G.VertsFromPath = function (path) {
        var verts = [];
        for (var i = 0; i < path.length - 1; i += 2)
            verts.push({ x: Number(path[i]), y: Number(path[i + 1]) });
        return verts;
    };

    G.Graphic = function (bod, props = {}) {
        var shape = bod.getShape();

        if (shape.ptype == EN.Shapes.get('edge'))
            return G.line(null, shape.v1.x, shape.v1.y, shape.v2.x, shape.v2.y, props);
        if (shape.ptype == EN.Shapes.get('circle'))
            return G.circle(null, shape.r, props);
        if (shape.ptype == EN.Shapes.get('rect'))
            return G.rect(null, shape.w, shape.h, 3, props);
        if (shape.ptype == EN.Shapes.get('poly')) {
            var pnts = [];
            var off = shape.m_centroid;

            shape.m_vertices._each(v => {
                pnts.push((v.x - off.x) * G.pscale);
                pnts.push((v.y - off.y) * G.pscale);
            });
            props.center = false;
            return G.poly(null, pnts, props);
        }
    };

    G.InBox = function (obj, objPos, box, buffer) {
        return box != null &&

            ((objPos.x < (box.max.x + buffer) &&
                objPos.x > (box.min.x - buffer) &&
                objPos.y < (box.max.y + buffer) &&
                objPos.y > (box.min.x - buffer)) ||

                obj.min.x < (box.max.x + buffer) &&
                obj.max.x > (box.min.x - buffer) &&
                obj.max.y > (box.min.y - buffer) &&
                obj.min.y < (box.max.y + buffer));
    };

    // line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
    G.intercept = function (x1, y1, x2, y2, x3, y3, x4, y4, ignoreLength = false) {
        if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4))
            return false

        denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

        if (denominator === 0)
            return false

        let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
        let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

        if (!ignoreLength) {
            if (ua < 0 || ua > 1 || ub < 0 || ub > 1)
                return false
        }

        let x = x1 + ua * (x2 - x1)
        let y = y1 + ua * (y2 - y1)

        return { x, y }
    };

    //one line, one point.  -> point along line that norms with point
    G.pointIntercept = function (p1, p2, p3) {// p1, p2 are the line, p3=point
        var xd = p2.x - p1.x;
        var yd = p2.y - p1.y;
        var u = ((p3.x - p1.x) * (p2.x - p1.x) + (p3.y - p1.y) * (p2.y - p1.y)) / (xd * xd + yd * yd);
        return { x: p1.x + u * xd, y: p1.y + u * yd };
    }

    //colllide checks for ez use.

    //opts: myType, oType, otherName, avoidSelf
    G.CCheck = function (e, opts) {
        var isColide = true;

        if (opts.myType)
            isColide = isColide && e.myType == EN.Parts.get(opts.myType);
        if (opts.oType)
            isColide = isColide && e.oType == EN.Parts.get(opts.oType);

        if (opts.otherName)
            isColide = isColide && e.other.etype == EN.Objs.get(opts.otherName);
        if (opts.avoidSelf) {
            isColide = isColide && e.t.oid != e.other.oid;
            if (e.t.parentObj && e.other.parentObj)
                isColide = isColide && e.t.parentObj.oid != e.other.parentObj.oid;
        }
        return isColide;
    }
    /*
    G.CCheck = function(e, myType, oType, otherObjName, avoidSelf = true){
        var isColide = true;

        if(myType)
            isColide = isColide && e.myType == EN.Parts.get(myType);
        if(oType)
            isColide = isColide && e.oType == EN.Parts.get(oType);

        if(otherObjName)
            isColide = isColide && e.other.etype == EN.Objs.get(otherObjName);
        if(avoidSelf){
            isColide = isColide && e.t.oid != e.other.oid;
            if (e.t.parentObj && e.other.parentObj)
                isColide = isColide && e.t.parentObj.oid != e.other.parentObj.oid;
        }
        return isColide;
    };*/

    G.Outline = function (gr, totalVerts = 0) {
        var oldpiv = { x: gr.pivot.x, y: gr.pivot.y };
        gr.pivot.set(0, 0);
        var width = gr.width;
        gr.x = 1;
        gr.y = 1;

        //var off = {x: texture.width/2, y: texture.height/2};

        var pix = G.Renderer_.plugins.extract.pixels(gr);

        var verts = geom.contour(function (x, y) {
            return (pix[(y * width + x) * 4 + 3]) > 20;
        });
        var subVerts = [];
        //var div = Math.min(verts.length, totalVerts);
        //var eo = Math.floor(verts.length / div);

        gr.pivot.set(oldpiv.x, oldpiv.y);

        var dx = 0;
        var dy = 0;
        var li = 0;
        for (var i = 0; i < verts.length; i += 1) {
            if (i > 0) {
                dx = Math.abs(verts[li][0] - verts[i][0]);
                dy = Math.abs(verts[li][1] - verts[i][1]);
            }

            if (i == 0 || (dx > 7) || (dy > 7)) {
                subVerts.push({ x: verts[i][0], y: verts[i][1] });
                li = i;
            }
        }

        subVerts.push({ x: subVerts[0].x, y: subVerts[0].y });
        return subVerts;
    };

    G.Quad = function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    };
    G.Cubic = function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t + 2) + b;
    };

    G.rseed = function (seed) {
        return (G.IsServer ? seedrandom(seed + GU.seed)() : new Math.seedrandom(seed + GU.seed)());
    }

    G.ran = function (start, flex, ran) {
        return -flex + start + (ran ? ran : Math.random()) * flex * 2;
    }

    G.IsCW = function (verts) {
        var sum = 0;
        for (var i = 1; i < verts.length; i++)
            sum += (verts[i].x - verts[i - 1].x) * (verts[i].y + verts[i - 1].y);
        return sum <= 0;
    }

    //returns the value instead automatically setting it
    //Quadratic translations possible
    G.lerp2 = function (name, val, tval, speed, period, done) {
        if (!G.lerps) G.lerps = {};
        if (!G.lerps[name] || (!G.lerps[name].active && val != tval) || (tval != G.lerps[name].tval)) {
            var diff = tval - val;

            G.lerps[name] = {
                ogVal: val,
                tval: tval,
                dx: diff,
                period: period != null ? period : Math.abs(Math.ceil(diff / speed)),
                tick: 0
            };
        }

        if (val != tval) {
            var pct = G.Quad(null, Math.min(G.lerps[name].period, G.lerps[name].tick), 0, 1, G.lerps[name].period);
            G.lerps[name].tick++;
            G.lerps[name].active = true;

            pct = Math.min(1, pct);
            var returnVal = G.lerps[name].ogVal + pct * G.lerps[name].dx;

            if (pct == 1) {
                if (done) done(tval);
                return tval;
            }
            return returnVal;
        } else {
            G.lerps[name].active = false;
        }
        return tval;
    };

    G.lerp = function (thing, key, val, speed, useAngDiff) {
        var dx = val - thing[key];


        if (useAngDiff)
            dx = G.AngDiff(val, thing[key]);

        speed = Math.abs(dx) <= speed ? Math.abs(dx) : speed;
        thing[key] += dx > 0 ? speed : -speed;
    };

    G.Paralax = function (ox, oy, offx, offy, z = -10) { //non-paralaxed positions into laxed
        var back = -100 / z;
        return {
            x: ((G.Cam.position.x - ox) / back) + ox + offx,
            y: ((-G.Cam.position.y - oy) / back) + oy + offy
        };
    }

    G.AngDiff = function (a, b) {
        var ang = Math.abs(a - b) % (2 * Math.PI);
        var da = ang > Math.PI ? (2 * Math.PI) - ang : ang;
        var sign = (a - b >= 0 && a - b <= Math.PI) || (a - b <= -Math.PI && a - b >= -Math.PI * 2) ? 1 : -1;
        return da * sign;
    };

    G.UID_ = function (useAlt = false) {
        var chars = useAlt ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' :
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var uid = "";
        for (var i = 0; i < 3; i++)
            uid += chars[Math.floor(Math.random() * chars.length)];
        if (G.Objs && G.Objs.has(uid)) return G.UID_(useAlt);
        return uid;
    };

}(typeof exports === 'undefined' ? G : exports));





class Gobj {

    constructor(oid, type, stage, world) {
        var t = this;
        t.stage = stage;
        t.world = world;
        t.type = type;
        t.parts = [];
        t.children = [];
        t.InFrame = true; //performance for visibility
        t.updated = true;
        t.grOff = { x: 0, y: 0, z:0, a: 0 };
        t.pauseTicks = 0;
        t.alpha = 1;
        t.zOffset = 0;

        if(!EN.Objs.has(type))
            EN.Objs.set(type, EN.Objs.size);

        t.etype = EN.Objs.get(type);
        
        if(oid == null){
            console.trace(type + ' WARNING: NULL OID.  CHange')
        }

        t.oid = oid ? oid : (type + "_" + G.ObjTicker.toString().padStart(3, '0') + "_" + G.UID_());
    }

    Init(type, x, y, props = {}) {
        var t = this;

        props.type = type;
        if (!EN.Parts.has(type))
            EN.Parts.set(type, EN.Parts.size);

        props.etype = EN.Parts.get(type);
        props.position = planck.Vec2(x / G.pscale, y / G.pscale);

        t.con = t.world.createBody(props);
        t.con.testNodes = [];//used by planck for ordering collisions

        if(t.state || t.con.m_type == 'dynamic')
            t.olds = new UT.Queue();

        t.con.type = t.type;
        t.con.etype = t.etype;
        t.con.oid = t.oid;
        t.creationIndex = G.ObjTicker;

        var reverse = t.oid.split('').reverse().join('');
        t.random = (G.IsServer ? seedrandom(t.oid)() : new Math.seedrandom(t.oid)());
        t.random2 = (G.IsServer ? seedrandom(t.oid+'1')() : new Math.seedrandom(t.oid+'1')());
        t.random3 = (G.IsServer ? seedrandom(t.oid + '2')() : new Math.seedrandom(t.oid + '2')());
        t.ranSync = Math.ceil(t.random*40);
        t.updated = true;
        t.IsPlayer = t.etype == EN.Objs.get('g_dude');
        t.con.pdata = [];
        if (!t.IsSim)
            G.ObjTicker++;

        if (t.parentObj != null && !t.IsSim && !t.parentObj.IsSim){
            G.AddObject(t);
        }
        
        t.vel = {x: 0, y: 0};
        t.pos = {x: 0, y: 0};
        t.refreshData();
    }

    TickFunc(tick, func, func2){
        G.TickFunc(tick, func, func2, this.oid);
    }

    refreshData(){ //happens post-physics
        var t = this;
        if(t.con){
            t.vel.x = t.con.m_linearVelocity.x; //i dont understand why vel doesnt need adjustment.
            t.vel.y = t.con.m_linearVelocity.y;
            t.pos.x = t.con.m_xf.p.x * G.pscale;
            t.pos.y = t.con.m_xf.p.y * G.pscale;
        }
    }

    PostPhysics(){
        var t = this;
        t.refreshData();
        if (t.olds && !t.IsServerObject)
            t.olds.enQ({ pos: {x: t.pos.x, y: t.pos.y} }, 5);
    }

    Part(name, shape, props = {}){
        var t = this;
        props.shape = shape;
        var bod = t[name] = t.con.createFixture(props);

        bod.grs = {};
        bod.type = name;
        
        if (!EN.Parts.has(name))
            EN.Parts.set(name, EN.Parts.size);

        bod.etype = EN.Parts.get(name);

        bod.oid = t.oid;
        bod.uid = t.oid + "_" + t.parts.length.toString().padStart(3, '0');
        
        bod.creationIndex = t.creationIndex;// G.ObjTicker;

        bod.testId = Number(bod.creationIndex + '0' + t.parts.length);
        bod.gobj = t;

        t.parts.push(bod);
        t.updated = true;

        return bod;
    }

    Child(type, name, shape, props = {}, wx=0, wy=0){
        var t = this;
        var ob = new Gobj(name+t.oid, name, t.stage, t.world);
        ob.IsSim = t.IsSim;
        ob.parentObj = t;
        t[name] = ob;
        //fix this
        ob.Init(type, wx, wy, { });
        ob.Part(name, shape, props);
        ob.wx = wx;
        ob.wy = wy;
        ob.wa = 0;

        //ob.SetPos(t.pos.x+wx, t.pos.y+wy);
        //t.world.createJoint(PL.WeldJoint({}, t.con, ob.con, PL.Vec2(0,0)))
        t.children.push(ob);
    }

    addG(bod, type, gr, wx = 0, wy = 0, wz = 0, px = 0, py = 0, wa = 0) {
        var t = this;
        
        gr.SetPos = function(x,y,z){
            gr.position.x = x;
            gr.position.y = -y;
            if(z != null)
                gr.position.z = z;
        };

        gr.GetPos = function(){
            return {x: gr.position.x, y:-gr.position.y, z:gr.position.z};
        };

        gr.type = type;
        //gr.pivot.set(px + gr.pivot.x, py + gr.pivot.y);
        gr.wx = gr.ogx = wx;
        gr.wy = gr.ogy = wy;
        gr.wa = gr.oga = wa;
        gr.wz = gr.ogz = wz;

        gr.ogRot = {x: gr.rotation.x, y: gr.rotation.y, z: gr.rotation.z};
        gr.ogdx = gr.ogx >= 0 ? 1 : -1;
        gr.ogdy = gr.ogy >= 0 ? 1 : -1;
        gr.grAlpha = (gr.material && gr.material.opacity != null) ? gr.material.opacity : 1;
        gr.ogAlpha = gr.grAlpha;
        if(gr.geometry){
          //  gr.width = gr.geometry.boundingBox.max.x - gr.geometry.boundingBox.min.x;
            //gr.height = gr.geometry.boundingBox.max.y - gr.geometry.boundingBox.max.y;
        }

        if(!gr.material && gr.children.length > 0)
            gr.material = gr.children[0].material;
            

        gr.z = gr.z != null ? gr.z : 0;
        gr.oz = gr.z
        gr.ogscaleX = gr.scale.x;
        gr.ogscaleY = gr.scale.y;
        bod.grs[type] = gr;
        bod.grKeys = Object.keys(bod.grs);
        gr.lastRenderFrame = -200;

        if (!t.mainGraphic || gr.width > t.mainGraphic.width)
            t.mainGraphic = gr;

        gr.onBeforeRender = function (renderer, scene, camera, geometry, material, group){
            gr.lastRenderFrame = G.Tick;
        };

        /*
        if(type == 'grGlass')
            gr.layers.enable(MULTIPASS_LAYER_NUM);
        else
            gr.layers.set(0);
        */
        //gr.layers.enable(MULTIPASS_LAYER_NUM);
        //if(type == 'grGlass')
            //gr.layers.enable(MULTIPASS_LAYER_NUM);

        G.Scene.add(gr);

        t.updated = true;
        t.refreshData();
        return gr;
    }

    removeG(bod, name){
        var t = this;
        if (bod.grs[name]){
            G.Scene.remove(G.Scene.getObjectById(bod.grs[name].id));
            //t.stage.removeChild(bod.grs[name]);
            delete bod.grs[name];
        }
        bod.grKeys = Object.keys(bod.grs);
    }

    SetPos(x, y, ang){
        var t= this;
        ang = ang != null ? ang : t.con.getAngle();

        if(t.parentObj){
            var cos = Math.cos(ang);
            var sin = Math.sin(ang);
            x = x + (t.wx * cos - t.wy * sin);
            y = y + (t.wx * sin + t.wy * cos);
            ang += t.wa;
        }

        t.con.setTransform(PL.v2(x / G.pscale, y / G.pscale), ang)


        
        t.con.m_xf.set(PL.v2(x / G.pscale, y / G.pscale), ang);
        t.updated = true;
        t.refreshData();
        //for(var i = 0; i < t.children.length; i++)
            //t.children[i].SetPos(x,y,ang);
    }

    ApplyForce(x, y, xpos, ypos) {
        var t = this;
        if(xpos == null)
            t.con.applyForceToCenter(PL.v2(x, y),true);
        else
            t.con.applyForce(PL.v2(x,y), PL.v2(xpos,ypos), true);

        //for (var i = 0; i < t.children.length; i++)
            //t.children[i].ApplyForce(x, y, xpos, ypos);
    };

    //DO NOT USE SetVel Frame BY Frame.  Fucks w/ normal gravity function. etc. use FORCE
    SetVel(x, y) {
        var t = this;
        t.con.setLinearVelocity(PL.v2(x,y));
        t.refreshData();
        //for (var i = 0; i < t.children.length; i++)
            //t.children[i].SetVel(x, y);
    };

    RoundedSync(){
        var t = this;
        if(t.con.isStatic()) return;
        var cpos = t.con.getPosition();
        var cvel = t.con.getLinearVelocity();
        //m_sweep or c_pos or c_vel ?

        t.con.setPosition(PL.v2(SN.Form(cpos.x, 1), SN.Form(cpos.y, 1) ));
        t.con.setLinearVelocity(PL.v2(SN.Form(cvel.x, 1), SN.Form(cvel.y, 1)));
        t.con.setAngle(SN.Form(t.con.getAngle(), 2));

        //t.parts._each(p=> {
            //p._reset();
        //})
 
        for (var i = 0; i < t.children.length; i++)
            t.children[i].RoundedSync();

        t.refreshData();
    }

    /*
    CheckBounds(){
        var t = this;

            var oldVis = t.InFrame;
            var pos = t.mainGraphic ? {x: t.mainGraphic.x, y: t.mainGraphic.y} : t.pos;
            var width = t.mainGraphic ? t.mainGraphic.width : 100;
            var height = t.mainGraphic ? t.mainGraphic.height : 100;

            var bnds = {
                min: { x: -width * 0.5 + pos.x, y: -height*0.5 + pos.y },
                max: { x: width * 0.5 + pos.x, y: height*0.5 + pos.y }
            };
            
            t.InFrame = G.InBox(bnds, pos, G.bounds, G.bounds.buffer) || (t.AlwaysInFrame === true);

            if (oldVis != t.InFrame)
                t.updated = true;
    }*/

    Render(mainTick, tickDiffRnd, pct){
        var t = this;
        var x = t.pos.x;
        var y = t.pos.y;
        var ang = t.con.getAngle();
        var doUpdate = mainTick || t.alwaysUpdate;
        var rendering = t.mainGraphic ? (G.Tick - t.mainGraphic.lastRenderFrame) <= 2 : true;
        t.InFrame = rendering;

        var updateLoc = t.IsGuy || t.alwaysUpdate || t.updated || (!t.con.isStatic() && t.InFrame) || t.animations != null;
        var interpolatePos = t.IsGuy || (rendering && t.olds != null);// t.InFrame && !t.updated && (t.IsGuy || (t.olds && t.olds.length > 3 && !t.con.isStatic()));


        t.updated = false;
        if(!updateLoc) return;

        //not InFrame, and Static ? stop

        //only need to interpolate Moving Objects - that have not been updated
        //60fps interp estimation stuff - 
        if (interpolatePos) { //&&IsServerObject //&& !t.updated
            var earlyF = { pos: {x, y}, angle: ang };
            var lateF = t.olds.data[t.olds.tail - (tickDiffRnd + 1)];
            
            earlyF = t.olds.data[t.olds.tail - (tickDiffRnd+2)];

            if (earlyF != null && lateF != null){
                //console.log(pct + " " + frame1.pos.x + " " + frame2.pos.x)
                x = t.interpX = earlyF.pos.x + (lateF.pos.x - earlyF.pos.x) * pct;// old.pos.x + (t.pos.x - old.pos.x) * pct;
                y = t.interpY = earlyF.pos.y + (lateF.pos.y - earlyF.pos.y) * pct;
                if (lateF.angle != null && lateF.angle != 0)
                    ang = earlyF.angle + G.AngDiff(lateF.angle, earlyF.angle) * pct;
                doUpdate = true;
            }
        }

        //puase stuff
        if(t.pauseTicks >= t.pauseMax){
            t.UnPauseGraphic();
            doUpdate = false;
        }
        if(t.pauseInterpolate > 0){
            var ox = x;
            //interp just the diff between pause & actual-hit-position
            x = x - (t.pauseGraphic.dx * (1 / t.pauseInterpMax) * t.pauseInterpolate);
            y = y - (t.pauseGraphic.dy * (1 / t.pauseInterpMax) * t.pauseInterpolate);
            t.pauseInterpolate--;
        }else if(t.pauseGraphic && t.pauseGraphic.go){
            t.pauseTicks++;
            x = t.pauseGraphic.x;
            y = t.pauseGraphic.y;
        }


        if (!doUpdate) return;

        /*
        if (mainTick && (G.Tick % 10 == 0 || G.ScreenMoved)){
            var checkInFrame = G.ScreenMoved || t.updated || !t.con.isStatic() || G.Tick % 100 == t.ranSync;

            if (checkInFrame && G.bounds != null)
                t.CheckBounds();
        }*/

        //TODO Active / InFrame stuff
        //var updateLoc = t.alwaysUpdate || t.updated || !t.con.isStatic() || t.animations != null;

        if (updateLoc) {
            t.cos = Math.cos(ang);
            t.sin = Math.sin(ang);
        }
        t.animating = false;

        for (var i = 0; i < t.parts.length; i++) {
            var p = t.parts[i];
            var grKeys = p.grKeys ? p.grKeys : [];// Object.keys(p.grs);

            for (var k = 0; k < grKeys.length; k++) {
                var gr = p.grs[grKeys[k]];
                

                if((!gr.hidden && !t.hidden && !gr.ignore)){
                    var off = p.getShape().m_centroid ? p.getShape().m_centroid : { x: 0, y: 0 };
                    
                    if(mainTick){
                        if(G.HandleAnimations(gr, t, true))
                            t.animating = true;
                    }

                    if (updateLoc) {
                        var mcos = t.cos;
                        var msin = t.sin;

                        if (t.grOff.a != 0 && gr.orient) {
                            mcos = Math.cos(ang + t.grOff.a);
                            msin = Math.sin(ang + t.grOff.a);
                        }

                        //the line issue
                        //the alpha on spawn issue -> auto sets to 1
                        //gr.alpha = Math.min(gr.grAlpha, t.alpha);//new test. + remove t.alpha =1 def
                        if(gr.material)
                            gr.material.opacity = Math.min(gr.grAlpha, t.alpha);

                        if(!gr.manualPosition){
                            
                            if (!gr.ignoreRotation) {
                                if (gr.material)
                                    gr.material.rotation = -1 * (ang + gr.wa + (gr.orient ? t.grOff.a : 0));
                                gr.rotation.z = -1 * (ang + gr.wa + (gr.orient ? t.grOff.a : 0));
                            }
                            var wx = gr.wx;
                            var wy = gr.wy;
                            var wz = gr.wz;
                            if (gr.wx3d != null) {
                                wx = gr.wx3d;
                                wy = gr.wy3d;
                                wz = gr.wz3d;
                            }
                            gr.position.x = t.grOff.x + x + ((((off.x * G.pscale) + wx) * mcos) - (((off.y * G.pscale) + wy) * msin));
                            gr.position.y = t.grOff.y + y + ((((off.x * G.pscale) + wx) * msin) + (((off.y * G.pscale) + wy) * mcos));
                            gr.position.y *= -1;
                            gr.position.z = t.grOff.z + wz;
                        }
                    }
                }

                gr.visible = !gr.hidden && !t.hidden;// && t.InFrame;
                //gr.visible = true;
            }
        }
    }

    PreRender() { };

    CollideStart(e) {
        var t= this;
        
        if (t.parentObj){
            t.parentObj.CollideStart(e);
        }
    };

    CollideEnd(e) {
        var t = this;
        if (t.parentObj)
            t.parentObj.CollideEnd(e);
    };

    Tick(delta) {
        var t= this;
        
        if (t.parentObj) {
            var p = t.parentObj;
            //t.SetPos((p.pos.x)+p.vel.x/G.FRate_, (p.pos.y)+p.vel.y/G.FRate_, t.wa + p.con.getAngle());
            ///t.SetVel(0, 0);
        }
        //overwritten by objects
    };

    PauseGraphic(x, y, maxFrames) { //max is in 60fps render
        var t = this;
        if(G.IsServer) return;
        t.pauseGraphic = {x,y,go:true};
        t.pauseTicks = 0;
        t.pauseMax = maxFrames;
        t.pauseInterpolate = 0;
    }

    UnPauseGraphic(interpLength = 5){ //this is in 60fps render
        var t = this;
        if(!G.IsServer && t.pauseGraphic && t.pauseGraphic.go){
            console.log('unpause graphic ahppen ' + interpLength);
            t.pauseGraphic.go = false;
            t.pauseInterpolate = interpLength;
            t.pauseInterpMax = interpLength;
            t.pauseTicks = 0;
            t.pauseMax = 30;
            t.pauseGraphic.dx = t.pos.x - t.pauseGraphic.x;
            t.pauseGraphic.dy = t.pos.y - t.pauseGraphic.y;
        }
    }

    ToggleAnimation(name, toggle, dir){
        if(G.IsServer) return;
        var t = this;
        var a = t.animations[name];
        if(dir == null)
            dir = t.orient != null ? t.orient : 1;

        if(toggle != a.active){
            a.active = toggle;

            a.data._each(ad => {
                if (!a.obj.grs[ad.key]) return;
                var pan = a.obj.grs[ad.key].animate;
                if (!pan)
                    pan = a.obj.grs[ad.key].animate = {};

                if (toggle) {
                    var diffName = pan.name != name;
                    var restart = !a.repeat || diffName;

                    if (a.repeat && pan && !pan.repeat && pan.active)
                        return;

                    if (diffName && t.animations[pan.name])
                        t.animations[pan.name].active = false;

                    if (restart) {
                        pan = a.obj.grs[ad.key].animate =
                            { loop: a.loop, offset: a.offset, name, period: a.period, repeat: a.repeat, type: a.type, dir: dir };
                        a.obj.grs[ad.key].astarted = false;
                        pan.states = ad.states.slice();
                    }

                    pan.period = a.period;
                    pan.dir = dir;
                }

                if (pan.name == name)
                    pan.active = toggle;
            });
        }
    }

    // x,y,ang,scale,opacity
    AddAnimation(obj, name, period, opts, data){
        var t = this;
        if(!t.animations) t.animations = {};
        t.animations[name] = { period,loop: opts.loop, offset: opts.offset, repeat: opts.repeat, obj, type: opts.curve, dir:1, relData: data };
        t.animations[name].data = {};

        Object.keys(data)._each(k=> {
            t.animations[name].data[k] = { states: data[k], key: k };
        });

        t.ToggleAnimation(name, opts.active);
    }

    Contacts(opts={touching:true, order:false}){
        var t = this;
        var data = [];

        for(var cl = t.con.getContactList(); cl; cl = cl.next){
            if (!opts.touching || cl.contact.isTouching()) {
                var info = {};

                var myFix = cl.contact.getFixtureA();
                var oFix = cl.contact.getFixtureB();
                if (cl.contact.getFixtureA().oid == cl.other.oid){
                    myFix = cl.contact.getFixtureB();
                    oFix = cl.contact.getFixtureA();
                }

                info.myType = myFix.etype;
                info.oType = oFix.etype;
                info.other = oFix.gobj;

                info.t = myFix.gobj;
                //end new stuff-------------------

                info.gobj = G.Objs.get(cl.other.oid);
                info.oPart = cl.contact.getFixtureA().oid == cl.other.oid ? cl.contact.getFixtureA() : cl.contact.getFixtureB();
                info.myPart = cl.contact.getFixtureA().oid == cl.other.oid ? cl.contact.getFixtureB() : cl.contact.getFixtureA();
                info.contact = cl.contact;
                var wman = cl.contact.getWorldManifold();
                var ndir = cl.contact.getFixtureA().oid == t.oid ? -1 : 1;

                info.norm = { x: 0, y: 0 };
                if (wman)
                    info.norm = { x: wman.normal.x * ndir, y: wman.normal.y * ndir };

                info.cl = cl;
                data.push(info);
            }
        }
        
        //physical contacts should already be ordered, if more than 1.
        if (opts.order){
            return data._orderBy(d=> d.oPart.testId+d.myPart.testId);
        }
        return data;
    };

}
if (typeof exports !== 'undefined')
    module.exports = Gobj;/* ======== Twelev47 support@example.com ======== */ 

var EM = {

    emotes: {},
    textures: {},
    animations: {},

    FetchEmote: function(em, TWITCH, done){
        if (EM.emotes[em] != null){
            done(true);
            return;
        }

        ioLogin.Call('GetImageData', { code: em, TWITCH }, (data) => {
            if (data){
                console.log('fetch emote', em, data);
                EM.CheckLoad(data.raw, data.emote, done);
            }
            else {
                done(false);
            }
        });
    },

    //check if its been loaded -> if not -> load
    CheckLoad: function(raw, emote, done){
        emote.raw = raw;
        EM.emotes[emote.code] = emote;

        if(!emote.loaded){
            emote.raw = EM.To64Data(raw, (emote.type == 'gif' ? 'gif' : 'png'));

            if (emote.type == 'gif'){
                EM.ParseGif(emote.raw, emote.code, function(frames){
                    emote.animationLength = frames.length;

                    frames._each((f,i)=>{
                        EM.LoadFrame(emote, f.durl, i, function(){

                        });
                    })
                })
            }else if(emote.type == 'webp'){
                EM.ParseWebp(raw, emote.code, function(frames){
                    console.log(frames, 'webp0----------');

                    if(frames.length == 1){
                        return EM.Load(emote, function(){ done(true)});
                    }

                    emote.animationLength = frames.length;
                    frames._each((f, i) => {
                        EM.LoadFrame(emote, f.durl, i, function () {

                        });
                    })
                });
            }
            else{
                EM.Load(emote, function () {
                    done(true);
                });
            }


            //gifs + webp images + webp animations
        }
    },

    Load: function(em, done){
        G.Loader2.load(em.raw, function (tex) {
            //handle if animation happens vs a normal
            em.loaded = true;
            EM.textures[em.code] = tex;
            Parts.mats[em.code] = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, fog: false});
            done();
        });
    },

    LoadFrame: function(em, durl, index, done){
        G.Loader2.load(durl, function (tex) {
            //handle if animation happens vs a normal
            if (em.animationLength == index - 1)
                em.loaded = true;
            EM.animations[em.code].frames[index] = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, fog: false });
            done();
        });
    },

    //return dataurl
    To64Data: function (stuff, type = 'png') {
        var t2 = btoa(new Uint8Array(stuff).reduce(function (data, byte) {
            return data + String.fromCharCode(byte);
        }, ''));
        return 'data:image/' + type + ';base64,' + t2;
    },

    ParseWebp: function(durl, code, done){
        var response = btoa(new Uint8Array(durl).reduce(function (data, byte) {
            return data + String.fromCharCode(byte);
        }, ''));
        response = Array.from(new Uint8Array(durl));
        //console.log('here', code, null, memcmp(response, 0, 'RIFF', 4))
        var webpdecoder = new WebPDecoder();
        var imagearray = WebPRiffParser(response, 0);

        console.log('got here parsewebp', imagearray, response)

        //single image in webp
        if (!imagearray || !imagearray['frames'] || imagearray['frames'].length == 1) {
            //var img = new window.Image();
            //img.src = src;
            //$('body').append(img);

            //if (!G.Loader_.resources[d.code])
                //G.Loader_.add(d.code, src);

            return [durl];
        } else {
            var durls = [];

            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            imagearray['response'] = response;
            imagearray['rgbaoutput'] = true;
            imagearray['dataurl'] = false;
            var header = imagearray['header'] ? imagearray['header'] : null;
            var frames = imagearray['frames'] ? imagearray['frames'] : null;

            if (header) {
                header['loop_counter'] = header['loop_count'];
                canvas.height = header['canvas_height'];
                canvas.width = header['canvas_width'];
                var blend = false;
                for (var f = 0; f < frames.length; f++)
                    if (frames[f]['blend'] == 0) { blend = true; break; }
            }



            //incoming processing stuff from viewer.js
            for (var f = 0; f < frames.length; f++) {
                var height = [0];
                var width = [0];
                var frame = frames[f];
                var rgba = webpdecoder.WebPDecodeRGBA(response, frame['src_off'], frame['src_size'], width, height);
                frame['imgwidth'] = width[0];
                frame['imgheight'] = height[0];

                if (!header) {
                    canvas.height = height[0];
                    canvas.width = width[0];
                } else {
                    if (blend) {
                        var oldimagedata;
                        var oldimagedata = [];
                        var oldimagedata_ = ctx.getImageData(frame['offset_x'], frame['offset_y'], width[0], height[0], { willReadFrequently: true });
                        for (var i = 0; i < width[0] * height[0] * 4; i++)
                            oldimagedata[i] = oldimagedata_.data[i];
                    }
                }
                var imagedata = ctx.createImageData(width[0], height[0]);

                if ((frames.length == 1 && typeof frame['blend'] === 'undefined') || frame['blend'] == 1) {
                    for (var i = 0; i < width[0] * height[0] * 4; i++)
                        imagedata.data[i] = rgba[i];
                } else {
                    for (var i = 0; i < width[0] * height[0] * 4; i += 4) {
                        if (rgba[i + 3] > 0) {
                            imagedata.data[i + 3] = rgba[i + 3];
                            imagedata.data[i] = rgba[i];
                            imagedata.data[i + 1] = rgba[i + 1];
                            imagedata.data[i + 2] = rgba[i + 2];
                        } else {
                            imagedata.data[i + 3] = oldimagedata[i + 3];
                            imagedata.data[i] = oldimagedata[i];
                            imagedata.data[i + 1] = oldimagedata[i + 1];
                            imagedata.data[i + 2] = oldimagedata[i + 2];
                        }
                    }
                }

                if (frames.length == 1)
                    ctx.putImageData(imagedata, 0, 0);
                else
                    ctx.putImageData(imagedata, frame['offset_x'], frame['offset_y']);

                frame['dataurl'] = canvas.toDataURL();


                if (!EM.animations[code])
                    EM.animations[code] = { frames: [], frameInfo: frames };

                /*
                //standard add stuff goes here
                G.Loader_.add(f + '_gif_' + d.code, frame.dataurl);




                if (f == frames.length - 1)
                    total--;
                if (total <= 0) done();*/

                durls.push({ durl: frame.dataurl, code: code });

                //var img = new Image();
                //img.src = frame.dataurl;
                //$('body').append(img);

                if (frame['dispose'] == 1)
                    ctx.clearRect(frame['offset_x'], frame['offset_y'], width[0], height[0]);

            }
            done(durls);
        }
    },

    //parses individual dataurls from raw animation
    ParseGif: function(dataurl, code, done){
        var durls = [];

        gifFrames({ url: dataurl, frames: 'all', outputType: 'canvas' })
            .then(function (fdata) {
                //console.log(fdata[0].frameInfo);
                //console.log(d);

                for (var i = 0; i < fdata.length; i++) {
                    var canv = fdata[i].getImage();
                    var durl = canv.toDataURL();

                    if (i == 0 && EM.animations[code])
                        break;


                    var speed = fdata[i].frameInfo.delay ? fdata[i].frameInfo.delay : 5;

                    if (!EM.animations[code])
                        EM.animations[code] = { frames: [], speed: speed, finfo: [] };

                    durls.push({ durl: durl, code: code, speed: speed });
                }
                done(durls);
            });
    },

    FrameAnimation(gr, anim) {
        if (!gr) return;
        if (gr && !gr.lastFrameChange) {
            gr.lastFrameChange = G.RTick;
            gr.animFrame = 0;
        }

        var dur = anim.speed;

        if (anim.frameInfo != null)
            dur = anim.frameInfo[gr.animFrame].duration * 0.25 * 0.45;

        if (G.RTick - gr.lastFrameChange > (0.25 * dur)) {
            gr.material.map = anim.frames[(gr.animFrame + 1) % anim.frames.length].map;
            gr.lastFrameChange = G.RTick;
            gr.animFrame = (gr.animFrame + 1) % anim.frames.length;
        }
    }

}/* ======== Twelev47 support@example.com ======== */ 

var ServerLoc = 'https://twelve47.com/';
var query = new URLSearchParams(window.location.search);
var TWITCH = query.get('twitch') ? query.get('twitch') : 'your_twitch';

window.onload = (event) => {
    UT.Extensions();
    ioLogin = new API(loadData.PORT, loadData.IP);
    console.log('sdfsdfl');
    setTimeout(function () { MAIN.Init(); }, 250)
};

var MAIN = {

    Init: function(){  
        ioLogin.Call('Setup', TWITCH, function(){ });

        ioLogin.Sock.on('UpdateSettings', function(sdata){
            var data = sdata.streamer;

            GU.settings = Object.assign(defaults.poll, data);
            
            console.log('update settings', sdata);
            if(!sdata.firstLoad){
                return top.location.reload(true);
            }

            TWITCH = 'penta';//remove this eventually...
            console.log(TWITCH, 'connecting to tmi client')

            CG.tc = new tmi.Client({
                connection: { secure: true, reconnect: true },
                channels: [TWITCH],
            });
            CG.tc.on('cheer', function (channel, userstate, message) {
                var words = message.split(' ');
                var word = null;
                console.log(channel, userstate, message);
                console.log(words);


                words._each(w=>{
                    if(!w.toLowerCase().includes('cheer'))
                        word = w;
                });
                console.log(word);


                if(words && word){
                    console.log('call contribute', word, userstate.bits, userstate.username);
                    GU.Contribute(word, userstate.bits, userstate.username.toLowerCase());
                }
            });

            CG.tc.on('message', function (tar, context, msg, self) {
                console.log(msg);
            });

            CG.tc.connect();


            ioLogin.Call('InitEmoteData', TWITCH, function () {
                
                if(!GU.settings.pollRunners || GU.settings.pollRunners.length == 0){
                    return Notify.alert('No Poll Options.  Create Poll at Twelve47.com', 9999);
                }


                var emotes = GU.settings.pollRunners._select(x=> x.emote);

                console.log('got emote data.. asking for emotes', emotes.length)

                var dc = new UT.DoneCollector(emotes.length);
                dc.allDone(function(){
                    console.log('cg init')
                    CG.Init();
                })

                //emotes.push('CHEATING');

                emotes._each(em=>{
                    EM.FetchEmote(em, TWITCH, function(success){
                        console.log('done fetch emote', success)
                        dc.done()();

                        console.log(dc);

                        if(!success){
                            if(em)
                                Notify.alert('Emote Not Found (no animated emotes) (should be added to your twitch/7tv/bttv acct): ' + em)
                        }
                    });
                })
            });
        });

        setTimeout(function(){
            //GU.Contribute('Dogs', 100, 'Batman');
        },15000)

    },

}


var Notify = {

    alert: function(msg, time){
        var newDiv = document.createElement("div");

        newDiv.className = 'con-alert';
        newDiv.innerHTML = msg;

        document.body.appendChild(newDiv);

        setTimeout(function(){
            document.body.removeChild(newDiv);
        }, (time != null ? time : 2500))
    }

}
var CG = {
    textures: {},

    Init: function(){
        //CN.ioGame = new API(loadData.PORT, loadData.IP);
        Parts.Init();
        SF.Init(); //Sprite Factory Setup
        
        setTimeout(function () {
            CG.Connected(function () { }, null);
            Parts.InitTextures();
        }, 500)
    },

    Connected: function(doneFun, info){
        
        G.Height = Math.floor(document.querySelector('html').clientHeight);// $('.div-gcontainer').height();
        G.Width = Math.floor(document.querySelector('html').clientWidth); //$('.div-gcontainer').width();

        CG.Scale = { x: 1, y: 1 };
        CG.Scale.x = CG.Scale.y = (G.Width / G.StartWidth_) * 1;//1 0.8

        G.Init_(document.querySelector('.div-game'), function () {
            GU.Init();
            if (doneFun) doneFun();

            CG.Events();
            document.querySelector('canvas').setAttribute('oncontextmenu', 'return false;')
            //$('canvas').attr('oncontextmenu', 'return false;');
            G.Cam.zoom = 0.8;//1/CG.Scale.x;
            G.Cam.updateProjectionMatrix();
            //alert(G.Cam.zoom, G.Width)
        });
    },

    ColorData: function(colors){
        CG.cdata = [];

        for (var i = 0; i < colors.length; i++) {
            var data = {};
            var tc = tinycolor(colors[i]);
            data.hash = colors[i];
            data.color = Number('0x' + colors[i].substring(1));
            data.orbColor = CG.Contrast(data.hash, 0.35, 15);
            data.baseLight = tc.getLuminance();
            data.landColor = CG.Contrast(data.hash, 0.1, 30);

            data.comp = Number('0x' + tc.complement().toHexString().substring(1));
            //data.compHash = tc.complement().toHexString();
            data.grassColor = CG.Contrast(data.hash, 0.02, 30);
            data.dark2 = CG.Contrast(data.hash, 0.006, 18);
            data.dark = CG.Contrast(data.hash, 0.02, 10);
            data.light = Number('0x' + tinycolor(data.hash).lighten(28).toHexString().substring(1));// CG.Contrast(data.hash, 0.35, 0);


            //if(i == colors.length-1)    
                //CG.comp = data;
            //else
            CG.cdata.push(data);
        }
    },

    //pct is 0 dark 1 white?
    Contrast: function (hash, pct, desaturate = 0) {
        var tc = tinycolor(hash).desaturate(desaturate);
        var dir = (tc.getLuminance() - (1 * pct)) > 0 ? 1 : -1;
        //var grey = tinycolor(hash).desaturate(desaturate).greyscale();

        if(dir == 1){
            while ((tc.getLuminance() - (1 * pct)) > 0){
                tc = tc.darken(1);
            }
        }else if( dir == -1){
            while ((tc.getLuminance() - (1 * pct)) < 0) {
                tc = tc.lighten(1);
            }
        }

        //console.log(pct + " " + grey.getBrightness() + " " + grey.toString())
        return Number('0x' + tc.toHexString().substring(1));
    },

    Events: function () {

    },

};var EN = {

    Curves: new Map([
        ['linear',0],['sin',1],['quad',2],['cubic',3]
    ]),
    Shapes: new Map([
        ['edge',0],['circle',1],['rect',2],['poly',3]
    ]),
    Btns: new Map([
        [1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],
        ['right',9],['left',10],['down',11],['up',12]
    ]),
    BodyTypes: new Map([
        ['static', 0], ['dynamic', 1]
    ]),

    ItemTypes: new Map([
        ['i_punch', 0], ['i_arrow', 1], ['i_arrow', 2]
    ]),

    DudeTypes: new Map([
        ['Platform', 0], ['TopDown', 1], ['Tank', 2]
    ]),
    
    Parts: new Map(),
    Objs: new Map(),

    //maxes out at 21.  122(end alphabet) - 100(#s)
    // "x" denotes a possible action on YOU from server
    KeyCodes: new Map([
        [1, 'KeyRight'], [2, 'KeyLeft'], [3, 'KeyUp'], [4, 'KeyDown'],
        [5, 'KeySpace'], [6, 'Mouse1'], [7, 'Mouse2'], [8, 'KeyE'],
        [9, 'KeyQ'], [11, 'x1'], [12, 'x2'], [14, 'x3'],
        [15, 'x4'], [16, 'x5'], [17, 'x6'], [18, 'x7'],
        [19, 'x8'], [20, 'x9'], [21, 'x10'],
    ]),
    KeyMap: new Map([//needed for o(1) time lookup
        ['KeyRight',1], ['KeyLeft',2], ['KeyUp',3], ['KeyDown',4],
        ['KeySpace',5], ['Mouse1',6], ['Mouse2',7], ['KeyE',8],
        ['KeyQ',9], ['x1',11], ['x2',12], ['x3',14],
        ['x4',15], ['x5',16], ['x6',17], ['x7',18],
        ['x8',19], ['x9',20], ['x10',21],
    ]),

    G: function(obj, key){
        return EN[obj].get(key)
    },
    /*
        KeyRight: 1, KeyLeft: 2, KeyUp: 3, KeyDown: 4,
        KeySpace: 5, Mouse1: 6, Mouse2: 7, KeyE: 8, KeyQ: 9,
        x1: 10, x2: 11, x3: 12, x4: 13, x5: 14, x6: 15,  x7: 16,
        x8: 17, x9: 18, x10: 19, x11: 20, x12: 21 
    }),*/
};
if (typeof exports !== 'undefined')
    module.exports = EN;
class g_guy extends Gobj {

    //background features need to be function of CG.Scale
    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.alwaysUpdate = true;
    }

    Init() {
        var t = this;

        super.Init('dynamic', t.spx, t.spy);
        t.Part('core', G.pBox(20, 20), { isSensor: true, filterMaskBits: 0x0 });

        t.con.m_gravityScale = 0;

        if (!G.IsServer) {

            var grPlane = G.Shape(Parts.mats.shadow, Parts.geoPlane, { z: 0, shadow: true, size:45 });
            t.addG(t.core, 'grPlane', grPlane);

            var vsep = 40;
            var isBottom = GU.isBottom;
            var dir = isBottom ? -1 : 1;

            var textHeight = isBottom ? -GU.settings.pollRunners.length * vsep : -40;


            SF.TextMaterial(GU.settings.pollTitle, { fontSize: 24 }, (mat) => {
                var gr = G.Image(mat, {});
                t.addG(t.core, 'grTitle', gr, gr.scale.x / 2, textHeight - 20, 20);
            });

            if (GU.settings.pollLastVoteTwitch != null){
                var latist = `Latest: ${GU.settings.pollLastVoteTwitch} - ${GU.settings.pollLastVote}`;

                SF.TextMaterial(latist, { fontSize: 18 }, (mat) => {
                    var gr = G.Image(mat, {});
                    t.addG(t.core, 'grTitle2', gr, 15 + gr.scale.x / 2, textHeight +7, 20);
                });
            }



            var scaleOut = 7.5;

            //var grBox = G.Shape(Parts.mats.c1, Parts.geoBox, { z: 0, shadow: true, size: scaleOut, scaleY: 4 });
            //t.addG(t.core, 'grBox', grBox, scaleOut *grBox.geometry.width/2);
            //console.log(grBox.geometry.width)
        
            //get max value
            var scaledown = 750;
            var max = GU.settings.pollRunners._max(x=> x.score).score;

            if(max < 2000)
                scaledown = 500;
            if(max < 500)
                scaledown = 250;


            max = max + scaledown;

            GU.settings.pollRunners._orderBy(x=> x.score)._each((r,i)=>{
                var score = Math.max(7, r.score);
                
                //test animated emote
                //r.emote = 'CHEATING';


                var isMax = (max - scaledown) == r.score;
                if(r.score == 0)
                    isMax = false;

                //scaleOut * 100 = width

                var grBox1 = G.Shape(Parts.mats['c'+r.color], Parts.geoBox, 
                    { shadow: true, scaleY: isMax ? 0.3 : 0.28, scaleX: (score / max) * scaleOut });

                var w = grBox1.geometry.width * (score / max) * scaleOut;

                t.addG(t.core, `grBox${i}`, grBox1, w / 2, dir*i *vsep, 15);

     
                var name = r.name + " : " + r.score;



                SF.TextMaterial(name, {fontSize: isMax ? 22 : 19}, (mat)=> {
                    var grTxt = G.Image(mat, { });
                    t.addG(t.core, 'grText' + i, grTxt, grTxt.scale.x / 2, dir*i *vsep+1, 33);

                    console.log('try add img');

                    var emoteMat = Parts.mats[r.emote];

                    //testing aniation
                    if (EM.animations[r.emote] != null) {
                        emoteMat = EM.animations[r.emote].frames[0];
                    }

                    if (r.emote && emoteMat) {
                        var idealWidth = isMax ? 65 : 47;
                        var imgw = emoteMat.map.image.width;

                        var offx = Math.max(w + 15, grTxt.material.map.image.width + 22);

                        var grEmote = G.Image(emoteMat, { size: (idealWidth / imgw) });
                        t.addG(t.core, 'grEmote' + i, grEmote, offx, dir*i * vsep, 32);
                    }
                });

                var ans = {};
                ans[`grEmote${i}`] = [
                    {scale:1, ang:0}, {scale:1.5, ang:Math.PI}, {scale:1, ang:Math.PI*2}
                ];

                t.AddAnimation(t.core, 'score' + r.name.toLowerCase(), 30, { repeat: false, active: false, curve: EN.Curves.get('quad') }, ans);//x,y,ang,scale,alpha
            });

        }
    };

    Tick() {
        var t = this;
    };

    PreRender(){
        var t = this;

        GU.settings.pollRunners._each((runner, i) => {
            if (EM.animations[runner.emote]) {
                EM.FrameAnimation(t.core.grs[`grEmote${i}`], EM.animations[runner.emote]);
            }
        })
    }

    CollideStart(e) {
        var t = this;
    };

    CollideEnd(e) {
        var t = this;
    };

}
if (typeof exports !== 'undefined')
    module.exports = g_guy;

//Game Util & Game State

var GU = {

    colors: ['#0abab5', '#7a93ff', '#b569ff', '#ff7ad5', '#ff8668', '#ffcb6a', '#a7ff78'],
    isBottom: true,

    Init: function () {
        //create background-box
        //create guy

        /* 
            make a color-picker tool?

            Font-Color
            Bar-Color, name, emote, 
            Title

            defaults
            save scores


            - add options
            - change score
            - latest: user + what they voted
        */

        console.log('gu init???');

        setTimeout(function(){
            //G.InitLoad('guy1', 'g_guy', { spx: G.bounds.max.x - 200, spy: G.bounds.max.y - 200 });

            //bottom left
            GU.CreateGuy();
        },1500)
    },

    CreateGuy: function(){
        var x = G.bounds.min.x + 20;
        var y = G.bounds.max.y - 40;
        GU.isBottom = true;

        if (GU.settings.pollPosition != null) {
            if (GU.settings.pollPosition == 'BottomRight') {
                GU.isBottom = true;
                x = G.bounds.max.x - 740;
                y = G.bounds.max.y - 40;
            }
            if (GU.settings.pollPosition == 'TopRight') {
                GU.isBottom = false;
                x = G.bounds.max.x - 740;
                y = G.bounds.min.y + 90;
            }
            if (GU.settings.pollPosition == 'TopLeft') {
                GU.isBottom = false;
                x = G.bounds.min.x + 20;
                y = G.bounds.min.y + 90;
            }
        }

        G.guy = G.InitLoad('guy1', 'g_guy', {
            spx: x, spy: y,
        });
    },

    Contribute: function(vote, amount, twitch){
        var r = GU.settings.pollRunners._first(x=> x.name.toLowerCase() == vote.toLowerCase());
        if(r){
            r.score += amount;
            GU.settings.pollLastVote = vote.toLowerCase();
            GU.settings.pollLastVoteTwitch = twitch;

            ioLogin.Call('PollSave', {TWITCH, 
                pollRunners: GU.settings.pollRunners,
                pollLastVote: GU.settings.pollLastVote,
                pollLastVoteTwitch: GU.settings.pollLastVoteTwitch
            }, function(){
            });

            GU.Update(vote.toLowerCase());
        }
    },

    Update: function(vote){
        if(G.guy){
            G.RemoveObject_(G.guy);
            GU.CreateGuy();

            setTimeout(function(){
                if(vote)
                    G.guy.ToggleAnimation('score'+vote, true);
            },200)
            
        }
    }

};
if (typeof exports !== 'undefined')
    module.exports = GU;

var Parts = {
    things: {},
    textures: {},
    mats: {},
    particleGroups: {},

    Init: function () {
        var t = this;
        //One Time Creations of Textures, Materials, Geometries
        //Static creations
        //dynamically allow new creations?? maybe

        var points = [-50, -50, 50, -50, 50, 50, -50, 50];
        t.geoBox = G.GeoFromPath(points, { depth:10, rounded:5 });// new THREE.ShapeGeometry(new THREE.Shape(G.VertsFromPath(points)));


        var points = [-50, -50, 50, -50, 50, 50, -50, 50];
        t.geoPlane = G.GeoFromPath(points, { depth: 2 });// new THREE.ShapeGeometry(new THREE.Shape(G.VertsFromPath(points)));


        points = G.CirclePoints(100, 100);
        t.geoCircle = G.GeoFromPath(points, { depth: 2 });// G.GeoExtrude(points, {depth: 2, bevel: false});
    },


    InitGeometry: function () {
        var t = this;

    },

    InitTextures: function () {
        var t = this;

        CG.ColorData(['#c41414', '#c45314', '#c47414', '#cdd417', '#70d417', '#17d449', '#17d495', '#17d4c3', '#175fd4', '#5b17d4', '#a617d4', '#d4179f', '#040617'],);
        G.color = CG.cdata[0];

        CG.cdata._each((c,i)=>{
            t.mats['c' + i] = new THREE.MeshLambertMaterial({ color: c.color, fog: false });
        });


        t.mats.shadow = new THREE.ShadowMaterial();
        t.mats.shadow.opacity = 0.2;


        t.mats.basicRed = new THREE.MeshBasicMaterial({ color: 0xff0000, fog: false });


        G.Loader2.load('audio.png', function (tex) {
            t.textures.ship = tex;

            var tex = t.textures.ship.clone();
            t.mats.audio = new THREE.MeshBasicMaterial({
                map: tex,
                color: G.color.dark2,
                transparent: true,
                opacity: 1
            });
        });

        t.InitGeometry();
    },

    InitParticles: function () {
        var t = this;

    },

    InitParticleGroup: function (name, opts) {
        var t = this;
        var verts = [];
        var geo = new THREE.BufferGeometry();
        var deads = [];
        var parts = [];
        var colors = new Float32Array(opts.total * 4);

        for (var i = 0; i < opts.total; i++) {
            verts.push(-10, -10, 10);
            deads.push(i);
            parts.push(t.InitParticle(i));
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
        //geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

        var mat = new THREE.PointsMaterial({
            vertexColors: true,
            depthTest: false,
            transparent: true,
            map: opts.tex != null ? opts.tex : null,
            size: opts.size != null ? opts.size : 50,
            fog: false,
        });
        var mesh = new THREE.Points(geo, mat);

        mesh.alives = [];
        mesh.deads = deads;
        mesh.parts = parts;
        mesh.frustumCulled = false;

        var color = opts.color ? opts.color : '#ffffff';
        var rgba = tinycolor(color).toRgb();
        mesh.rgba = rgba;
        mesh.alphaStart = opts.alpha != null ? opts.alpha : 1;
        mesh.total = opts.total;
        mesh.decayDelay = opts.decayDelay != null ? opts.decayDelay : 0;

        t.particleGroups[name] = mesh;
        G.Scene.add(mesh);
    },

    InitParticle: function (i) {
        var part = { i };
        return Parts.ResetParticle(part);
    },

    ResetParticle: function (part) {
        part.age = 0;
        part.lifetime = 50;
        part.vx = 0;
        part.vy = 0;
        part.slow =1;
        part.decayDelay = 0;
        //part.size = 1;
        return part;
    },

    EmitParticle: function (obj, group, opts) {
        var t = this;
        var pg = t.particleGroups[group];

        //console.log(pg, obj, obj.InFrame);

        if (pg && (obj == null || obj.InFrame)) {
            var i = pg.deads.pop();
            if (i) {
                pg.alives.push(i);
                Object.assign(pg.parts[i], opts);
                pg.geometry.attributes.position.setXYZ(i, opts.x, -opts.y, opts.z != null ? opts.z : 10);
            }
        }
    },

    UpdateParticles: function () {
        var t = this;
        t.particleGroups._each(pg => {
            var positions = pg.geometry.attributes.position;
            var colors = pg.geometry.attributes.color;

            for (var i = 0; i < pg.alives.length; i++) {
                var j = pg.alives[i];
                var part = pg.parts[j];

                var px = positions.getX(j);
                var py = positions.getY(j);
                var pz = positions.getZ(j);
                var n = pg.total;

                var fage = Math.max(0, part.age - part.decayDelay);
                var alph = (pg.alphaStart - (fage / (part.lifetime - part.decayDelay)));

                colors.setXYZW(j, (pg.rgba.r / n) + 0, (pg.rgba.g / n) + 0, (pg.rgba.b / n) + 0, alph);


                positions.setXYZ(j, px + part.vx, py + part.vy * -1, pz);
                part.vx = part.vx * part.slow;
                part.vy = part.vy * part.slow;
                if(part.grav)
                    part.vy = part.vy + part.grav;

                part.age++;

                if (part.age > part.lifetime) {
                    t.ResetParticle(part);
                    positions.setXYZ(j, -10, -10, -10);
                    colors.setXYZW(j, 0, 0, 0, 0);

                    pg.alives.splice(i, 1);
                    pg.deads.push(j);
                }
            }

            positions.needsUpdate = true;
            colors.needsUpdate = true;
        });
    },


};

if (typeof exports !== 'undefined')
    module.exports = Parts;
var SF = {

    Init: function () {
        var t = this;
        t.Renderer_ = new PIXI.Renderer({
            transparent: true, width: 800, height: 800, antialias: true, powerPreference: 'high-performance'
        });
    },

    //convert text into a sprite
    TextMaterial: function (text, opts, done) {
        var t = this;

        var txtOpts = {
            //font: '',
            fontSize: 21, strokeThickness: 4, alpha: 1,
            fontWeight: 600, fill: '#ffffff',
        };
        Object.assign(txtOpts, opts);

        var gr = t.text(null, text, null, txtOpts);


        var ft = t.filterTex(null, 10, gr, {});
        var ex = t.Renderer_.extract.canvas(ft).toDataURL();

        G.Loader2.load(ex, function (tex) {
            var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, color: 0xffffff });
            //var img = G.Image(mat, {});
            done(mat, opts);
        });
    },

    CircleMaterial: function (radius, ops, done) {
        var t = this;
        if (!ops.color)
            ops.color = 0xffffff;

        var gr = t.circle(null, radius, ops);
        var ft = t.filterTex(CG.fWhite2, 10, gr, {});
        var ex = t.Renderer_.extract.canvas(ft).toDataURL();


        G.Loader2.load(ex, function (tex) {
            //var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, color: 0xffffff });
            done(tex);
        });
    },

    RectMaterial: function(width, height, ops, done){
        var t = this;
        if (!ops.color)
            ops.color = 0xffffff;

        var ft = t.rect(null, width, height, ops);
        if(ops.filter)
            ft = t.filterTex(ops.filter, 10, ft, {});
        var ex = t.Renderer_.extract.canvas(ft).toDataURL();

        G.Loader2.load(ex, function (tex) {
            done(tex);
        });
    },

    PolyMaterial: function (points, ops, done) {
        var t = this;
        if (!ops.color)
            ops.color = 0xffffff;
        ops.alpha = 1;

        var gr = t.poly(null, points, ops);
        if (ops.filter != null)
            gr = t.filterTex(ops.filter, 10, gr, {});
        var ex = t.Renderer_.extract.canvas(gr).toDataURL();


        G.Loader2.load(ex, function (tex) {
            //var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, color: 0xffffff });
            done(tex);
        });
    },

    filterTex: function (filter, pad, gr, ops) {
        var t = this;

        if (filter) {
            filter.padding = pad * 2;
            gr.filters = [filter];
        }

        gr.pivot.set(0, 0);

        Object.assign(gr, ops);
        var bounds = gr.getLocalBounds();

        var dx = 0 - bounds.x;
        var dy = 0 - bounds.y;
        bounds.x += dx;
        bounds.y += dy;
        gr.x += dx;
        gr.y += dy;

        return t.Renderer_.generateTexture(gr, null, null, new PIXI.Rectangle(
            bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2
        ));
    },

    circle: function (gr, radius, ops) {
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);

        gr.clear();
        if (gr.texture != null)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);

        gr.lineStyle(gr.lineWidth, gr.lineColor, gr.lineAlpha, gr.alignment);

        gr.drawCircle(0, 0, radius);
        gr.endFill();

        if (ops.hole) {
            gr.beginHole();
            gr.drawCircle(0, 0, ops.hole);
            gr.endHole();
        }

        return gr;
    },

    rect: function (gr, w, h, ops) {
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        gr.clear();

        if (gr.texture != null)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);

        gr.lineStyle(gr.lineWidth, gr.lineColor, gr.lineAlpha, gr.alignment);

        gr.drawRoundedRect(0, 0, w, h, 4);
        gr.endFill();

        if (ops.holeWidth) {
            gr.beginHole();
            gr.drawRoundedRect((w/2)-(ops.holeWidth/2), (h/2)-(ops.holeHeight/2), ops.holeWidth, ops.holeHeight, 0);
            gr.endHole();
        }

        return gr;
    },

    poly: function (gr, points, ops) {
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);

        gr.clear();
        if (gr.texture != null)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);
        gr.lineStyle({ width: gr.lineWidth, color: gr.lineColor ? gr.lineColor : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha : 1, alignment: gr.alignment, join: 'round', cap: 'round' });

        var newPoints = points;

        if (ops.center !== false) {
            var newPoints = G.offsetToCenter(points);
        }

        gr.drawPolygon(newPoints)

        gr.endFill();
        gr.filters = gr.filter ? [gr.filter] : null;
        //gr.scale = ops.scale;

        if (ops.size)
            gr.scale.set(gr.size, gr.size);
        //gr.pivot.set(gr.offx, gr.offy);
        return gr;
    },

    text: function (gr, text, anchor, ops) {
        if (G.IsServer) return null;
        var isNew = !gr;

        var txtDef = {
            fontFamily: 'Open Sans',
            fontSize: 14,
            lineJoin: 'round',
            align: 'center',
            strokeThickness: 1,
        };
        Object.assign(txtDef, ops);

        var gr = isNew ? new PIXI.Text('sdf', txtDef) : gr;


        Object.assign(gr, ops);
        gr.text = text;
        gr.anchor = anchor ? anchor : { x: 0.5, y: 0.5 };
        gr.resolution = 2;

        return gr;
    }
}