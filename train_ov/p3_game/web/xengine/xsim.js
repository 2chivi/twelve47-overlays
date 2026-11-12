//simulated frames for netcode

//SIM
var SIM = {};

(function (SIM) {
    var t = SIM;
    
    t.CopyObj = function (obj, pos, vel, ang, state){
        var copy = eval('new '+obj.type+'(obj.oid,obj.type,null,t.World)');
        copy.IsSim = true;
        if(obj.state)
            obj.state._each(key => { copy[key] = state[key]; });

        copy.Init();

        t.UpdateObj(copy, pos, vel, ang, state);
        return copy;
    }

    t.UpdateObj = function (obj, pos, vel, ang, state) {
        if (obj.state)
            obj.state._each(key => { obj[key] = state[key]; });

        obj.Tick();
        obj.SetPos(pos.x, pos.y, ang);
        obj.SetVel(vel.x, vel.y);

        /*
        G.Tick++; CN.ServerTick_++;
        obj.Tick();
        t.World.step(1 / G.FRate_);
        G.Tick--; CN.ServerTick_--;


        if (obj.state)
            obj.state._each(key => { obj[key] = state[key]; });
        obj.SetPos(pos.x, pos.y, ang);
        obj.SetVel(vel.x, vel.y);*/
    }

    t.RemoveObj = function(obj){
        var t = this;
        t.World.destroyBody(obj.con);
    }

    //switch pos/vel/state to snap
    t.Future = function(dude, future = 1, pos, vel, ang, state){
        var t = this;

        if(!t.World){
            t.World = planck.World(PL.Vec2(0, G.gravity));
            t.World.IsSim = true;
            t.staticIds = [];
            t.statics = [];
        }

        var realStatics = G.Objs._where(x => !x.IsServerObject&& x.state && !x.con.isDynamic() && x.InFrame && !x.delay);

        realStatics._each(s=> {
            var exists = t.statics._first(x=> x.oid == s.oid);

            if(!exists){
                var sc = t.CopyObj(s, s.pos, s.vel, s.con.getAngle(), s);
                t.statics.push(sc);
            }else{
                t.UpdateObj(exists, s.pos, s.vel, s.con.getAngle(), s);
            }
        });

        t.statics._each(s=> {
            var exists = G.Objs._any(x=> x.oid == s.oid && x.InFrame);
            if(!exists){ 
                t.RemoveObj(s);
                var i = t.statics.findIndex(x=> x.oid == s.oid);
                t.statics.splice(i,1);
            }
        });


        var copy = t.CopyObj(dude, pos, vel, ang, state);
        //bjs.push(copy);
        //movers not included in statics.. not Ticking???

        for(var i = 0; i < future; i++){
            CN.ServerTick_++;
            G.Tick++;
            copy.Tick();
            t.statics._each(s=> { s.Tick(); });
            t.World.step(1 / G.FRate_);
        }
        G.Tick -= future;
        CN.ServerTick_ -= future;
        var info = {
            pos: { x: copy.pos.x, y: copy.pos.y },
            vel: { x: copy.vel.x, y: copy.vel.y },
            angle: copy.con.getAngle()
        };

        t.RemoveObj(copy);
        return info;
    }


}(typeof exports === 'undefined' ? SIM : exports));




