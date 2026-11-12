var e = exports;

e.ServerInfo = function (req, dal, key, args, done) {
    var info = {};
    info.players = SN.Objs_._where(x => x.guy && x.guy.IsPlayer).length;
    info.max = SN.MaxPlayers_;
    info.qlength = SN.Queue.length;
    info.GameStart = GU.GameStart;

    req.emit('any', key, info);
};

e.GetGameState = function (req, dal, key, args, done) {
    var info = { GU: {}, pstate: {}, tick: G.Tick };
    if(GU.Level != 0)
        info.start = true;

    GU.state._each(x => {
        info.GU[x] = GU[x];
    });
    SN.Objs_.forEach(x => {
        if(x.guy)
            SN.GetObjectState_(info.pstate, x);
    });

    var order = {};
    var i = 0;
    G.Objs.forEach((x,key) => {order[x.oid] = i; i++; });
    info.order = order;

    req.emit('any', key, info);
}

e.JoinGame = function (req, dal, key, args, done) {
    var cc = SN.CanConnect.get(args.pinfo.name);
    var info = { CanJoin: false, FirstLoad: SN.FirstLoad };
    var coopDude = !cc && args.pinfo.name == 'coop';
    
    if(coopDude)
        cc = SN.CanConnect.get('your_twitch');//._first(x => x.twitch == 'your_twitch');

    if(cc != null){
        dal.Get('chatter', { name: args.pinfo.name }, function(data){
            var chatter = data[0];

            
            if (!coopDude){
                cc.pinfo = args.pinfo;

                if(!chatter){
                    chatter = { name: args.pinfo.name, emote: ':-?)' };
                    dal.Save('chatter', chatter, function(){ });
                }
                Object.keys(chatter)._each(k=> { cc.pinfo[k] = chatter[k]; });
            }

            if(!coopDude)
                cc.uid = args.uid;
            cc.sock = req;
            if (coopDude){
                cc.pinfo.name = 'coop';
                cc.pinfo.color = UT.ran([0, 1, 2, 3]);
            }
            SN.SendNewPlayer(cc, args.uid);
            cc.connected = true;
            info.CanJoin = true;
            //delete SN.CanConnect[args.pinfo.name];
            

            req.emit('any', key, info);
        });
    }else{
        info.CanJoin = false;
        req.emit('any', key, info);
    }
}

e.SpotInQueue = function (req, dal, key, args, done) {
    var spot = SN.Queue.findIndex(x => x.twitch == args);
    var canJoin = SN.CanConnect.has(args);
    var info = {};
    info.spot = spot >= 0 ? spot : null;
    info.qlength = SN.Queue.length;
    info.canJoin = canJoin;
    info.GameStart = GU.GameStart;
    info.players = SN.Objs_._where(x => x.guy && x.guy.IsPlayer).length;
    info.max = SN.MaxPlayers_;

    req.emit('any', key, info);
}

e.GameQueue = function (req, dal, key, args, done) {
    var q = SN.Queue._first(x=> x.twitch == args);
    var roomInQ = SN.Queue.length < SN.MaxQueue;
    var canJoin = false;

    //!q for no duplicated. remove for testing??
    if (roomInQ && !q){
        q = {
            twitch: args,
            sock: req,
            spot: SN.Queue.length + 1,
        };

        SN.Queue.push(q);
        SN.UpdateQueue_();
        canJoin = SN.CanConnect.has(args);
    }

    req.emit('any', key, canJoin);
};

e.Peer = function (req, dal, key, args, done) {
    var con = SN.peers_[args.oid];

    if (!con) {
        con = new SN.sp({
            wrtc: SN.wrtc,
            objectMode: true, trickle: true,
            channelConfig: { ordered: false },
            config: { iceServers: SN.servers }
        });
        con.sock = req;
        con.oid = args.oid;

        con.on('signal', data => {
            con.sock.emit('udp', data);
        });
        con.on('data', data => {
            SN.PeerData_(data, con);
        });
        con.on('error', data => {
            con.destroyed = true;
        });

        SN.peers_[args.oid] = con;
    }

    if (!con.destroyed)
        con.signal(args.signal);
};

e.Input = function (req, dal, key, args, done) {
    args = JSON.parse(args);
    var player = SN.Objs_.get(args[5]);

    if (player) {
        var ai = { uid: args[1], key: args[2], val: args[3], tick: args[4] };
        SN.ApplyInput_(player, ai);
    }
};

e.Ping = function (req, dal, key, args, done) {
    args = JSON.parse(args);
    SN.HandlePing(args[3], args);
};