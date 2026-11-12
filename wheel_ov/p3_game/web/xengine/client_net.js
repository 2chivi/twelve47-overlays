//client_net v1.0 
//generic client side functions

var CN = {
    //Objs_: new Map(),
    TickDiffs_: [],
    ServerTick_: -5000,
    UseUDP: true,
    //Players_: new Map(),
    Pings_: [],
    Ping_: 30,
    recErrors_: [],
    Ready_: false,
    LateAllowance: 10, //0 for none (specials only?)
    InQueue: true,
    IgnoreInputs: true,
    RecordedInputs: {},

    Connect_: function (sid, pinfo) {
        CN.InterpDelay_ = SN.FPI_ + 2; //frames
        CN.uid_ = G.UID_();
        CN.name_ = pinfo.name;
        CN.pinfo_ = pinfo;
        CN.sid_ = sid;
        CN.TickDiffs_ = [];
        CN.Ready_ = false;
        CN.ServerTick_ = -5000;
        CN.SetupComplete = false;
        CN.pingVars = [];
        CN.IncomingIQR = 0;
        CN.OutgoingIQR = 0;
        CN.MaxInterpDelay_ = { delay: 3, time: Date.now() };
        CN.ioGame = CN.ioGame ? CN.ioGame : new API(CN.pinfo_.loadData.PORT, CN.pinfo_.loadData.IP);
        CN.LastFuture = Date.now();
        CN.SnapsPerFrame = 0;
        CN.ioSource = new EventSource('/events/' + pinfo.name);

        AI.Setup_Guys();

        var gotData = function (data) {
            //data = JSON.parse(data);
            if (data[0] == 'u' && CN.SnapsPerFrame < 2) {
                var tick = SN.TickFromChar_(data[1], -22);
                CN.ProcessSnapshot_(data.substr(2), tick);
                CN.SnapsPerFrame++;
            }
            if (data[0] == 'p'){
                CN.Pinger_(data.split(','));
            }
        }

        //recieve server data func
        var handshake = function () {
            console.log('connecting');
            CN.ioGame.Sock.off('game');
            CN.ioGame.Sock.off('snap')
            pinfo.UseUDP = CN.UseUDP;

            CN.ioSource.onmessage = function (e) {
                gotData(e.data);
            };
            CN.ioSource.onerror = function(e){
                console.log('sourc error', e);
            }

            /*
            if (CN.UseUDP) {
                CN.Peer_.on('data', function (data) {
                    gotData(data);
                });
            } else {
                CN.ioGame.Sock.on('snap', function (data) {
                    gotData(data);
                });
            }*/

            var gcInfo = { uid: CN.uid_, pinfo };


            CN.ioGame.Call('JoinGame', gcInfo, function (data) {
                if (!data.CanJoin) {
                    clearTimeout(CN.ttr);
                    CN.ttr = setTimeout(function () {
                        if (self != top)
                            window.parent.location = window.parent.location.origin + "?twitch=" + pinfo.twitch + "&autojoin=1";
                        else
                            window.location = window.location.origin;
                    }, 1500);
                    return;
                }

                //testing --------------------------------------------------
                AI.JoinComputers(pinfo);

                //game engine has been initialized
                UT.trigger('GameConnect', {
                    FirstLoad: data.FirstLoad, done: function () {
                        console.log('GameConnect trigger -> tryied to ping fucn')
                        CN.PingFunc_();
                    }
                });

                CN.ioGame.Sock.on('game', function (args) {
                    CN.GameStateUpdate(args);
                });

                UT.on('cn_ready', 'ready1', function () {
                    if (CN.SetupComplete) return;

                    CN.ioGame.Call('GetGameState', [CN.uid_], function (args) {
                        console.log('cn_ready setup complete');
                        CN.SetupComplete = true;
                        CN.GameStateUpdate(args);
                    });
                });

                //diagnostics
                clearInterval(CN.ttLogs)
                CN.ttLogs = setInterval(function () {
                    var events = CN.Guy && CN.Guy.logEvents ? CN.Guy.logEvents : [];
                    var pstats = [
                        CN.uid_, CN.Ping_, (CN.IncomingIQR + CN.OutgoingIQR).toFixed(2),
                        G.cycleAvg ? G.cycleAvg.toFixed(2) : 0,
                        G.renderAvg ? G.renderAvg.toFixed(2) : 0,
                        CN.UseUDP,
                        CN.Guy ? CN.Guy.pinfo.name : '',
                    ];
                    CN.ioGame.FastCall('Diagnostics', { pstats, events }, function (data) {
                        if (data && data.events) {
                            M.Dad.refs.Logs.Update(data.pstats, data.events);
                            CN.pstats = data;
                            CN.NetworkIssues = data.events._any(x => x.oid == CN.uid_ && x.type == 1);
                        }
                        if (data) {
                            CN.ServerBehind = data.serverBehind;
                            CN.ServerCycle = data.serverCycle;
                        }
                    });
                    if (CN.Guy)
                        CN.Guy.logEvents = [];
                }, 5000);
            });
        };

        CN.ttUDP = setTimeout(function () {
            CN.UseUDP = false;
            if (CN.Peer_)
                CN.Peer_.destroy();
            console.log('failed udp. going for socket');
            handshake();
        }, 4000);

        UT.on('g_accum', 'cn', function () {
            console.log('reset accum');
            //SN.Log_(CN.name_, CN.ServerTick_, 'accum reset', G.acc_);
            SN.LogEvent(CN.Guy, CN.ServerTick_ + ': ACCUM-RESET ' + G.acc_);

            CN.SetupComplete = false;//regets gamestatedata
            //might want to get the active gamestate?

            CN.TickDiffs_ = [];
            CN.ServerTick_ = -5000;
            CN.Ready_ = false;
        });

        //attempt UDP stuff
        CN.Peer_ = new SimplePeer({
            initiator: true,
            trickle: true, objectMode: true,
            channelConfig: { ordered: false },
            config: { iceServers: SN.servers }
        });

        CN.Peer_.on('error', data => {
            console.log('udp error');
            SN.LogEvent(CN.Guy, CN.ServerTick_ + ': UDP-Error ' + data.message);
        });

        CN.Peer_.on('signal', data => {
            CN.ioGame.FastCall('Peer', { signal: data, oid: CN.uid_ }, function () { });
        });

        CN.ioGame.Sock.off('udp').on('udp', function (args) {
            CN.Peer_.signal(args);
        });

        CN.Peer_.on('connect', data => {
            if (CN.UseUDP) {
                console.log('PEER JS Connect -> handshake')
                handshake();
                clearTimeout(CN.ttUDP);
            }
        });
    },

    GameStateUpdate: function (args) {
        var tickDiff = G.Tick - CN.ServerTick_;
        var renderCalc = args.tick + tickDiff + CN.InterpDelay_;
        var serverCalc = args.tick + tickDiff;

        //guarentee that all objects are added in the same order??
        G.TickFunc(serverCalc, function () {
            if (args.order)
                G.objOrder = args.order;
            if (args.GU != null) {
                Object.keys(args.GU)._each(s => { GU[s] = args.GU[s]; });
                UT.trigger('GameStateUpdate', args);
            }
            if (args.reset) {
                UT.trigger('reset');
                CN.GameReset_(); console.log('game reset???');
            }
            if (args.pstate) {
                var t3 = {};
                Object.keys(args.pstate)._each(key => {
                    t3[key] = args.pstate[key];
                });
                CN.UpdatePState_(t3);
            }
            if (args.rm)
                CN.RemoveObj_(args.rm, args.d);
        });
    },

    RemoveObj_: function (oid, useInterpDelay) {
        console.log('remove cn', oid)
        if(useInterpDelay){
            G.TickFunc(G.Tick+CN.InterpDelay_, function(){
                var obj = G.Objs.get(oid);
                G.RemoveObject_(obj);
            });
        }else{
            var obj = G.Objs.get(oid);
            G.RemoveObject_(obj);
        }
    },

    GameReset_: function () {
        if (CN.Peer_)
            CN.Peer_.destroy();
        clearTimeout(CN.pto);
        /*
        CN.Objs_.forEach(x => { G.RemoveObject_(x); });
        CN.Players_.clear();// = new Map();//[];
        CN.Objs_.clear();// = new Map();//[];*/
        G.Objs._where(x=> x.IsServerObject).forEach(ob=> { G.RemoveObj_(ob) });

        CN.Connect_(CN.sid_, CN.pinfo_);
    },

    //SEND PING
    PingFunc_: function () {
        clearTimeout(CN.pto);

        if (!CN.ioGame.Sock.connected || !CN.Peer_.connected) {
            if (G.Editing){
                G.Offline = true;
                ioLogin.Sock.io.disconnect();
                CN.ioGame.Sock.io.disconnect();
                CN.ioSource.close();
                alert('disconnect');
            }else if(CN.Ping_ > 120){
                //alert("Poor Connection. Disconnected")
                $('#root').html('Disconnected. Poor Connection or Latency with Server.');
                setTimeout(function () { top.location.reload(); }, 5000);

            }else{
                $('#root').html('Lost Connection.  Reload to Try Again.')
                setTimeout(function () { top.location.reload(); }, 5000);
            }
            return;
        }

        if (G.acc_ < (G.FRate_ * 1.1)) {
            var arData = ['p', Date.now(), CN.InterpDelay_, CN.uid_];
            var data = JSON.stringify(arData);

            if (CN.UseUDP)
                CN.Peer_.send(data);
            else
                CN.ioGame.FastCall('Ping', data);
        } else {
            console.log('no ping sent.  engine behind on ticks.')
        }

        CN.pto = setTimeout(function () {
            CN.PingFunc_();
        }, (CN.Ready_ ? 1500 : 300) + Math.random() * 100);
    },

    //RECIEVE PING
    Pinger_: function (data) {
        if(G.Offline) return;
        var orig = Number(data[1]);
        var tping = Math.max(1, Date.now() - orig);
        CN.pingVars._queue(Date.now() - data[4], 22);
        var iqr = UT.IQR(CN.pingVars);
        CN.IncomingIQR = iqr;
        CN.OutgoingIQR = Number(data[3]);

        if (!CN.Ready_) {
            if (CN.Pings_.length >= 5 && CN.TickDiffs_.length > 3 && CN.ServerTick_ > 0) {
                UT.trigger('cn_ready');
                CN.Ready_ = true;
                console.log('ready at ' + CN.ServerTick_);
            }
        }

        if (CN.Pings_.length >= 5) {
            CN.Ping_ = UT.Median(CN.Pings_);
            if (window.location.hostname == 'localhost')
                CN.Ping_ = 100; //testing purposes

            //(SN.FPI_ - 1) + Math.ceil(0.85 + ((CN.Ping_ / 2) / G.FRate_));
            var buffer = 0.4 + ((CN.IncomingIQR * 3) / G.FRate_); //was 0.85
            var delayExact = buffer + ((CN.Ping_ / 2) / G.FRate_);
            var tdelay = Math.max(2, Math.min(3, Math.ceil(delayExact))); //max of 3 here. min of 2
            //max interpDelay.  + time last active?

            if (!CN.FoundDelay_ || (CN.InterpDelay_ != tdelay)) {

                if (!CN.FoundDelay_ || tdelay > CN.MaxInterpDelay_.delay || Date.now() > (CN.MaxInterpDelay_.time + 1000 * 30)) {
                    CN.MaxInterpDelay_.delay = tdelay;
                    CN.MaxInterpDelay_.time = Date.now();

                    CN.InterpDelay_ = CN.MaxInterpDelay_.delay;
                    CN.FoundDelay_ = true;
                    console.log('interp delay change ' + tdelay);
                    SN.LogEvent(CN.Guy, CN.ServerTick_ + ': INTERP-DELAY-CHANGE ' + tdelay);
                }
            } else if (CN.InterpDelay_ == tdelay) {
                CN.MaxInterpDelay_.time = Date.now();
            }
        }
        else
            CN.Ping_ = tping;

        CN.Pings_._queue(tping, 21);

        //sync server tick with local tick
        var exact = Number(data[2]) + ((CN.Ping_ / 2) / G.FRate_);

        if (!CN.ServerTick_ || CN.ServerTick_ < 0) {
            CN.ServerTick_ = Math.floor(exact);
            G.acc_ = ((exact % 1) * G.FRate_);
            CN.TickDiffs_ = [];
        }
        //should this include G.LastTime_ calcs?
        var myExact = CN.ServerTick_ + ((G.acc_) / G.FRate_) + ((Date.now() - G.LastAccumTime_) / G.FRate_);

        if (CN.TickDiffs_.length > 2 && G.acc_ < (G.FRate_ * 1.1) && Math.abs(CN.TickDiffs_._avg()) >= 0.5) {
            var diff = CN.TickDiffs_._avg();
            G.acc_ += (diff * G.FRate_);
            SN.LogEvent(CN.Guy, CN.ServerTick_ + ': time-travel SYNC' + diff);

            console.log('time travel happended ' + diff);
            CN.TickDiffs_ = [];
        } else {
            if (CN.Pings_.length > 3 && G.acc_ < (G.FRate_ * 1.1))
                CN.TickDiffs_._queue(exact - myExact, 14);
        }
    },

    UpdatePState_: function (state) {
        var pstate = state;
        if (!pstate) return;

        Object.keys(pstate)._each(oid => {
            var ob = G.Objs.get(oid);

            if(!ob)
                CN.CreateGameObject_(oid, pstate[oid].type, pstate[oid]);

            if (ob) {
                Object.keys(pstate[oid])._each(key => {
                    ob[key] = pstate[oid][key];
                });
            }
        });

    },

    CreateGameObject_: function(oid, type, pstate){
        var ob = G.Objs.get(oid);
        var alreadyAdded = G.ObjectsToAdd._any(x => x.oid == oid);

        if(!ob && !alreadyAdded){
            var ob = G.InitAndLoad(oid, type, pstate);
            ob.olds = [];
            ob.snaps = [];
            ob.IsServerObject = true;
            ob.conId = pstate.conId;
            ob.logEvents = [];
            SN.ConIdMap.set(pstate.conId, oid);

            if(type == 'g_dude'){
                G.TickFunc(G.Tick+2, function(){
                    UT.trigger('NewPlayer');
                });
            }

            console.log('------------server object created-- ' + oid);
            var isGuy = ob.oid == CN.uid_ || (CN.uids!=null && CN.uids._any(u => u == ob.oid));

            if (isGuy) {
                if (ob.oid == CN.uid_)
                    CN.Guy = ob;
                ob.IsGuy = true;
                ob.LastInputFrame_ = 0;
                console.log('------------LOCAL GUY created--');
            }
        }
    },

    ProcessSnapshot_: function (ss, tick) {
        var packs = ss.split('~');

        for (var i = 0; i < packs.length && packs[i].length > 0; i++) {
            var snap = SN.UnPack_(packs[i], tick);
            var ob = G.Objs.get(snap.pid);
            if(!ob && G.ObjectsToAdd.length > 0)
                ob = G.ObjectsToAdd._first(x=> x.oid == ob.oid);

            if (ob) {
                var tickDiff = G.Tick - CN.ServerTick_;

                if (snap.actions_.length > 0) {
                    snap.actions_._each(action => {
                        var special = action.key[0] == 'x';
                        var calc = action.tick + tickDiff + CN.InterpDelay_;

                        if (ob.IsGuy || ob.NoInterpDelay)
                            calc = action.tick + tickDiff;

                        if (!ob.IsGuy || special) {
                            var lateness = G.Tick - calc;
                            var extra = (Date.now() - G.LastTime_);

                            if (lateness <= 0 || (special && lateness <= CN.LateAllowance)){
                                G.TickAction(ob.oid, calc, action.key, action.val);
                            }

                            if (lateness > 0) {
                                var who = ob.IsGuy ? 'ME' : 'OTHER';
                                SN.LogEvent(ob, CN.ServerTick_ + ': client EVENT-' + who + ' late | ' + action.key + " | " + lateness + " - " + extra, 1);
                            }
                        }
                    });
                }

                if (snap.isFix && !ob.IsGuy && ob.NoInterpDelay == null) {
                    var calc = snap.tick + tickDiff + CN.InterpDelay_;
                    var lateness = G.Tick - calc;
                    var extra = (Date.now() - G.LastTime_);

                    if (lateness > 0)
                        SN.LogEvent(ob, CN.ServerTick_ + ': client recieve FIX-OTHER late - ' + lateness + " - " + extra, 1);
                    else {
                        G.TickAction(ob.oid, calc, null, snap.keys, function (ob, key, val) {
                            if (ob) {
                                EN.KeyCodes.forEach((v, key) => { ob[v] = false; });
                                val._each(x => { ob[x.key] = x.val; });
                            }
                        });
                    }
                }

                ob.snaps.push(snap);
                ob.snaps = ob.snaps._orderBy(x => x.tick);

                if (ob.snaps.length > 10)
                    ob.snaps.shift();
            }
        }
    },

    SendInput_: function (guy, key, val) {
        if(CN.IgnoreInputs) return;
        var buffer = 0.4 + ((CN.OutgoingIQR * 3) / G.FRate_); //was 0.85

        var ticks = ((CN.Ping_ / 2) / G.FRate_) + ((Date.now() - G.LastTime_) / G.FRate_);
        var CDIFF = Math.ceil(ticks + buffer);
        CN.FrameDelay_ = CDIFF;

        //no interp delay means all actions need to be delayed?
        if (CN.Guy.NoInterpDelay)
            CDIFF = Math.max(8, CDIFF);

        //prevents firing two actions at the same time?
        guy.LastInputFrame_ = Math.max(CN.ServerTick_ + CDIFF, guy.LastInputFrame_ + 1);
        var diff = CN.ServerTick_ - G.Tick;

        var clientAction = guy.LastInputFrame_ - diff;
        var pack = JSON.stringify(['i', G.UID_(), key, val, guy.LastInputFrame_, guy.oid]);

        if (CN.Ready_ || G.Editing) {
            if (CN.UseUDP && CN.Ready_)
                CN.Peer_.send(pack);
            CN.ioGame.FastCall('Input', pack); //safety
            if (!CN.Ready_ && G.Editing)
                clientAction = G.Tick + 2;
            G.TickAction(guy.oid, clientAction, key, val);
        }

        //record inputs for ai stuff
        AI.RecordInput(clientAction, key, val);
    },

    Interpolate_: function (ob) {
        if (!CN.Guy || !CN.Ready_) return;
        CN.renderTick_ = CN.ServerTick_ - (CN.InterpDelay_);

        //Making Corrections / Easing
        var shot = ob.snaps._first(x => x.tick == CN.renderTick_);


        if (shot && shot.isFix) {
            //if(ob.IsGuy)
                //console.log('fix: ' + shot.tick)
            if (ob.IsGuy || ob.NoInterpDelay) {
                var old = ob.olds._first(x => x.stick == shot.tick);

                if (old) {
                   // console.log('guy fix check', G.Tick, CN.ServerTick_)
                    var tickDiff = CN.ServerTick_ - shot.tick;
                    CN.EaseStart_(ob, tickDiff, old, shot, old.state, false);
                }
            } else {
                CN.EaseStart_(ob, 0, ob, shot, null, true);
            }
        }

        //was 102
        //round fixing for exact sync
        //var roundReset = ((ob.IsGuy || ob.NoInterpDelay) && CN.ServerTick_ % 44 == 0) ||
        //(!(ob.IsGuy || ob.NoInterpDelay) && (CN.renderTick_ % 44 == 0));

        var syncNum = ob.ranSync;
        var roundReset = ob.IsPlayer && ((ob.IsGuy && CN.ServerTick_ % 44 == syncNum) ||
            (!ob.IsGuy && CN.renderTick_ % 44 == syncNum));

        if (roundReset){
            ob.RoundedSync();
        }

        CN.SnapsPerFrame = 0;
    },

    EaseStart_: function (ob, tickDiff, cur, real, state, autofix) {
        var dist = G.dist(cur.pos, real.pos);

        //0.2
        if (dist > 0.1) {
            if (autofix) {
                console.log(ob.oid + ' other desync ' + ob.pos.x + " " + real.pos.x + " " + real.pos.y);
                ob.SetPos(real.pos.x, real.pos.y, real.angle);
                ob.SetVel(real.vel.x, real.vel.y);
            } else {
                SN.LogEvent(ob, CN.ServerTick_ + ': DESYNC - future fix attempt');
                G.EngineBehind = 60;//force render slowdown because of future stuff.
                console.log(tickDiff);
                if (tickDiff <= 5 && (Date.now() - CN.LastFuture) > 1000) {
                    console.log('real.pos', real.pos, 'real.vel', real.vel, 'real.ang', real.angle);
                    var fut = SIM.Future(ob, tickDiff, real.pos, real.vel, real.angle, state);
                    CN.LastFuture = Date.now();

                    ob.SetPos(fut.pos.x, fut.pos.y, fut.angle);
                    ob.SetVel(fut.vel.x, fut.vel.y);
                    console.log('myGuy desync - dist:' + dist + " tick:" + CN.ServerTick_);
                    console.log('fut.pos', fut.pos, 'fut.vel', fut.vel, 'fut.ang',fut.angle)
                }
                //CN.AnalysisLogs(ob);
            }
            ob.olds = [];
        }
    },

    AnalysisLogs: function (ob) {
        var posData = CN.Guy.tickLogs._each(tl => { return { tic: tl.tic, x: tl.x, y: tl.y, ang: tl.ang } })

        CN.ioGame.FastCall('Test1', [ob.oid, posData], function (slog) {
            if (slog) {
                var foundLog = CN.Guy.tickLogs._first(log => log.tic == slog.tic);
                console.log(slog);
                console.log(foundLog);
                CN.Guy.tickLogs = [];

                //compare each non-complex property for differences
                if (foundLog) {
                    var dataObj = { server: [], local: [] };
                    Object.keys(slog)._each(key => {
                        var isComplex = slog[key] instanceof Object;
                        if (!isComplex && slog[key] != foundLog[key]) {
                            dataObj.server.push(key + ": " + slog[key]);
                            dataObj.local.push(key + ": " + foundLog[key]);
                        }
                    });
                    SN.LogEvent(CN.Guy, foundLog.tic + ":_________desync-anal____________________: ", dataObj);

                }
            }
        });
    },

};