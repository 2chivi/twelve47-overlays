var IsServer = (typeof exports) !== 'undefined';

class API {
    constructor(port, ip, reconnect = true, serverLoc) {
        var t = this;
        t.reconnect = reconnect;
        t.Unique = 0;
        t.DoneFuncs = {};
        
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

    FastCall(method, args, done) {
        this.Call(method, args, done, true);
    }

    Call(method, args, done, fast=false) {
        var t = this;
        var key = (fast ? 'f' : '') + t.Unique;
        var time = Date.now();
        t.Unique++;

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
if (IsServer) module.exports = API;