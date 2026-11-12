//Server_Net v1.1 cleanup
//generic server side functions

if (typeof exports !== 'undefined') {
    G = require('./xgame');
}

var SN = {};
(function (SN) {
    var t = SN;
    t.port = typeof(PORT) != 'undefined' ? PORT : loadData.PORT;
    t.Objs_ = new Map();
    t.Players_ = new Map();
    t.Queue = [];
    t.CanConnect = new Map();
    t.MaxPlayers_ = 30;
    t.MaxQueue = 300;
    t.DisconnectTime = 8000;//8 seconds
    t.FPI_ = 1; //Frames per Interval  -- less for performance. increase for less bandwidth
    t.FirstLoad= true; //for gettign data from client (emote dimensions)
    t.ConIdMap = new Map();
    t.conIds = [];
    for(var i = 0; i < 110; i++)
        t.conIds.push({ id: i, active:0 });

    t.servers = [
        {
            "urls": "stun:numb.viagenie.ca",
            "username": "you@example.com",
            "credential": "YOUR_TURN_PASSWORD"
        },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.ekiga.net' },

        { urls: 'stun:stun.ideasip.com' },
        {
            "urls": "turn:numb.viagenie.ca",
            "username": "you@example.com",
            "credential": "YOUR_TURN_PASSWORD"
        }
    ];

    SN.Init_ = function () {
        t.totalPackets_ = 0;
        t.peers_ = {};
        //used in Controller SN.sp / SN.wrtc
        t.sp = require('simple-peer');
        t.wrtc = require('wrtc');


        setInterval(function () { SN.Cleanup_(); }, 2000);

        SN.PostPhysics_ = function () {
            //Snapshot Interval is half of Interpolation Delay

            if (G.Tick % t.FPI_ == 0) {
                var tick = G.Tick;
                //setImmediate(function () { not sure what this is for. Meses timing for Round fix?
                    SN.SendUpdates_(tick);
                    
                //});
            }
        };
    };

    SN.HandlePing = function(oid, data){
        var interpDelay = data[2];
        var player = SN.Objs_.get(oid);
        if(!player || !player.guy) return null;
        var cc = SN.CanConnect.get(player.guy.pinfo.name);//._first(x => x.uid == oid);

        if (cc == null) return null;
        var sock = cc.sock;
        cc.LastPing = Date.now();
        cc.pingVars._queue(Date.now()-data[1], 22);
        var iqr = UT.IQR(cc.pingVars);

        if (player){
            player.InterpDelay = interpDelay;

            if (player.readyState === 0) {
                player.readyState = 2;
                setTimeout(function () { 
                    player.readyState = 1;
                    SN.GetAllSnapshots = true;
                }, 3000);
            }
        }

        //should this include G.LastTime_ calcs?
        var exact = G.Tick + (G.acc_ / G.FRate_) + ((Date.now() - G.LastAccumTime_) / G.FRate_);


        if (player && App.EventSources.has(player.pinfo.name)) {
            var update = data[0] + "," + data[1] + "," + exact + "," + iqr + "," + Date.now();
            App.EventSources.get(player.pinfo.name).write("data:" + update + "\n\n")
        }
        /*
        if (player && player.con && player.pinfo.UseUDP){
            player.con.send(data[0] + "," + data[1] + "," + exact + "," + iqr + "," + Date.now());
            //player.con.send(JSON.stringify([data[0], data[1], exact, iqr, Date.now()]));
        }
        else if(sock)
            sock.emit('snap', JSON.stringify([data[0], data[1], exact, iqr, Date.now()]));*/
    };

    //Periodic data get
    SN.OnNeedSnapshot_ = function () { };
    //Initial get data
    SN.GetObjectState_ = function (state, sobj) { 
        var o = {};
        var guy = sobj.guy;
        
        if(!guy.state)
            console.log("Missing STATE variable for server objs")

        //o = guy.GetState();
        guy.state._each(mod => {
            o[mod] = guy[mod];
        });

        if (guy.pos) {
            o.spos = guy.pos;
            o.svel = guy.vel;
            if(guy.con.getAngle() != 0)
                o.sang = guy.con.getAngle();
        }

        o.conId = sobj.conId;
        o.type = guy.type;
        state[guy.oid] = o;
        return state;
     };

     /*
    SN.CreateUpdate_ = function(player){
        var ss = ['u'];
        var d = "";
        var hasInfo = false;

        player.visibleIds_.forEach((v,key)=> {
            var p = t.Objs_.get(key);

            //removing snapshot from here
            if (p) {
                //var incoming = false;// player.visibleIds_[id] == 'new';
                //var exit = false; // player.visibleIds_[id] == 'exit';
                //if(incoming || exit)
                //p.updateFix = 1;

                var fix = p.updateFix > 0 && G.Tick > p.updateFix && p.actions_.length == 0;

                //if(fix && incoming)
                //player.visibleIds_[id] = 'ok';

                //if(exit && fix){
                //delete player.visibleIds_[id];
                //d += player.pid + '~';
                //}
                //else 
                if (p.actions_.length > 0 || fix || player.readyState === 1) {
                    d += p.snapshot;
                    hasInfo = true;
                }

            } //else if (!p)
                //player.visibleIds_.delete(key);
        })

        ss.push(d);
        ss.push(String.fromCharCode(G.Tick % 100));

        return JSON.stringify(ss); //hasInfo ? JSON.stringify(ss) : null;
    }*/

    SN.CreateUpdateAll = function(getAll, tick){
        var allInfo = "";
        var hasInfo = false;

        SN.Objs_.forEach(p=>{
            if(p.snapshot != null){
                if (getAll)
                    allInfo += p.snapshot;

                var fix = p.updateFix > 0 && tick > p.updateFix && p.actions_.length == 0;
                if (p.actions_.length > 0 || fix) {
                    allInfo += p.snapshot;
                    hasInfo = true;
                }
            }
        });
        return hasInfo ? 'u' + String.fromCharCode((tick % 100) + 22) + allInfo : null;
    }

    SN.SendUpdates_ = function (tick) {
        SN.tstart = Date.now();

        t.Objs_.forEach(p => {
            var getSnap = (p.actions_.length==0 && p.updateFix > 0 && tick > p.updateFix) || p.actions_.length > 0;
            p.snapshot = null;

            if (getSnap || SN.GetAllSnapshots)
                p.snapshot = SN.OnNeedSnapshot_(p, true, true);

            //rounding sync with client
            if (p.guy && p.guy.IsPlayer && tick % 44 == p.guy.ranSync){  //!p.guy.con.isStatic() && G.Tick % 33 == 0){
                p.guy.RoundedSync();
            }
        });
        SN.GetAllSnapshots = false;

        //create a standard update.
        //create full update for new people
        //deal with bandwidht once it becomes a real issue
        var normalUpdate = SN.CreateUpdateAll(false, tick);
        var allUpdate = null;
        //console.log('--------------------- ' + (normalUpdate ? normalUpdate.length:0) + " " + SN.Players_.size)

        SN.delaySum = 0;

        //todo socket io
        var plength = t.Players_.size;
        t.Players_.forEach(p=> {
            setImmediate(function () {
                var send = p.pinfo && (!p.pinfo.UseUDP ||
                    (p.con && p.con._channel && p.con._channel.readyState[0] == 'o')); // o for open

                if (send) {
                    var update = normalUpdate;// SN.CreateUpdate_(p);
                    if (p.readyState === 1) {
                        if (!allUpdate)
                            allUpdate = SN.CreateUpdateAll(true, tick);
                        update = allUpdate;
                    }

                    if (update != null) {
                        /*
                        if (!p.pinfo.UseUDP)
                            p.sock.emit('snap', update);
                        else
                           p.con.send(update);*/

                        if (App.EventSources.has(p.pinfo.name)){
                            var es = App.EventSources.get(p.pinfo.name);
                            if(!es._closed)
                                es.write("data:" + update + "~\n\n")
                        }
                    }

                    t.totalPackets_++;
                    if (p.readyState === 1)
                        p.readyState = 2;
                }

                if(--plength == 0){
                    G.packetTimes._queue(Date.now() - SN.tstart, 5);
                }
            })


        });


        t.Objs_.forEach(p => {
            if (p.updateFix > 0 && tick > p.updateFix && p.actions_.length == 0){
                p.updateFix = 0;
                p.lastFix = tick;
            }
            if (p.guy && p.updateFix == 0 && (tick+6) % 88 == p.guy.ranSync) //44
                p.updateFix = tick + 1;
            p.actions_ = "";
        });

        if (tick % 12 == 0)
            SN.UpdateLocalIds_();

        if (tick % 60 == 0)
            SN.UpdateQueue_();
    };

    SN.SendNewObject = function(uid, type, state){
        if(!G.IsServer)return;
        var st = {};
        state.IsServerObject = true;
        state.type = type;
        st[uid] = state;

        var conId = t.conIds._first(x => !x.active);
        conId.active = true;
        st[uid].conId = conId.id;

        SN.StateUpdate_(G.Tick + 5, {pstate: st}, function(){
            var sobj = SN.InitObj_(uid, conId.id);
            SN.CreateGameObject_(sobj, type, state)
        });
    };

    SN.SendNewPlayer = function(queInfo, uid){
        var t1s = SN.Players_._where(x => x.pinfo.team == 1).length;
        var st = {};
        st[uid] = {pinfo: Object.assign({},queInfo.pinfo), type: 'g_dude'};

        var conId = t.conIds._first(x => !x.active);
        conId.active = true;
       
        st[uid].conId = conId.id;
        st[uid].pinfo.team = t1s > (SN.Players_.size / 2) ? 2 : 1;

        if(st[uid].pinfo.name != 'coop')
            st[uid].pinfo.team = 2;

        var tick = G.Tick + 5;

        SN.StateUpdate_(tick, { pstate: st }, function () {
            var conn = SN.peers_[queInfo.uid];
            var sobj = SN.InitPlayer_(conn, uid, conId.id, st[uid].pinfo, queInfo.sock);
            SN.CreateGameObject_(sobj, 'g_dude', { pinfo: st[uid].pinfo, type: 'g_dude' });
        });
    }

    SN.UpdateQueue_ = function () {
        var vacancy = SN.Vacancy_();

        if ((vacancy) == SN.MaxPlayers_ && !G.pause && SN.Queue.length == 0)
            G.TogglePause(true);
        else if(G.pause)
            G.TogglePause(false);

        if(vacancy > 0){
            if (SN.Queue.length > 0 && vacancy > 0) { //&& !GU.GameStart
                for (var i = 0; i < SN.Queue.length && i < vacancy; i++) {
                    var nxt = SN.Queue.shift();
                    nxt.windowStart = Date.now();
                    nxt.pingVars = [];

                    var existing = SN.CanConnect.get(nxt.twitch);
                    if(existing && existing.uid)
                        SN.RemoveObject_(t.Players_.get(existing.uid))

                    SN.CanConnect.set(nxt.twitch,nxt);
                }
            }
        }
    }

    SN.Vacancy_ = function () { return SN.MaxPlayers_ - SN.CanConnect.size; }

    SN.CreateGameObject_ = function(sobj, type, state){
        var ob = G.InitAndLoad(sobj.pid, type, state);
        sobj.guy = ob;
        sobj.guy.ServerObj = sobj;
        sobj.guy.IsServerObject = true;
    }

    SN.InitObj_ = function(sid, conId){
        var sobj = SN.Objs_.get(sid);//._first(x => x.sid == sid);
        
        if (sobj) {
            SN.RemoveObject_(sobj);
            sobj = null;
        }
        if (!sobj) {
            sobj = {};
            sobj.pid = sid;
            sobj.sid = sid;
            sobj.actions_ = "";
            sobj.logEvents = [];
            sobj.inputKeys_ = [];
            sobj.updateFix = 0;
            sobj.conId = conId;

            SN.Objs_.set(sid,sobj);
        }

        return sobj;
    };

    SN.InitPlayer_ = function (con, sid, conId, pinfo, sock) {
        var sobj = null;

        sobj = SN.InitObj_(sid,conId);
        sobj.readyState = 0;
        sobj.pinfo = pinfo;
        sobj.con = con;
        sobj.visibleIds_ = new Map();
        sobj.sock = sock;
        
        //SN.GetPlayers_();
        SN.Players_.set(sid, sobj);
        SN.UpdateLocalIds_();

        return sobj;
    };

    SN.PeerData_ = function (data, conn) {
        data = JSON.parse(data);

        if (data[0] == 'i') {
            var player = SN.Objs_.get(data[5]);
            if (player) {
                var ai = { uid: data[1], key: data[2], val: data[3], tick: data[4] };
                SN.ApplyInput_(player, ai);
            }
        } else if (data[0] == 'p') {
            SN.HandlePing(conn.oid, data);
        }
    };

    SN.ApplyInput_ = function(player, data){
        if(!G.IsServer)return;
        var isDup = data.uid != null && player.inputKeys_._any(x => x == data.uid);
        var lateness = G.Tick - data.tick;
        var extra = (Date.now() - G.LastTime_);
        data.tick = lateness > 0 ? G.Tick : data.tick;

        if(!isDup && player != null){
            player.actions_ += SN.Codify_(data.key, data.val, data.tick);
            player.inputKeys_._queue(data.uid,5);

            if (lateness > 0){
                SN.LogEvent(player, G.Tick + ': server recieve EVENT-ME late: ' + data.key + " | " + lateness);
            }


            /*
            var diff = player.guy.ranSync - ((data.tick+10) % 44);
            var targetTick = data.tick+5 + diff;
            if(diff < 0)
                targetTick = (data.tick + 5) + 44 + diff;*/

            //console.log(targetTick + " " + player.guy.ranSync)
            //player.updateFix = targetTick;//data.tick + 5; //delay is important(trust)

            //if(player.updateFix > 0 && player.updateFix < (data.tick+5))
            player.updateFix = 0;
            //working here

            G.TickAction(player.pid, data.tick, data.key, data.val, function (ob, key) {
                var special = key[0] == 'x';
            });
        }
    };

    SN.EventDelay_ = function(guy){
        if (!G.IsServer) return;
        var player = SN.Objs_.get(guy.oid);
        return (player && player.InterpDelay) ? Math.min(4, player.InterpDelay) : 3;
    };

    SN.LogEvent = function(sobj, desc, infoObj, type){
        if(sobj)
            sobj.logEvents._queue({ key: Date.now(), oid: sobj.pid ? sobj.pid : sobj.oid, desc, infoObj, type }, 20);
    }

    SN.Cleanup_ = function () {
        var now = Date.now();
        t.CanConnect.forEach(cc=> {
            var p = t.Players_.get(cc.uid);
            var highPing = p && p.pstats && p.pstats[1] >= 140;

            if ((cc.connected && ((now - cc.LastPing) > t.DisconnectTime) || highPing) || (!cc.connected && Date.now() > (cc.windowStart + 10000))) {
                t.CanConnect.delete(cc.twitch);

                if(p){
                    SN.RemoveObject_(p);
                    console.log('player removed by cleanup');
                }
            }
        });
    };

    //syncs with client
    //takes in server object.  or normal object
    SN.RemoveObject_ = function(p, useClientDelay=false){
        if(p && G.IsServer){
            SN.StateUpdate_(G.Tick+5, { rm: (p.pid != null ? p.pid : p.oid), d:useClientDelay }, function(){
                console.log('server remove obj', )
                if(p.sid && p.guy){
                    if (p.con)
                        p.con.destroy('server removed');
                    if (p.sock)
                        p.sock.disconnect();
                    console.log('server removal');

                    t.Objs_.delete(p.pid);
                    t.Players_.delete(p.pid);
                    G.RemoveObject_(p.guy);
                }else{
                    G.RemoveObject_(p);
                }
            });
        }
    };

    SN.Reset_ = function(){
        UT.Events = {};
        t.Objs_.forEach(p => {
            G.RemoveObject_(p.guy);
        });
        t.Objs_.clear();
        t.Players_.clear();
        G.Cleanup_();
        G.TogglePause(false);
    };

    //not applying update at same Tick client/server side??
    SN.StateUpdate_ = function (tick, args = {}, event){
        args.tick = tick;

        G.TickFunc(tick, function(){
            if(event) event();
            UT.trigger('GameStateUpdate', args);
        });

        SN.CanConnect.forEach(cc=> {
            cc.sock.emit('game', args);
        });
    };

    //only players can have lost visibility
    SN.UpdateLocalIds_ = function(){
        return;
        t.Players_.forEach(p1 => {
            //var temp = new Map();
            p1.visibleIds_.clear();

            t.Objs_.forEach(p2 => {

                p1.visibleIds_.set(p2.pid,'ok'); //temp fix for all
                /*
                if(!p2.con)
                    temp[p2.pid] = 'ok';
                else{
                    if (G.dist(p1.guy.pos, p2.guy.pos) < ((G.Width / 2) + 350)) {
                        temp[p2.pid] = 'ok';

                        if (!p1.visibleIds_[p2.pid])
                            temp[p2.pid] = 'new';
                    } else if (p1.visibleIds_[p2.pid] == 'ok') {
                        temp[p2.pid] = 'exit';
                    }
                }*/
            });
            //p1.visibleIds_ = temp;
        });
    };

    //--------Decoding Packet Information

    SN.Codify_ = function (key, val, tick) {
        var tcode = String.fromCharCode((tick % 100) + 22);
        //tcode used for syncing GTick??

        if (!key || !tick)
            return "";

        //base === true
        var conv = String.fromCharCode(EN.KeyMap.get(key)) + tcode;

        if (val === true)
            conv = conv
        else if (val === false)
            conv += '|';
        else {
            if (val.nums) {
                val.nums._each(v => {
                    conv += SN.UTFNum_(v);
                });
            }
            if (val.data != null) {
                conv += '|';
                conv += val.data;
            }
        }

        return conv;
    };

    SN.FetchKeys_ = function (guy) {
        var keys = "";
        EN.KeyCodes.forEach((v, key) => {
            if (guy[v]) { //false is just assumed by client
                if (guy[v] == 1)
                    keys += String.fromCharCode(key);
                else if (guy[v].nums) {
                    keys += String.fromCharCode(key);
                    for (var i = 0; i < guy[v].nums.length; i++)
                        keys += SN.UTFNum_(guy[v].nums[i]);
                    if(guy[v].data != null)
                        keys += ('|' + guy[v].data);
                }
                else if (guy[v])
                    keys += String.fromCharCode(key) + guy[v];
            }
        });
        return keys;
    };

    SN.TickFromChar_ = function (str, diff) {
        var num = str.charCodeAt(0) + (diff ? diff : 0);
        var t1 = Math.floor(CN.ServerTick_ / 100) * 100;//rounded hundred
        var smallestDiff = 999;
        var tick = t1 + num;

        for (var i = -1; i < 2; i++) {
            var diff = Math.abs((t1 + (i * 100) + num) - CN.ServerTick_);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                tick = t1 + (i * 100) + num;
            }
        }
        return tick;
    };

    SN.Form = function (num, round = 3) {
        return Number(num.toFixed(round));
    };

    //assumes toFixed(1)
    //converts number to 3 byte +/-50,000.0 char. not anymore?
    SN.UTFNum_ = function (num) {
        num = Number(num);

        if (Math.abs(num) > 49500) {
            num = 0;
            console.log('overflow error - max # of 50,000');
        }

        num = num < 0 ? 50000 + Math.abs(num) : num;
        var str = Math.abs(num).toFixed(3).toString().padStart(9, '0');

        return String.fromCharCode(Number(str.substring(0, 2)) + 22) +
            String.fromCharCode(Number(str.substring(2, 4)) + 22) +
            String.fromCharCode(Number(str[4] + str[6]) + 22) +
            String.fromCharCode(Number(str.substring(7, 9)) + 22);
    };

    SN.CodeToNum_ = function (pack) {
        var lastN = (pack.charCodeAt(2) - 22).toString().padStart(2, '0')[0];
        var dec = (pack.charCodeAt(2) - 22).toString().padStart(2, '0')[1];

        var num = Number((pack.charCodeAt(0) - 22) +
            (pack.charCodeAt(1) - 22).toString().padStart(2, '0') +
            lastN + '.' + dec + (pack.charCodeAt(3) - 22).toString().padStart(2, '0'));

        if (num >= 50000)
            num = -1 * (num - 50000);

        return SN.Form(num);
    };

    //single player packet
    SN.UnPack_ = function (pack, tick) {
        var data = {};
        data.actions_ = [];
        data.keys = [];
        data.tick = tick;
        data.isExit = pack.length == 3;

        if (pack[0] == '|') {
            data.pid = pack.substring(1, 4);
            pack = pack.substring(4);
        }
        else {
            data.pid = SN.ConIdMap.get(pack.charCodeAt(0));
            pack = pack.substring(1);
        }

        data.isFix = pack[0] && pack[0].charCodeAt(0) >= 22; //22 is the last action-code

        if (data.isFix) {
            var nums = [];
            var tnums = 4;
            if (pack[4 * 4] && pack[4 * 4].charCodeAt(0) >= 22)
                tnums = 5;

            for (var i = 0; i < tnums; i++) {
                nums.push(SN.CodeToNum_(pack.substring(0, 4)));
                pack = pack.substring(4);
            }

            data.pos = { x: nums[0], y: nums[1] };
            data.vel = { x: nums[2], y: nums[3] };
            data.angle = nums[4] ? nums[4] : 0;
            data.keys = SN.CodeToActions_(pack, false);
        } else
            data.actions_ = SN.CodeToActions_(pack, true);

        return data;
    };

    //code to action+keys
    SN.CodeToActions_ = function (pack, isAct) {
        var actions_ = [];
        var indexes = [];

        for (var i = 0; i < pack.length; i++) {
            var code = pack[i].charCodeAt(0);

            if (code < 22 && code != 0)
                indexes.push(i);
        }

        for (var i = 0; i < indexes.length; i++) {
            var end = indexes[i + 1] ? indexes[i + 1] : pack.length;
            var pak = pack.substring(indexes[i], end);
            var ob = {};
            var digit = pak[0].charCodeAt(0);

            ob.key = EN.KeyCodes.get(digit);//._first(x=> x == digit);

            pak = pak.substring(1);

            if (isAct) {
                ob.tick = SN.TickFromChar_(pak[0], -22);
                pak = pak.substring(1);
            }

            ob.val = {};

            if (pak.length == 0)
                ob.val = true;
            else if (pak[0] == '|')
                ob.val = false;
            else {
                var hasSplit = pak.indexOf('|') > -1;
                var numPak = hasSplit ? pak.split('|')[0] : pak;
                var dataPak = hasSplit ? pak.split('|')[1] : pak;

                if (numPak.length > 3 && numPak.length % 4 == 0) {
                    var nums = [];
                    for (var j = 0; j < (numPak.length); j += 4)
                        nums.push(SN.CodeToNum_(numPak.substring(j, j + 4)));
                    ob.val.nums = nums;
                }

                if (pak.length >= 1 && hasSplit) {
                    ob.val.data = dataPak.substring(0);
                }
            }

            actions_.push(ob);
        }

        return actions_;
    };

    //---------------------------------- Helper functions

    //hurtbox TickFunc adjust for sync between server/client myGuy/others
    SN.HurtboxTick = function(t, hurtbox) {
        if (G.IsServer || t.IsGuy) {
            var standardDelay = 3;
            var old = t.olds[t.olds.length - standardDelay - 1];
            if (old) {
                hurtbox.SetPos(old.pos.x + old.vel.x, old.pos.y + old.vel.y);
                hurtbox.SetVel(old.vel.x, old.vel.y);
            }
        } else {
            hurtbox.SetVel(t.vel.x, t.vel.y);
            if (CN.InterpDelay_ == 3) {
                hurtbox.SetPos(t.pos.x + t.vel.x, t.pos.y + t.vel.y);
                hurtbox.SetVel(t.vel.x, t.vel.y);
            }
            else {
                var old = t.olds[t.olds.length - 2];
                if (old) {
                    hurtbox.SetPos(old.pos.x + old.vel.x, old.pos.y + old.vel.y);
                    hurtbox.SetVel(old.vel.x, old.vel.y);
                }
            }
        }
    };

}(typeof exports === 'undefined' ? SN : exports));