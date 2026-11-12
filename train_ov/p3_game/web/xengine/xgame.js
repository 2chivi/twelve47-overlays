//xgame v1.01 : window resize errors
//gravity == 0.285

//G
var G = {};

(function (G) {
    G.IsServer = typeof exports !== 'undefined';
    G.StartWidth_ = 1920;
    G.StartHeight_ = 1080;
    G.Loader_ = !G.IsServer ? PIXI.Loader.shared : null;
    G.pad = { index: null, x: 0, y: 0 };
    G.ObjectsToAdd = [];
    G.ObjectsToRemove = [];
    G.tickActions_ = new Map();
    G.cycleAvg = G.renderAvg = G.packetAvg = G.avgTotal = 0;
    G.EngineBehind = 0;
    G.RenderBehind = 0;

    G.Init_ = function (con, onLoad) {
        PL = planck;
        PL.v2 = PL.Vec2;
        PL.internal.Settings.maxPolygonVertices = 48;

        G.Objs = new Map();

        G.FRate_ = 100 / 3;
        G.Width = G.Width ? G.Width : G.StartWidth_;
        G.Height = G.Height ? G.Height : G.StartHeight_;
        G.HasServer = typeof (SN) != 'undefined';
        G.tickActions_.clear();
        G.Tick = G.RTick = G.ATick = 0;
        G.cycleTimes = [];
        G.renderTimes = [];
        G.tslf = [];
        G.packetTimes = [];
        G.LastTime_ = Date.now();
        G.LastAccumTime_ = Date.now();
        G.LastPivotPos = { x: 0, y: 0 };
        G.pscale = 30;
        G.pause = false;
        G.gravity = 70;//60
        G.con = con;
        G.ObjTicker = 0;

        if(!G.World_){
            G.World_ = planck.World(PL.Vec2(0, G.gravity));
            G.Events_();
        }
        

        if (!G.IsServer) {
            var firstRender = G.Renderer_ == null;

            //{ transparent: true} for renderer options  //0x14171d
            if (firstRender) {
                G.Renderer_ = new PIXI.Renderer({
                    transparent: true, width: G.Width, height: G.Height, antialias: true, powerPreference: 'high-performance' });
            }
            PIXI.Ticker.shared.autoStart = false;
            PIXI.Ticker.shared.stop();
            //G.Root_ = new PIXI.Container();

            //CULLING DOESNT WORK CORRECTLY without single instance. look it up.
            G.Stage_ = G.Root_ = new PIXI.Container(); //THIS IS IMPORTANT FOR PERFORMANCE
            //G.UI_ = new PIXI.Container();
            //G.Root_.addChild(G.Stage_);
            //G.Root_.addChild(G.UI_);

            G.ParticleContainers = new Map();

            if (firstRender)
                $(con).html(G.Renderer_.view);

            setTimeout(function () { $('canvas').trigger('click'); }, 50);
        }


        
        G.onLoad = onLoad;
        G.PlayReset_();
    };

    G.Events_ = function () {
        G.ends = [];
        G.begins = [];

        G.World_.on('begin-contact', function(contact){
            G.begins.push({
                fixA: contact.getFixtureA(),
                fixB: contact.getFixtureB(),
                obA: G.Objs.get(contact.getFixtureA().oid),
                obB: G.Objs.get(contact.getFixtureB().oid),
                contact
            });
            /*
            if (obA && obA.CollideStart)
                obA.CollideStart(fixA.type, fixB.type, obB, contact);
            if (obB && obB.CollideStart)
                obB.CollideStart(fixB.type, fixA.type, obA, contact);*/
        });
        G.World_.on('end-contact', function (contact) {
            G.ends.push({
                fixA: contact.getFixtureA(),
                fixB: contact.getFixtureB(),
                obA: G.Objs.get(contact.getFixtureA().oid),
                obB: G.Objs.get(contact.getFixtureB().oid),
                contact
            });

            /*
            if (obA && obA.CollideEnd)
                obA.CollideEnd(fixA.type, fixB.type, obB, contact);
            if (obB && obB.CollideEnd)
                obB.CollideEnd(fixB.type, fixA.type, obA, contact);*/

        });
    }

    G.InitObj = function (type, oid) {
        if (oid)
            eval('var ob = new ' + type + "('" + oid + "', '"+ type +"');");
        else
            eval('var ob = new ' + type + "(null, '"+type+"');");
        return ob;
    };

    G.LoadObj = function(obj, state){
        if (state)
            Object.keys(state)._each(key => { obj[key] = state[key]; });
        obj.loadProps = JSON.parse(JSON.stringify(state));
        G.AddObject(obj);
        return obj;
    }

    G.InitAndLoad = function(oid, type, state){
        var obj = G.InitObj(type, oid);
        return G.LoadObj(obj, state);
    };

    G.AddObject = function (obj) {
        G.ObjectsToAdd.push(obj);
    };

    G.AddObjectHelp_ = function(obj){
        if(G.Objs.has(obj.oid))
            G.RemoveObjectHelp_(G.Objs.get(obj.oid));
        G.Objs.set(obj.oid, obj);

        if (obj.IsPlayer)
            G.Dudes = G.Objs._where(x => x.IsPlayer);
    }

    G.RemoveObject_ = function (obj) {
        G.ObjectsToRemove.push(obj);
    };

    G.RemoveObjectHelp_ = function(obj){
        if (obj && !obj.removedObject) {
            obj.children._each(c => { G.RemoveObject_(c); });

            var stage = obj.stage;
            obj.removedObject = true;

            if (obj.OnRemove)
                obj.OnRemove();

            obj.parts._each(part => {
                part.grs._each(gr => { 
                    console.log(gr.type);
                    stage.removeChild(gr); 
                });
            });

            G.World_.destroyBody(obj.con);

            G.Objs.delete(obj.oid);

            if(obj.IsPlayer)
                G.Dudes = G.Objs._where(x => x.IsPlayer);
        }
    }

    G.SortGraphics = function(){
        if (G.Stage_)
            G.Stage_.children = G.Stage_.children._orderBy(x => x.zIndex);
        //if(G.UI_)
            //G.UI_.children = G.UI_.children._orderBy(x => x.zIndex);
    }

    G.ReSort = function(){
        G.SortGraphics();
        //not needed now because things are ordered by default?
        /*
        var bl = UT.List(G.World_.getBodyList())._orderBy(x=> x.oid);
        G.World_.m_bodyList = null;

        for(var i = 0; i < bl.length; i++){
            var b = bl[i];
            b.m_prev = null;
            b.m_next = G.World_.m_bodyList;

            if(G.World_.m_bodyList)
                G.World_.m_bodyList.m_prev = b;
            G.World_.m_bodyList = b;
        }*/
    }

    G.TickFunc_ = function (delta) {
        G.TickInputCheck_();

        G.Objs.forEach(ob=> {
            ob.Tick(delta);
            ob.FinalizePosition();
        });

        G.ObjectsToRemove._each(x => { G.RemoveObjectHelp_(x); });

        if(G.ObjectsToAdd.length > 0){
            if (G.objOrder)
                G.ObjectsToAdd = G.ObjectsToAdd._orderBy(x => G.objOrder[x.oid]);

            var l1 = G.ObjectsToAdd.length;
            for (var i = 0; i < l1; i++)
                G.ObjectsToAdd[i].Init();

            if (G.objOrder) {
                G.ObjectsToAdd = G.ObjectsToAdd._orderBy(x => G.objOrder[x.oid]);
                G.objOrder = null;
            }

            G.ObjectsToAdd._each(x => { G.AddObjectHelp_(x); });
        }

        //if(G.ObjectsToAdd.length > 0 || G.ObjectsToRemove.length > 0)
            //G.ReSort();
        if(G.Tick % 500 == 0){
            //console.log(UT.List(G.World_.getBodyList())._each(x=> x.oid));
        }

        G.ObjectsToAdd = [];
        G.ObjectsToRemove = [];
    };

    G.TickForward_ = function(){
        G.Tick++;
        if (G.HasServer && !G.IsServer && CN)
            CN.ServerTick_++;
    };

    G.PostPhysics_ = function () {       
        G.begins._each(b => {
            if (b.obA && b.obB) {
                b.obA.refreshData(); b.obB.refreshData();
                if (b.obA.CollideStart)
                    b.obA.CollideStart(b.fixA.etype, b.fixB.etype, b.obB, b.contact);
                if (b.obB.CollideStart)
                    b.obB.CollideStart(b.fixB.etype, b.fixA.etype, b.obA, b.contact);
            }
        });
        G.ends._each(b => {
            if(b.obA && b.obB){
                b.obA.refreshData(); b.obB.refreshData();
                if (b.obA.CollideStart)
                    b.obA.CollideEnd(b.fixA.etype, b.fixB.etype, b.obB, b.contact);
                if (b.obB.CollideStart)
                    b.obB.CollideEnd(b.fixB.etype, b.fixA.etype, b.obA, b.contact);
            }
        });
        G.begins = [];
        G.ends = [];

        G.Objs.forEach(ob => {
            ob.refreshData();

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
                    if(ob.IsGuy)
                        ob.state._each(key => { old.state[key] = ob[key]; });
                    ob.olds._queue(old, 10);

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
        G.RTick = Math.min(G.Tick,G.RTick+rate); //(delta / G.FRate_);
        G.ATick += (delta / G.FRate_);

        if(!G.IsServer){
            G.UpdateParticles_(mainTick);


            //Screen Movement detection (performance)
            if(mainTick){
                //Calc the Edges of the scren
                G.bounds = {
                    buffer: 700,
                    min: { x: G.Stage_.pivot.x, y: G.Stage_.pivot.y },
                    max: { x: G.Stage_.pivot.x + (G.Width / G.Stage_.scale.x), y: G.Stage_.pivot.y + (G.Height / G.Stage_.scale.x) }
                };

                var pivotDelta = G.dist(G.LastPivotPos, G.Stage_.pivot);
                G.ScreenMoved = false;
                if (pivotDelta > (G.bounds.buffer * 0.5)) {
                    G.ScreenMoved = true;
                    G.LastPivotPos = { x: G.Stage_.pivot.x, y: G.Stage_.pivot.y };
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
        if (CN && CN.Guy){

            if (!CN.Guy.hasSpawned){
                G.Stage_.pivot.x = 0;
                G.Stage_.pivot.y = 0;
            }else{
                //G.Stage_.pivot.x = CN.Guy.interpX - (G.Width / G.Stage_.scale.x)/2;
                //G.Stage_.pivot.y = CN.Guy.interpY - (G.Height / G.Stage_.scale.x)/2;

                var cenx = G.Stage_.pivot.x + 0.5 * (G.Width / G.Stage_.scale.x);
                var ceny = G.Stage_.pivot.y + ((G.Height / G.Stage_.scale.x)/2);
                var xwidth = 40;// + Math.abs(CN.Guy.vel.x)*0.015;
                var yheight = 100;// + Math.abs(CN.Guy.vel.y) * 0.015;

                if (CN.Guy.interpX > (cenx + xwidth))
                    G.Stage_.pivot.x = (CN.Guy.interpX - xwidth) - ((G.Width / G.Stage_.scale.x) / 2);
                if (CN.Guy.interpX < (cenx - xwidth))
                    G.Stage_.pivot.x = (CN.Guy.interpX + xwidth) - ((G.Width / G.Stage_.scale.x) / 2);

                if (CN.Guy.interpY < (ceny - yheight))
                    G.Stage_.pivot.y = (CN.Guy.interpY + yheight) - ((G.Height / G.Stage_.scale.x) / 2);

                if (CN.Guy.interpY > (ceny + yheight))
                    G.Stage_.pivot.y = (CN.Guy.interpY - yheight) - ((G.Height / G.Stage_.scale.x) / 2);

            }

            if (CG.UpdatePointer && mainTick)
                CG.UpdatePointer();
        }
    };

    G.UpdateParticles_ = function(mainTick){

        G.ParticleContainers.forEach((con,key)=> {
            if (mainTick || con.fps) {
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
                        con.removeChild(p);
                        p.destroy();
                    }
                }

                if (con.children.length == 0 && con.lifetimer > 100) {
                    console.log('delete happening for apricle cont')
                    G.ParticleContainers.delete(key);
                    con.gr.particle = null;
                }
            }
        });
    }

    G.Cleanup_ = function(x, y){
        G.Objs.clear();

        UT.List(G.World_.getBodyList())._each(b => G.World_.destroyBody(b) );
        UT.List(G.World_.getContactList())._each(b => G.World_.destroyContact(b));
        UT.List(G.World_.getJointList())._each(b => G.World_.destroyJoint(b));

        if (!G.IsServer && G.Stage_) {
            if (x) {
                G.Width = x;
                G.Height = y;
                G.Renderer_.resize(x, y);
            }
            //G.UI_.removeAllListeners();
            //G.UI_.removeChildren();
            G.Stage_.removeAllListeners();
            G.Stage_.removeChildren();

            G.ParticleContainers.forEach(p => {
                p.removeChildren();
            });
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
        G.LastFinishedTime = Date.now()-100;
        G.acc_ = 0;
        G.deltaStore_ = 0;

        if (G.IsServer) {
            
            G.Loop_ = function () {
                if(G.pause) return;

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

            G.anim = function(){
                G.AnimationRequest_ = requestAnimationFrame(G.anim);
                var info = G.basicLoop_();
                G.CalcStats(info);
            }
            G.anim();

        }
    };

    G.CalcStats = function(basicLoopInfo){
        if (basicLoopInfo.engineStart) {
            G.cycleTimes._queue(basicLoopInfo.engineStop - basicLoopInfo.engineStart, 10);
            G.cycleAvg = G.cycleTimes._avg();//G.cycleTimes._max(x => x);
            if (G.IsServer)
                G.packetAvg = G.packetTimes._avg();
            G.avgTotal = G.renderAvg*2 + G.cycleAvg + G.packetAvg;
        }
        if (basicLoopInfo.renderStart) {
            G.renderTimes._queue(Date.now() - basicLoopInfo.renderStart, 10);
            G.renderAvg = G.renderTimes._avg();// G.renderTimes._max(x => x);
        }
        if (basicLoopInfo.renderStart || basicLoopInfo.engineStart) {
            G.tslf._queue(basicLoopInfo.time - G.LastFinishedTime, 10);
            G.SinceLastAvg = G.tslf._avg();
            G.LastFinishedTime = Date.now();
        }
    }

    G.basicLoop_ = function (){
        var renderStart = null;
        var engineStart = null;
        var engineStop = null;
        var time = Date.now();
        var mainTickTriggered = false;
        G.deltaStore_ += (time - G.old60);
        G.acc_ += (time - G.old60);
        G.old60 = time;
        G.LastAccumTime_ = time;

        if (G.acc_ >= G.FRate_) {
            engineStart = Date.now();
            if(!G.IsServer)
                G.CheckGamepad();

            G.hasDoneSecondRender = false;
            G.hasUpdatedRender = false;
            mainTickTriggered = true;
            G.TickFunc_(G.deltaStore_ / G.FRate_);
            G.deltaStore_ = 0;

            G.World_.step(1 / G.FRate_);
            
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
            G.EngineBehind = Math.max(60, G.EngineBehind+2);
        else if(G.EngineBehind > 0)
            G.EngineBehind--;

        if (!G.IsServer) {
            var time = Date.now();
            G.old60r = time;
            var timeSinceLast = time - G.LastRender;
            var ticksBehind = G.Tick - G.RTick;
            G.renderFreq = (G.EngineBehind || G.avgTotal > 21) ? 1 : 0.6; //0.5 == 60fps if FRate=33.33.  increase to lower render rate

            if(ticksBehind > 4)
                G.RTick = G.Tick - G.renderFreq;

            if (mainTickTriggered || (ticksBehind >= G.renderFreq && timeSinceLast > 10 && !G.EngineBehind)){
                var renderStart = time;
                var behind = ticksBehind > 2;

                G.LastRender = Date.now();   
                G.RenderFunc_(mainTickTriggered, (behind ? (G.renderFreq + 0.2) : G.renderFreq), timeSinceLast);

                PIXI.Ticker.shared.update(Date.now());
                G.Renderer_.render(G.Root_);
            }

            if ((G.Tick - G.RTick) > 1.1){
                G.RenderBehind = Math.max(30, G.RenderBehind + 2);
            }
            else if(G.RenderBehind > 0)
                G.RenderBehind--;
        }

        if(renderStart || engineStart){
            G.tslf._queue(time - G.LastFinishedTime, 10);
            G.SinceLastAvg = G.tslf._avg();
            G.LastFinishedTime = Date.now();
        }

        return {renderStart, engineStart, engineStop, time};
    };

    G.CheckGamepad = function(){
        var pads = navigator.getGamepads();

        if(G.pad.index == null && pads[0]){
            G.pad.index = 0;
            for (var i = pads.length-1; i >= 0; i--) {
                if(pads[i] && pads[i].mapping.length > 0)
                    G.pad.index = i;
            }
        }

        if(G.pad.index != null){
            var gp = pads[G.pad.index];
            var ax = 0.45;
            

            if (gp && CN.Guy) {
               // console.log(gp);

                for(var i = 0; i < 4; i++){
                    var a = gp.axes[i];
                    var padplus = G.pad['aplus' + i];
                    var padminus = G.pad['aminus' + i];
                    var xAxis = i == 0 || i == 2;

                    if(i < 2){
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

                    }else{
                        var update = Math.abs(gp.axes[2]) > ax || Math.abs(gp.axes[3]) > ax;
                        if(update){
                            if (xAxis)
                                G.pad['x'] = update ? a : 0;
                            else
                                G.pad['y'] = update ? a : 0;
                            G.activePad = true;
                        }
                        
                    }
                }

                for(var i = 0; i < gp.buttons.length; i++){
                    var b = gp.buttons[i];
                    var padv = G.pad['b'+i];
                    G.pad['b' + i] = b.value;

                    if (b.value && !padv){
                        G.activePad = true;
                        UT.trigger('key', { button: i, val: 1 });
                    }
                    else if (!b.value && padv)
                        UT.trigger('key', { button: i, val: 0 });
                    
                    
                }
            }
        }
    }

    G.TogglePause = function(onoff){
        if(!onoff){
            clearInterval(G.ttServer1);
            clearImmediate(G.ttServer2);
        }
        if (G.pause && !onoff && G.IsServer){
            G.pause = onoff;
            G.Loop_();
        }
        G.pause = onoff;
    }

    G.TickFunc = function(tick, func, func2, oid){
        var id = G.UID_(true) + Date.now();

        if(func2 != null)
            G.tickActions_.set(id, { tick, key: null, val: null, func: func2, data: func, id, oid });
        else
            G.tickActions_.set(id, { tick, key: null, val: null, func, id, oid });

        return G.tickActions_.get(id);
    };

    G.TickAction = function(oid, tick, key, val, func){
        var id = G.UID_(true) + Date.now();
        G.tickActions_.set(id, { tick, key, val, oid, func, id });
    };

    G.TickInputCheck_ = function(){

        G.tickActions_.forEach((ta,key)=>{
            if (ta && G.Tick >= ta.tick) {
                if (!ta.oid || G.Objs.has(ta.oid)){
                    if(ta.key)
                        G.Objs.get(ta.oid)[ta.key] = ta.val;
                    if(ta.func){
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
                x.aTime = Math.floor(G.ATick);
            }

            if (!x.animate.active)
                x.astarted = false;//x.aTime = G.Tick;

            //done
            if (x.astarted && G.Tween(x, gobj, isGraphic)) {
                var dfunc = x.animate.done;

                if (!x.animate.repeat) {
                    x.animate.active = false;
                    x.astarted = false;
                }

                if (dfunc) dfunc();
            }

            if (!x.animate.active) {
                x.astarted = false;
            }
        }
    };

    G.Tween = function (part, gobj, isGraph) {
        var type = part.animate.type ? part.animate.type : EN.Curves.get('linear');
        var period = part.animate.period;
        var states = part.animate.states;
        if (period == Infinity || period == null)
            return false;
        var tick = G.ATick - part.aTime;
        
        //if(tick%period==0 && tick > 0 && part.animate.repeat)
        //    states = states.reverse();
        if(tick >period && tick > 0 && part.animate.repeat){
            part.aTime = G.ATick - (tick % period);
            if(part.animate.repeatReverse)
                states = states.reverse();
        }
            

        G.TweenMove(part, gobj, isGraph, G.TweenStep(states, period, tick%period, type));
        return (tick+1) >= period && !part.animate.repeat;
    };

    G.TweenStep = function (states, period, tick, type) {
        var pct = tick / period;

        if (type == EN.Curves.get('sin'))
            pct = Math.sin(Math.PI*0.5*tick/period);
        else if (type == EN.Curves.get('quad'))
            pct = G.Quad(null, tick, 0, 1, period);
        else if (type == EN.Curves.get('cubic'))
            pct = G.Cubic(null, tick, 0, 1, period);


        var t1 = 1/(states.length-1);
        var key = Math.floor((states.length - 1) * pct);
        var t2 = pct-(t1*key);
        var statePct = t2/t1;

        var state = states[Math.min(key, states.length - 1)];
        if(!state) return;
        var nstate = states[(key + 1) % (states.length)];
        if(!nstate) return;

        return {
            x: state[0] != null ? state[0] + ((nstate[0] - state[0]) * statePct) : null,
            y: state[1] != null ? state[1] + ((nstate[1] - state[1]) * statePct) : null,
            ang: state[2] + ((nstate[2] - state[2]) * statePct),
            scale: state[3] != null ? state[3] + ((nstate[3] - state[3]) * statePct) : null,
            opac: state[4] != null ? state[4] + ((nstate[4] - state[4]) * statePct) : null,
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
            if(y != null)
                part.wy = part.ogy + y;

            if(angle!=null)
                part.wa = part.oga*dir + angle * dir;
            if(step.scale != null){
                part.scale.y = step.scale * part.ogscale;
                part.scale.x = step.scale * part.ogscale * dir;
            }
            if(step.opac != null)
                part.alpha = step.opac;

        } else {
            //real object animations?
        }
        return part;
    };

    //----------------------------------------------------------------------------------------

    //0->16
    //generic = 0, dude = 1, terrain = 2, gate=5, hitbox=6,hurtbox=7 --- serverTerrain = 14, delayTerrain = 15 (moving plats)
    G.cats = [0x0001, 0x0002, 0x0004, 0x0008, 0x0010, 0x0020,
        0x0040, 0x0080, 0x0100, 0x0200, 0x0400, 0x0800, 0x1000, 0x2000, 0x4000, 0x8000];

    G.Default = {
        color: 0x000000,
        lineColor: 0x000000,
        alignment: 1, //  (0.5 = middle, 1 = outer, 0 = inner).
        zIndex: 0
    };

    //sprite to FX texture?
    G.filterTex = function (filter, pad, gr, ops = {}) {
        filter.padding = pad * 2;
        gr.filters = [filter];
        gr.pivot.set(0, 0);
        
        Object.assign(gr, ops);
        var bounds = gr.getLocalBounds();
        if(gr.size){
            bounds.width = bounds.width * gr.size;
            bounds.height = bounds.height * gr.size;
        }
        

        var dx = 0 - bounds.x*(gr.size ? gr.size : 1);
        var dy = 0 - bounds.y * (gr.size ? gr.size : 1);
        bounds.x += dx;
        bounds.y += dy;
        gr.x += dx;
        gr.y += dy;

        return G.Renderer_.generateTexture(gr, null, null, new PIXI.Rectangle(
            bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2
        ));
    }

    G.image = function(gr, texture, ops = {}){
        if (G.IsServer) return null;
        var newImage = false;
        if (!gr) { newImage = true; gr = new PIXI.Sprite(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        gr.texture = texture;

        if(newImage)
            gr.pivot.set(gr.width / 2, gr.height / 2);
        else    
            gr.pivot.set(gr.ogOffx + (gr.texture.width / 2), gr.ogOffy + (gr.texture.height / 2));

        if(ops.size)
            gr.scale.set(gr.size, gr.size);
       
        return gr;
    };

    G.circle = function(gr, radius, ops){
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);

        gr.clear();
        if (gr.texture)
            gr.beginTextureFill({texture: gr.texture})
        else
            gr.beginFill(gr.color, gr.opacity);

        gr.lineStyle(gr.lineWidth, gr.lineColor, gr.lineOpacity, gr.alignment);

        gr.drawCircle(0, 0, radius);
        gr.endFill();
        //gr.pivot.set(gr.offx, gr.offy);
        gr.filters = gr.filter ? [gr.filter] : null;

        return gr;
    };

    G.poly = function(gr, points, ops){
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        //gr.scale = {x:1,y:1};
        gr.clear();
        if (gr.texture)
            gr.beginTextureFill({ texture: gr.texture })
        else
            gr.beginFill(gr.color, gr.opacity);
        gr.lineStyle({ width: gr.lineWidth, color: gr.lineColor ? gr.lineColor:0x0, alpha: gr.lineOpacity ? gr.lineOpacity: 1, alignment: gr.alignment, join: 'round', cap: 'round'});


        var newPoints = [];
        var vs = G.VertsFromPath(points);
        var center = {
            x: (vs._min(v => v.x).x + vs._max(v => v.x).x) / 2,
            y: (vs._min(v => v.y).y + vs._max(v => v.y).y) / 2
        };
        for (var i = 0; i < vs.length; i++) {
            var v = vs[i];
            v.x = v.x - center.x;
            v.y = v.y - center.y;
            newPoints.push(v.x,v.y);
        }


        gr.drawPolygon(newPoints)
        gr.endFill();
        gr.filters = gr.filter ? [gr.filter] : null;
        //gr.scale = ops.scale;

        if (ops.size)
            gr.scale.set(gr.size, gr.size);
        //gr.pivot.set(gr.offx, gr.offy);
        return gr;
    };

    G.rect = function (gr, w, h, rad, ops) {
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        gr.clear();
        Object.assign(gr, ops);
        
        if(gr.texture)
            gr.beginTextureFill({texture: gr.texture})
        else
            gr.beginFill(gr.color, gr.opacity);
        gr.lineStyle({ width: gr.lineWidth, color: gr.lineColor ? gr.lineColor : 0x0, alpha: gr.lineOpacity ? gr.lineOpacity : 1, alignment: gr.alignment, join: 'round', cap: 'round' });

        if(rad != null)
            gr.drawRoundedRect(0,0,w,h,rad);
        else
            gr.drawRect(0, 0, w, h);
        gr.endFill();
        
        gr.pivot.set(gr.width / 2, gr.height / 2);
        gr.filters = gr.filter ? [gr.filter] : null;
        return gr;
    };

    G.line = function (gr, x, y, x2, y2, ops) {
        if (G.IsServer) return null;
        var newLine = !gr;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        ops.lineWidth = ops.lineWidth == 0 ? 2 : ops.lineWidth;

        gr.clear();
        gr.lineStyle({ width: gr.lineWidth, color: gr.color ? gr.color : 0x0, alpha: gr.lineOpacity ? gr.lineOpacity : 1, alignment: 0.5, join: 'round', cap: 'round' });

        gr.moveTo(x, y);
        gr.lineTo(x2, y2);
        return gr;
    };

    G.curve = function (gr, p1, p2, p3, color = '#000D11') {
        if (G.IsServer) return null;
        var gr = !gr ? new PIXI.Graphics() : gr;
        gr.clear();
        gr.lineStyle(2, color, 0.5);
        gr.moveTo(p1.x, p1.y);
        gr.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        return gr;
    };

    G.text = function(gr, text, anchor, ops = {}){
        if (G.IsServer) return null;
        var isNew = !gr;
        
        var txtDef = {
            fontFamily: 'sans-serif',
            fontSize: 14,
            lineJoin: 'round',
            align: 'center',
            strokeThickness: 1,
        };
        Object.assign(txtDef, ops);

        var gr = isNew ? new PIXI.Text('sdf', txtDef) : gr;
        

        Object.assign(gr, ops);
        gr.text = text;
        gr.anchor = anchor ? anchor : {x: 0.5, y: 0.5};
        gr.resolution = 2;
        //gr.width = Math.ceil(gr.width);
        //gr.height = Math.ceil(gr.height);

        return gr;
    };

    G.particle = function(name, gr, z, fps, canScale=false, isStatic=false){
        var part = {};
        var activeScale = canScale;
        var activeRotation = false; //ops.rotVel != null;

        part.con = new PIXI.ParticleContainer(1000, 
            { scale: activeScale, alpha: true, rotation: activeRotation});
        
        if(gr.baseTexture)
            part.texture = gr;
        else{
            gr.pivot.set(0,0);
            part.texture = G.Renderer_.generateTexture(gr);
        }

        part.con.gr = gr;
        part.con.zIndex = z!=null ? z : 0;
        part.con.fps = fps!= null ?fps : null;
        part.con.isStatic = isStatic;
        //part.con.zIndex = 0;

        G.Stage_.addChild(part.con);
        G.ParticleContainers.set(name, part.con);

        //G.Stage_.children = G.Stage_.children._orderBy(x => x.zIndex);
        return part;
    };

    //gr can be a fitlerTex as well
    G.spawnParticle = function(part, renderParent, ops){
        if (G.IsServer) return null;
        if (renderParent && !renderParent.InFrame)
            return;

        var grPart = new PIXI.Sprite();

        grPart.texture = part.texture;
        grPart.decay = true;
        Object.assign(grPart, ops);
        grPart.maxLife = grPart.maxLife ? grPart.maxLife : grPart.life;
        grPart.x = grPart.rx = grPart.rx0 = ops.pos.x;
        grPart.y = grPart.ry = grPart.ry0 = ops.pos.y;
        grPart.alpha = grPart.life / grPart.maxLife;
        if(grPart.background){
            grPart.cBack = -100 / grPart.background;
            grPart.offx = grPart.rx0 - ((G.Stage_.pivot.x + grPart.rx0)/grPart.cBack);
            grPart.offy = grPart.ry0 - ((G.Stage_.pivot.y + grPart.ry0)/grPart.cBack);
        }
        if(!grPart.vel)
            grPart.vel = {x: 0, y: 0};

        //grPart.pivot = { x: -gr.width/2, y: -gr.height/2 };

        //if(!grPart.anchor)
        grPart.anchor = { x: 0.5, y: 0.5 }; //0.5??
        //depends if it was centered prior to coming in??

        part.con.addChild(grPart);
        return grPart;
    };

    //Helper Functions-------------------------------------------------------

    G.sound = function(sound, item, vol){
        return;
        if (!G.IsServer && (item == null || item.InFrame)){
            sound = CG[sound];
            if(vol) sound.volume(vol);
            if (!sound.total) sound.total = [sound.play()];
            else{
                if ((item != null && item.isGuy) || !sound.playing(sound.total[sound.total.length - 1]))
                    sound.total._queue(sound.play(),3)
            }
        }
    }

    G.pEdge = function(x1, y1, x2, y2){
        var ob = PL.Edge(PL.v2(x1/G.pscale, y1/G.pscale),PL.v2(x2/G.pscale, y2/G.pscale));
        ob.ptype = EN.Shapes.get('edge');
        ob.v1 = {x: x1, y: y1};
        ob.v2 = {x: x2, y: y2};
        return ob;
    }

    G.pCircle = function(r, wx=0, wy=0){
        var ob = PL.Circle(PL.v2(wx/G.pscale,wy/G.pscale), r/G.pscale);
        ob.ptype = EN.Shapes.get('circle');
        ob.r = r;
        return ob;
    }

    G.pBox = function (w, h, offx=0, offy=0) {
        var ob = PL.Box(w/G.pscale/2, h/G.pscale/2, PL.v2(offx/G.pscale, offy/G.pscale))
        
        ob.ptype = EN.Shapes.get('rect');
        ob.w = w;
        ob.h = h;
        return ob;
    }

    G.pPoly = function(verts){
        var pverts = [];
        verts._each(v => { pverts.push(PL.Vec2(v.x / G.pscale, v.y/G.pscale)) });
        var ob = PL.Polygon(pverts);
        ob.ptype = EN.Shapes.get('poly');
        return ob;
    }

    G.vnorm = function(v) {  
        var m = G.vmag(v);
        if(m==0) return {x: 0, y: 0};
        return {x: v.x/m, y: v.y/m};
    }

    G.vmag = function(v){ return Math.sqrt(v.x*v.x + v.y*v.y); }

    G.vsub = function(v1, v2){ return {x: v1.x-v2.x, y:v1.y-v2.y}; };

    G.dist = function (v1, v2) {
        return Math.sqrt(((v2.x - v1.x) * (v2.x - v1.x)) + ((v2.y - v1.y) * (v2.y - v1.y)));
    };

    G.Form = function (num, round = 3) {
        return Number(num.toFixed(round));
    };

    G.VertsFromPath = function(path){
        var verts = [];
        for(var i = 0; i < path.length-1; i+=2)
            verts.push({x: Number(path[i]), y: Number(path[i+1])});
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
        if (shape.ptype == EN.Shapes.get('poly')){
            var pnts = [];
            var off = shape.m_centroid;

            shape.m_vertices._each(v=> {
                pnts.push((v.x - off.x) * G.pscale);
                pnts.push((v.y - off.y) * G.pscale);
            });
            
            return G.poly(null, pnts, props);
        }
    };

    G.InBox = function (obj, box, buffer) {
        return box != null &&
            obj.min.x < (box.max.x + buffer) &&
            obj.max.x > (box.min.x - buffer) &&
            obj.max.y > (box.min.y - buffer) &&
            obj.min.y < (box.max.y + buffer);
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
            if(i > 0){
                dx = Math.abs(verts[li][0] - verts[i][0]);
                dy = Math.abs(verts[li][1] - verts[i][1]);
            }

            if(i == 0 || (dx > 7) || (dy > 7)){
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

    G.ran = function(start, flex){
        return -flex + start + Math.random()*flex*2;
    }

    G.lerp = function(thing, key, val, speed){
        var dx = val - thing[key];
        speed = Math.abs(dx) <= speed ? Math.abs(dx) : speed;
        thing[key] += dx > 0 ? speed : -speed;
    };

    G.AngDiff = function(a, b){
        var ang = Math.abs(a - b) % (2 * Math.PI);
        var da = ang > Math.PI ? (2 * Math.PI) - ang : ang;
        var sign = (a - b >= 0 && a - b <= Math.PI) || (a - b <= -Math.PI && a - b >= -Math.PI * 2) ? 1 : -1;
        return da * sign;
    };

    G.UID_ = function (useAlt = false) {
        var chars = useAlt ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' : 
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var uid = "";
        for (var i = 0; i < 3; i++)
            uid += chars[Math.floor(Math.random() * chars.length)];
        if(G.Objs && G.Objs.has(uid)) return G.UID_(useAlt);
        return uid;
    };

}(typeof exports === 'undefined' ? G : exports));




