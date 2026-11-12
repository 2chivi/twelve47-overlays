
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
        t.grOff = { x: 0, y: 0, a: 0 };
        t.pauseTicks = 0;

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

        if (t.state)
            t.olds = [];

        t.con.type = t.type;
        t.con.etype = t.etype;
        t.con.oid = t.oid;
        t.creationIndex = G.ObjTicker;
        t.random = (G.IsServer ? seedrandom(t.oid)() : new Math.seedrandom(t.oid)());
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

    refreshData(){
        var t = this;
        t.vel.x = t.con.m_linearVelocity.x; //i dont understand why vel doesnt need adjustment.
        t.vel.y = t.con.m_linearVelocity.y;
        t.pos.x = t.con.m_xf.p.x * G.pscale;
        t.pos.y = t.con.m_xf.p.y * G.pscale;
    }
    
    FinalizePosition(){/*
        if(this.PositionSet){
            this.PositionSet = false;
            this.con.setTransform(this.con.m_xf.p, this.con.m_xf.q)
        }*/
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
        t.bounds = t.GetBounds();
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

    addG(bod, type, gr, wx = 0, wy = 0, px = 0, py = 0, wa = 0) {
        var t = this;
        
        if(!gr.transform)
            gr = G.Graphic(bod, gr);

        gr.ogOffx = px;
        gr.ogOffy = py;
        gr.type = type;
        gr.pivot.set(px + gr.pivot.x, py + gr.pivot.y);
        gr.wx = gr.ogx = wx;
        gr.wy = gr.ogy = wy;
        gr.wa = gr.oga = wa;
        gr.ogscale = gr.scale.x;
        bod.grs[type] = gr;
        bod.grKeys = Object.keys(bod.grs);

        if(t.stage)
            t.stage.addChild(gr);
        return gr;
    }

    removeG(bod, name){
        var t = this;
        if (bod.grs[name]){
            t.stage.removeChild(bod.grs[name]);
            delete bod.grs[name];
        }
        bod.grKeys = Object.keys(bod.grs);
    }

    SetPos(x, y, ang){
        var t= this;
        t.PositionSet = true;
        ang = ang != null ? ang : t.con.getAngle();

        if(t.parentObj){
            var cos = Math.cos(ang);
            var sin = Math.sin(ang);
            x = x + (t.wx * cos - t.wy * sin);
            y = y + (t.wx * sin + t.wy * cos);
            ang += t.wa;
        }

        t.con.setTransform(PL.v2(x / G.pscale, y / G.pscale), ang)


        t.updated = true;
        t.con.m_xf.set(PL.v2(x / G.pscale, y / G.pscale), ang);
        t.refreshData();
        //for(var i = 0; i < t.children.length; i++)
            //t.children[i].SetPos(x,y,ang);
    }

    SetForce(x, y, xpos, ypos) {
        var t = this;
        if(xpos == null)
            t.con.applyForceToCenter(PL.v2(x, y),true);
        else
            t.con.applyForce(PL.v2(x,y), PL.v2(xpos,ypos), true);

        //for (var i = 0; i < t.children.length; i++)
            //t.children[i].SetForce(x, y, xpos, ypos);
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

        t.parts._each(p=> {
            //p._reset();
        })
 
        for (var i = 0; i < t.children.length; i++)
            t.children[i].RoundedSync();
    }

    CheckBounds(){
        var t = this;
        var checkInFrame = G.ScreenMoved || t.updated || !t.con.isStatic() || G.Tick % 100 == 0;

        //bounds?
        if (checkInFrame && G.bounds) {
            var oldVis = t.InFrame;

            var bnds = {
                min: { x: t.bounds.min.x + t.pos.x, y: t.bounds.min.y + t.pos.y },
                max: { x: t.bounds.max.x + t.pos.x, y: t.bounds.max.y + t.pos.y }
            };
            
            t.InFrame = G.InBox(bnds, G.bounds, G.bounds.buffer);

            if (oldVis != t.InFrame) {
                t.updated = true;
                /*
                if (t.main.isStatic && !t.alwaysActive) {
                    t.SetActive(t.InFrame);
                    console.log(t.type);
                }*/
            }
        }
    }

    Render(mainTick, tickDiffRnd, pct){
        var t = this;
        var x = t.pos.x;
        var y = t.pos.y;
        var ang = t.con.getAngle();
        var doUpdate = mainTick || t.alwaysUpdate;

        //60fps extimation stuff
        if (t.olds && t.olds.length > 3 && t.IsServerObject) {
            var earlyF = { pos: {x, y}, angle: ang };
            var lateF = t.olds[t.olds.length - (tickDiffRnd + 1)];

            earlyF = t.olds[t.olds.length - (tickDiffRnd+2)];

            if (earlyF != null && lateF != null){
                //console.log(pct + " " + frame1.pos.x + " " + frame2.pos.x)
                x = t.interpX = earlyF.pos.x + (lateF.pos.x - earlyF.pos.x) * pct;// old.pos.x + (t.pos.x - old.pos.x) * pct;
                y = t.interpY = earlyF.pos.y + (lateF.pos.y - earlyF.pos.y) * pct;
                if (lateF.angle != 0)
                    ang = earlyF.angle + G.AngDiff(lateF.angle, earlyF.angle) * pct;
                doUpdate = true;
            }
        }

        if(t.pauseGraphic === -1 || t.pauseTicks > 30){
            t.pauseTicks = 0;
            t.pauseGraphic = null;
            doUpdate = false;
        }
        if(t.pauseGraphic){
            t.pauseTicks++;
            x = t.pauseGraphic.x;
            y = t.pauseGraphic.y;
        }

        if (!doUpdate) return;

        if (mainTick && (G.Tick % 10 == 0 || G.ScreenMoved))
            t.CheckBounds();

        //TODO Active / InFrame stuff
        var updateLoc = t.alwaysUpdate || t.updated || !t.con.isStatic() || t.animations != null;
        var cos, sin = null;
        if (updateLoc) {
            cos = Math.cos(ang);
            sin = Math.sin(ang);
        }

        for (var i = 0; i < t.parts.length; i++) {
            var p = t.parts[i];
            var grKeys = p.grKeys ? p.grKeys : [];// Object.keys(p.grs);

            for (var k = 0; k < grKeys.length; k++) {
                var gr = p.grs[grKeys[k]];
                var off = p.getShape().m_centroid ? p.getShape().m_centroid : { x: 0, y: 0 };

                
                if(!gr.hidden && !t.hidden && !gr.ignore){
                    if (updateLoc && gr.orient && t.orient != null) {
                        gr.scale.x = gr.ogscale * t.orient;
                        if (!gr.animate || !gr.animate.active) {
                            gr.wx = gr.ogx * t.orient;
                            gr.wa = gr.oga * t.orient;
                        }
                    }

                    if(mainTick)
                        G.HandleAnimations(gr, t, true);

                    if (updateLoc) {
                        var mcos = cos;
                        var msin = sin;
                        if (gr.wa != 0) {
                            //mcos = Math.cos(ang);
                            // msin = Math.sin(ang);
                        }
                        if (t.grOff.a != 0 && gr.orient) {
                            mcos = Math.cos(ang + t.grOff.a);
                            msin = Math.sin(ang + t.grOff.a);
                        }

                        gr.rotation = ang + gr.wa + (gr.orient ? t.grOff.a : 0);
                        gr.x = t.grOff.x + x + ((((off.x * G.pscale) + gr.wx) * mcos) - (((off.y * G.pscale) + gr.wy) * msin));
                        gr.y = t.grOff.y + y + ((((off.x * G.pscale) + gr.wx) * msin) + (((off.y * G.pscale) + gr.wy) * mcos));
                    }
                }

                gr.visible = t.InFrame && !gr.hidden && !t.hidden;
            }
        }

        t.updated = false;
    }

    PreRender() { };

    CollideStart(mySubType, objSubType, obj, contact) {
        var t= this;
        if (t.parentObj)
            t.parentObj.CollideStart(mySubType, objSubType, obj, contact);
    };

    CollideEnd(mySubType, objSubType, obj, contact) {
        var t = this;
        if (t.parentObj)
            t.parentObj.CollideEnd(mySubType, objSubType, obj, contact);
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

    ToggleAnimation(name, toggle, dir){
        if(G.IsServer) return;
        var t = this;
        var a = t.animations[name];
        if(dir == null)
            dir = t.orient != null ? t.orient : 1;

        a.data._each(ad=> {
            if (!a.obj.grs[ad.key]) return;
            var pan =  a.obj.grs[ad.key].animate;
            if (!pan)
                pan = a.obj.grs[ad.key].animate = {};

            if (toggle){
                var diffName = pan.name != name;
                var restart = !a.repeat || diffName;

                if (a.repeat && pan && !pan.repeat && pan.active)
                    return;

                if (restart){
                    pan = a.obj.grs[ad.key].animate = 
                        { name, period: a.period, repeat: a.repeat, type: a.type, dir: dir, repeatReverse:a.repeatReverse };
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

    AddAnimation(obj, name, period, repeat, active, type, data, repeatReverse=true){
        var t = this;
        if(!t.animations) t.animations = {};
        t.animations[name] = { period, repeat, obj, type, dir: 1, relData: data, repeatReverse: repeatReverse };
        t.animations[name].data = {};

        Object.keys(data)._each(k=> {
            t.animations[name].data[k] = { states: data[k], key: k };
        });

        t.ToggleAnimation(name, active);
    }

    Contacts(touching=true, order=false){
        var t = this;
        var data = [];

        for(var cl = t.con.getContactList(); cl; cl = cl.next){
            if (!touching || cl.contact.isTouching()) {
                var info = {};
                info.gobj = G.Objs.get(cl.other.oid);
                info.oPart = cl.contact.getFixtureA().oid == cl.other.oid ? cl.contact.getFixtureA() : cl.contact.getFixtureB();
                info.myPart = cl.contact.getFixtureA().oid == cl.other.oid ? cl.contact.getFixtureB() : cl.contact.getFixtureA();
                info.contact = cl.contact;
                var wman = cl.contact.getWorldManifold();
                var ndir = cl.contact.getFixtureA().oid == t.oid ? -1 : 1;

                info.norm = { x: 0, y: 0 };
                if (wman)
                    info.norm = { x: wman.normal.x * ndir, y: wman.normal.y * ndir };

                data.push(info);
            }
        }
        
        //physical contacts should already be ordered, if more than 1.
        if(order){
            return data._orderBy(d=> d.oPart.testId+d.myPart.testId);
        }
        return data;
    };

    GetBounds(){
        var t = this;
        var bounds = { min: { }, max: { } };

        for(var i = 0; i < t.parts.length; i++){
            var p = t.parts[i];
            var bnds = p.getAABB(0);
            var maxX = (bnds.upperBound.x - t.con.getPosition().x);
            var maxY = bnds.upperBound.y - t.con.getPosition().y;
            var minX = bnds.lowerBound.x - t.con.getPosition().x;
            var minY = bnds.lowerBound.y - t.con.getPosition().y;

            if (!bounds.max.x || maxX > bounds.max.x) bounds.max.x = maxX;
            if (!bounds.max.y || maxY > bounds.max.y) bounds.max.y = maxY;
            if (!bounds.min.x || minX < bounds.min.x) bounds.min.x = minX;
            if (!bounds.min.y || minY < bounds.min.y) bounds.min.y = minY;
        }

        bounds.max.x *= G.pscale;
        bounds.min.x *= G.pscale;
        bounds.max.y *= G.pscale;
        bounds.min.y *= G.pscale;
        return bounds;
    };

}
if (typeof exports !== 'undefined')
    module.exports = Gobj;