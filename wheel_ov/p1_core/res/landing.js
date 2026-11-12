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
if (IsServer) module.exports = API;//LINQ 1.3 : Fix inherit != null

var UT = {};
(function (exp) {
    var t = exp;
    t.Events = {};

    t.ran = function (arr) {
        return arr[Math.floor(arr.length * Math.random())];
    };

    t.Median = function(arro, order=true){
        var arr = arro.slice();
        if(order)
            arr = arr._orderBy(x=> x);
        var half = Math.floor(arr.length / 2);
        return arr[half];
    }

    t.Queue = function(){
        let data = {};
        let head = 0;
        let tail = 0;

        this.enQ = function (item, max) {
            data[tail] = item;
            tail++;
            if(tail > max)
                this.deQ();
        };

        this.deQ = function () {
            let item = data[head];
            delete data[head];
            head++;
            return item;
        };
    }

    t.IQR = function(arro){ //outlier resistance way of telling variance
        if(arro.length == 1) return 0;
        var arr = arro.slice()._orderBy(x => x);
        var half = Math.floor(arr.length / 2);
        var arrTop = arr.splice(0, half);
        var arrBot = arr.splice(-half);

        return t.Median(arrBot, false) - t.Median(arrTop,false);
    };

    //obsolete now, cause of Map
    t.List = function (obj) {
        if (!obj) return [];
        var nlist = [];

        if('next' in obj){
            for (var jn = obj; jn; jn = jn.next) nlist.push(jn);
            return nlist;
        }
        if ('m_next' in obj){
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
            this._each(x=> { sum += x });
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
        Array.prototype._queue = function(item, maxLength){
            this.push(item);
            if (this.length > maxLength)
                this.shift();
        };
        Map.prototype._where = function(func){ return t.WhereMap(this, func); };
        Map.prototype._each = function (func) { return t.WhereMap(this, func); };
        Map.prototype._any = function (func) { return (t.WhereMap(this, func).length > 0); };
        Map.prototype._first = function (func) { return t.WhereMap(this, func)[0]; };
        Map.prototype._queue = function (item, max) { 
            this.set(this.size, item);
            if(this.size > max)
                this.delete()
        };

        Object.defineProperty(Object.prototype, "_each", {
            value: function (func) { return t.Select(t.List(this), func); },
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

    t.Iterate = function(iterable){

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

    t.Max = function(objs, func, isMax){
        var max = null;
        var maxObj = null;
        for(var i = 0; i < objs.length; i++){
            if (max == null || (isMax ? (func(objs[i]) > max) : (func(objs[i]) < max))){
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

                if(typeof a1 == 'string')
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
        if(t.Events[ev]){
            Object.keys(t.Events[ev].subevents)._each(key => {
                t.Events[ev].subevents[key](stuff);
            });
        }
    };

}(typeof exports === 'undefined' ? UT : exports));

//UTIL v1.0

//#region Control Creation
var UX = {



};
//#endregion
