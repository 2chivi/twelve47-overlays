//LINQ 1.3 : Fix inherit != null

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

