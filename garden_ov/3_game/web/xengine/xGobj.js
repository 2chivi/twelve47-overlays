
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

    SetParent(parent, childwx=0, childwy=0,childwa=0){
        var t = this;
        G.TickFunc(G.Tick+1,function(){
            t.parentObj = parent;

            t.childwx = childwx;
            t.childwy = childwy;
            t.childwa = childwa;
        })
    }

    /*()
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
    }*/

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
        x = x != null ? x : t.pos.x;
        y = y != null ? y : t.pos.y;

        ang = ang != null ? ang : t.con.getAngle();

        if(t.parentObj){
            var cos = Math.cos(t.parentObj.con.getAngle());
            var sin = Math.sin(t.parentObj.con.getAngle());
            x = x + (t.childwx * cos - t.childwy * sin);
            y = y + (t.childwx * sin + t.childwy * cos);


            ang = t.parentObj.con.getAngle() + t.childwa;
            //ang += t.wa;
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
            //console.log((p.pos.x) + p.vel.x / G.FRate_)
            //t.SetPos(0,0);
            t.SetPos((p.pos.x)+p.vel.x/G.FRate_, (p.pos.y)+p.vel.y/G.FRate_, t.childwa + p.con.getAngle());

            
            //t.SetVel(0, 0);
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
    module.exports = Gobj;