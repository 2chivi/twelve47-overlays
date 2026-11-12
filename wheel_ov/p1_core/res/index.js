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
/* ======== No Steal Code (>.>) support@example.com ======== */ 
class DD extends React.Component {
  constructor(props) {
    super();
    var t = this;
    t.state = {};
    t.state.data = props.data ? props.data : [];
    t.state.val = t.state.data[0];
  }

  OnChange(e) {
    var t = this;
    var i = $(e.target).find('option:selected').attr('index');
    t.state.val = t.state.data[i];
    if (t.props.onChange) t.props.onChange(t.state.data[i], t);
  }

  render() {
    var t = this;
    var ops = [];

    if (!t.state.val && t.state.data && t.state.data[0] != null) {
      t.state.val = t.state.data[0];
      if (t.props.onChange) t.props.onChange(t.state.data[0], t);
    }

    for (var i = 0; i < t.state.data.length; i++) {
      var x = t.state.data[i];
      var currVal = typeof t.state.val == 'object' ? t.state.val[t.props.valueType] : t.state.val;
      var val = typeof x == 'object' ? x[t.props.valueType] : x;
      var name = typeof x == 'object' ? x[t.props.nameType] : x;
      var select = currVal == val;
      if (select) ops.push( /*#__PURE__*/React.createElement("option", {
        selected: "true",
        index: i,
        value: val
      }, name));else ops.push( /*#__PURE__*/React.createElement("option", {
        index: i,
        value: val
      }, name));
    }

    return /*#__PURE__*/React.createElement("select", {
      className: "div-dd",
      onChange: e => t.OnChange(e)
    }, ops);
  }

}/* ======== No Steal Code (>.>) support@example.com ======== */ 
class Editor extends React.Component {
  constructor() {
    super();
    var t = this;
    t.state = {};
    t.Lines = [];
    t.grids = [];
    t.Text = [];
    t.rd = 20;
    t.showGrid = false;
    G.Editing = true;
    if (!G.Editing) return;
    var txt = {
      fontSize: 30,
      strokeThickness: 4,
      fontWeight: 600,
      fill: 'white',
      zIndex: 99
    };
    UT.on('new_world', 'e1', function () {
      setTimeout(function () {
        t.PopulateDropDowns();
        t.forceUpdate();
      }, 5000);
    });
    UT.on('new_world', 'edit1', function () {
      t.myLocation = G.circle(null, 10, {
        zIndex: 20,
        lineWidth: 2,
        lineColor: 0xffffff
      });
      t.mark = G.circle(null, 5, {
        zIndex: 20,
        lineWidth: 2,
        lineColor: 0xffffff
      });
      G.Stage_.addChild(t.mark);
      G.Stage_.addChild(t.myLocation);
      var color = 0xffffff;
      var o = {
        x: -2000,
        y: -4000
      };

      if (t.showGrid) {
        var points = [];

        for (var i = 0; i < 4000 / t.rd; i += 2) {
          points.push({
            x: -2000,
            y: -2000 + i * t.rd
          });
          points.push({
            x: 2000,
            y: -2000 + i * t.rd
          });
          points.push({
            x: 2000,
            y: -2000 + (i + 1) * t.rd
          });
          points.push({
            x: -2000,
            y: -2000 + (i + 1) * t.rd
          });
        }

        var gr1 = G.line2(null, points, {
          zIndex: 20,
          color: color,
          lineWidth: 2,
          lineAlpha: 0.05
        });
        G.Stage_.addChild(gr1);
        points = [];

        for (var i = 0; i < 4000 / t.rd; i += 2) {
          points.push({
            x: -2000 + i * t.rd,
            y: -2000
          });
          points.push({
            x: -2000 + i * t.rd,
            y: 2000
          });
          points.push({
            x: -2000 + (i + 1) * t.rd,
            y: 2000
          });
          points.push({
            x: -2000 + (i + 1) * t.rd,
            y: -2000
          });
        }

        var gr2 = G.line2(null, points, {
          zIndex: 20,
          color: color,
          lineWidth: 2,
          lineAlpha: 0.05
        });
        G.Stage_.addChild(gr2);
      }
    });
    $(window).on('mouseup', function (e) {
      if (t.createReady) {
        var pnt = {
          x: Math.ceil(CG.mx / t.rd) * t.rd,
          y: Math.ceil(CG.my / t.rd) * t.rd
        };
        t.Create(pnt.x, pnt.y);
      }

      if (t.findReady) {
        var pnt = {
          x: Math.ceil(CG.mx / t.rd) * t.rd,
          y: Math.ceil(CG.my / t.rd) * t.rd
        };
        t.Find(pnt.x, pnt.y);
      }

      if (t.state.drawing && e.target.nodeName == 'CANVAS') {
        t.clicked = true;
        var pnt = {
          x: Math.ceil(CG.mx / t.rd) * t.rd,
          y: Math.ceil(CG.my / t.rd) * t.rd
        };
        t.Points.push(pnt);
        var ss = [];

        t.Points._each(p => {
          ss.push(p.x);
          ss.push(p.y);
        }); //console.log(ss);


        console.log('G.InitAndLoad(null, "g_grass", { edge: true, pnts:[' + ss + ']});');
        var line = G.line(null, pnt.x, pnt.y, pnt.x, pnt.y, {
          zIndex: 20,
          color: 0xff,
          lineWidth: 6,
          lineOpacity: 1
        });
        G.Stage_.addChild(line);
        t.Lines.push(line);
        var ll = t.Points[t.Points.length - 1];

        if (ll) {
          var tx = G.text(null, (pnt.x - ll.x) / t.rd + "," + (pnt.y - ll.y) / t.rd, null, txt);
          tx.x = pnt.x;
          tx.y = pnt.y;
          G.Stage_.addChild(tx);
          t.Text.push(tx);
          var last = t.Points[t.Points.length - 2];
          if (last) console.log('ang', Math.atan2(pnt.x - last.x, -(pnt.y - last.y)), pnt, last);
        }

        G.SortGraphics();

        if (pnt.x == t.Points[0].x && pnt.y == t.Points[0].y && t.Points.length > 1) {
          var ss = [];

          t.Points._each(p => {
            ss.push(p.x);
            ss.push(p.y);
          });

          console.log('complte', ss); //box

          /*
          if(ss.length == 10 && (ss[0]==ss[2] || ss[1] == ss[3])){
              var w = t.Points._max(p => p.x).x - t.Points._min(p=> p.x).x;
              var h = t.Points._max(p => p.y).y - t.Points._min(p => p.y).y;
              var spx = (t.Points._max(p => p.x).x + t.Points._min(p => p.x).x)/2;
              var spy = (t.Points._max(p => p.y).y + t.Points._min(p => p.y).y) / 2;
              console.log('G.InitAndLoad(null, "g_box", {spx: '+spx+', spy: '+spy+', width: '+w+', height: '+h+'});')
              eval('G.InitAndLoad(null, "g_box", {spx: '+spx+', spy: '+spy+', width: '+w+', height: '+h+'});');
          }else{*/

          console.log('G.InitAndLoad(null, "g_land", {pnts:[' + ss + ']});');
          eval('G.InitAndLoad(null, "g_land", {pnts:[' + ss + ']});'); //}

          setTimeout(function () {
            t.PopulateDropDowns();
            t.forceUpdate();
          }, 1000);
          t.Lines = [];
          t.Text = [];
          t.Points = [];
        }
      }
    });
    t.ttLoop = setInterval(function () {
      var pnt = {
        x: Math.ceil(CG.mx / t.rd) * t.rd,
        y: Math.ceil(CG.my / t.rd) * t.rd
      };
      /*
      for(var i = 0; i < t.grids.length; i++){
          var l = t.grids[i];
          if(i < 100){
              l.x = -50*t.rd + pnt.x + i*t.rd;
              l.y = pnt.y;
          }else{
              l.y = -50 * t.rd + pnt.y + (i-100) * t.rd;
              l.x = pnt.x;
          }
      }*/

      if (t.state.drawing) {
        var tx = t.Text[t.Text.length - 1];
        var line = t.Lines[t.Lines.length - 1];
        var opnt = t.Points[t.Points.length - 1];

        if (line) {
          line = G.line(line, opnt.x, opnt.y, pnt.x, pnt.y, {});
          tx = G.text(tx, (pnt.x - opnt.x) / t.rd + "," + (pnt.y - opnt.y) / t.rd, null, txt);
          tx.x = pnt.x + 30;
          tx.y = pnt.y;
        }
      }

      if (t.mark) {
        t.mark.x = pnt.x;
        t.mark.y = pnt.y;
      }
    }, 50);
  }

  PopulateDropDowns() {
    var t = this;

    var pobjs = G.Objs._where(x => x.mods != null);

    var types = Object.keys(window)._where(x => x.substring(0, 2) == 'g_');

    t.refs.ddObjs.setState({
      val: null,
      data: pobjs
    });
    t.refs.ddTypes.setState({
      val: null,
      data: types
    });
    var temp = eval('new ' + types[0] + "('test')");
    t.typeVals = [];

    if (!t.typeProps) {
      t.typeProps = temp.mods._where(x => typeof x != 'object');

      t.typeProps._each(m => {
        t.typeVals.push(temp[m] != null ? temp[m] : '');
      });
    }

    console.log('fix drops');
  }

  PickedType() {
    var t = this;
    var type = t.refs.ddTypes.state.val;
    var temp = eval('new ' + type + "('test')");
    t.typeVals = [];
    t.typeProps = temp.mods._where(x => typeof x != 'object');

    t.typeProps._each(m => {
      t.typeVals.push(temp[m] != null ? temp[m] : '');
    });

    t.forceUpdate();
  }

  PickedObj(obj) {
    var t = this;
    t.forceUpdate();
    setTimeout(function () {
      if (t.obj) {
        t.myLocation.x = t.obj.pos.x;
        t.myLocation.y = t.obj.pos.y;
      }
    }, 500);
  }

  Zoom(dir) {
    G.Stage_.scale = {
      x: G.Stage_.scale.x *= dir,
      y: G.Stage_.scale.y *= dir
    };
  }

  Draw() {
    var t = this;
    var removals = t.Lines.slice().concat(t.Text.slice());
    t.Text = [];
    t.Lines = [];
    t.Points = [];

    removals._each(x => {
      G.Stage_.removeChild(x);
    });

    removals = [];
    t.setState({
      drawing: !t.state.drawing
    });
  }

  Mod(e, m) {
    var t = this;
    t.obj[m] = $(e.target).val();
    t.forceUpdate();
    console.log($(e.target).val());
  }

  ModType(e) {
    var t = this;
    var m = Number($(e.target).attr('index'));
    t.typeVals[m] = $(e.target).val();
    t.forceUpdate();
    console.log($(e.target).val() + " " + m);
  }

  Reset() {
    var t = this;

    if (t.obj) {
      var newString = t.Print(t.obj);
      G.RemoveObject_(t.obj);
      G.TickFunc(G.Tick + 4, function () {
        t.nObj = eval(newString);
        setTimeout(function () {
          t.PopulateDropDowns();
          t.refs.ddObjs.setState({
            val: t.nObj
          });
          t.forceUpdate();
        }, 1000);
      });
    }
  }

  Delete() {
    var t = this;

    if (t.obj) {
      G.RemoveObject_(t.obj);
      G.TickFunc(G.Tick + 1, function () {
        t.PopulateDropDowns();
        t.forceUpdate();
      });
    }
  }

  FindReady() {
    var t = this;
    t.findReady = true;
  }

  Find(x, y) {
    var t = this;
    t.findReady = false;

    var pobjs = G.Objs._where(x => x.mods != null);

    var obj = pobjs._min(obj => G.dist(obj.pos, {
      x,
      y
    }));

    if (obj) {
      t.refs.ddObjs.setState({
        val: obj
      });
      t.forceUpdate();
      console.log(obj);
      t.PickedObj(obj);
    }
  }

  CreateReady() {
    var t = this;
    t.createReady = true;
  }

  Create(x, y) {
    var t = this;
    var type = t.refs.ddTypes.state.val;
    var props = {};
    t.createReady = false;
    props.spx = x;
    props.spy = y;
    $('input[mtype]').each(function () {
      if ($(this).val().length > 0) {
        if (isNaN($(this).val())) props[$(this).attr('mtype')] = $(this).val();else props[$(this).attr('mtype')] = Number($(this).val());
      }
    });
    var nobj = 'G.InitAndLoad(null, "' + type + '",' + JSON.stringify(props) + ')';
    console.log(nobj);
    t.nObj = eval(nobj);
    G.TickFunc(G.Tick + 1, function () {
      t.PopulateDropDowns();
      t.refs.ddObjs.setState({
        val: t.nObj
      });
      t.refs.ddTypes.setState({
        val: type
      });
      t.forceUpdate();
    });
  }

  PrintLevel() {
    var s = "";
    var i = 0;
    G.Objs.forEach((ob, key) => {
      if (ob.mods && !ob.delay && !ob.minWorld) {
        var props = {};
        var creation = 'G.InitAndLoad'; //!ob.IsMover ? 'G.InitAndLoad' : 'GU.MovingObj';

        ob.mods._each(m => {
          props[m] = ob[m];
        });

        if (ob.IsServerObj) s += 'SN.SendNewObject(G.UID_(), "' + ob.type + '",' + JSON.stringify(props) + ') \n';else s += creation + '("g' + i.toString().padStart(3, '0') + '", "' + ob.type + '",' + JSON.stringify(props) + ') \n';
        i++;
      }
    });
    console.log(s);
  }

  Print() {
    var t = this;
    var props = {};

    t.obj.mods._each(m => {
      props[m] = t.obj[m];
    });

    var test = 'G.InitAndLoad("' + t.obj.oid + '", "' + t.obj.type + '",' + JSON.stringify(props) + ')';
    console.log(test);
    console.log('printed');
    return test;
  }

  render() {
    var t = this;
    var drawName = t.state.drawing ? 'Stop Draw' : 'Draw';
    var inputs = [];
    var createInputs = [];
    t.obj = t.refs.ddObjs ? t.refs.ddObjs.state.val : null;

    if (t.obj) {
      t.obj.mods._each(m => {
        inputs.push( /*#__PURE__*/React.createElement("div", null, m, ": ", /*#__PURE__*/React.createElement("input", {
          value: t.obj[m],
          onChange: e => {
            t.Mod(e, m);
          }
        })));
      });
    }

    if (t.typeProps) {
      for (var i = 0; i < t.typeProps.length; i++) {
        var tp = t.typeProps[i];
        var v = t.typeVals[i];
        if (tp != 'spx' && tp != 'spy') createInputs.push( /*#__PURE__*/React.createElement("div", null, " ", /*#__PURE__*/React.createElement("span", null, tp, ":"), " ", /*#__PURE__*/React.createElement("input", {
          mtype: tp,
          index: i,
          value: v,
          onChange: e => {
            t.ModType(e);
          }
        }), " "));
      }
    }

    return /*#__PURE__*/React.createElement("div", {
      className: "Editor"
    }, /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.Zoom(1.2);
      }
    }, "Z-In"), /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.Zoom(0.8);
      }
    }, "Z-Out"), /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.Draw();
      }
    }, drawName), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DD, {
      ref: "ddTypes",
      valueType: "name",
      nameType: "name",
      onChange: () => {
        t.PickedType();
      }
    })), /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.CreateReady();
      }
    }, "Create"), /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.PrintLevel();
      }
    }, "Print"), /*#__PURE__*/React.createElement("div", null, createInputs), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DD, {
      ref: "ddObjs",
      valueType: "oid",
      nameType: "oid",
      onChange: (v, e) => {
        t.PickedObj(v, true);
      }
    })), /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.Reset();
      }
    }, "Reset"), /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.Delete();
      }
    }, "Del"), /*#__PURE__*/React.createElement("div", {
      class: "btn",
      onClick: () => {
        t.FindReady();
      }
    }, "Find"), inputs);
  }

}class Stats extends React.Component {
  constructor() {
    super();
    var t = this;
    t.state = {
      FPS: 0,
      Cycle: 0,
      Ping: 0,
      Acc: 0,
      Render: 0
    };
    setInterval(function () {
      if (CN.Ping_) {
        t.setState({
          Ping: CN.Ping_,
          Cycle: G.cycleAvg.toFixed(2),
          ServerCycle: CN.ServerCycle ? CN.ServerCycle.toFixed(2) : 0,
          Acc: G.acc_.toFixed(2),
          Render: G.renderAvg.toFixed(2),
          IQR: (CN.IncomingIQR + CN.OutgoingIQR).toFixed(2)
        });
      }
    }, 2000);
  }

  render() {
    var t = this;
    var danger = {
      color: '#ff8282'
    };
    var show = {
      display: 'block'
    };
    var stuff = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "Stats",
      style: this.state.style
    }, /*#__PURE__*/React.createElement("div", {
      style: t.state.Ping > 90 ? danger : null
    }, "PING: ", t.state.Ping), /*#__PURE__*/React.createElement("div", {
      style: t.state.IQR > 20 ? danger : null
    }, "IQR: ", t.state.IQR), /*#__PURE__*/React.createElement("div", {
      style: t.state.Render > 8 ? danger : null
    }, "Render: ", t.state.Render), /*#__PURE__*/React.createElement("div", {
      style: t.state.Cycle > 8 ? danger : null
    }, "Engine: ", t.state.Cycle), /*#__PURE__*/React.createElement("div", {
      style: t.state.ServerCycle > 15 ? danger : null
    }, "Server: ", t.state.ServerCycle), /*#__PURE__*/React.createElement("div", {
      style: t.state.Acc > 35 ? danger : null
    }, "Acc: ", t.state.Acc)), /*#__PURE__*/React.createElement("div", {
      className: "Warnings",
      style: this.state.style
    }, /*#__PURE__*/React.createElement("div", {
      style: CN.ServerBehind ? show : null
    }, "Server Issues"), /*#__PURE__*/React.createElement("div", {
      style: CN.NetworkIssues ? show : null
    }, "Network Issues"), /*#__PURE__*/React.createElement("div", {
      style: G.EngineBehind ? show : null
    }, "CPU Warning"), /*#__PURE__*/React.createElement("div", {
      style: G.RenderBehind ? show : null
    }, "GPU Warning")));
    return stuff;
  }

}//client_net v1.0 
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

};//Server_Net v1.1 cleanup
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

}(typeof exports === 'undefined' ? SN : exports));//xgame v1.01 : window resize errors
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
    G.Objs = new Map();
    G.cycleAvg = G.renderAvg = G.packetAvg = G.avgTotal = 0;
    G.EngineBehind = 0;
    G.RenderBehind = 0;
    G.bounds = {min: {x: 0, y: 0}, max: {x: 0, y: 0}};
    G.Dudes = [];
    G.reOrderNeeded = false;

    G.Init_ = function (con, onLoad) {
        PL = planck;
        PL.v2 = PL.Vec2;
        PL.internal.Settings.maxPolygonVertices = 48;

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
        G.Dudes = [];

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
        });
        G.World_.on('end-contact', function (contact) {
            G.ends.push({
                fixA: contact.getFixtureA(),
                fixB: contact.getFixtureB(),
                obA: G.Objs.get(contact.getFixtureA().oid),
                obB: G.Objs.get(contact.getFixtureB().oid),
                contact
            });
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
        obj.loadProps = JSON.parse(JSON.stringify(state));//creates copy
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

    G.AddObjectHelp_ = function (obj) {
        if (G.Objs.has(obj.oid))
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

            if(obj.parentObj)
                obj.parentObj.children = obj.parentObj.children._where(x=> x.removedObject == null);

            obj.parts._each(part => {
                part.grs._each(gr => { stage.removeChild(gr); });
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
        

    }

    G.TickFunc_ = function (delta) {
        G.TickInputCheck_();

        G.Objs.forEach(ob=> {
            ob.Tick(delta);
        });

        G.ObjectsToRemove._each(x => { G.RemoveObjectHelp_(x); });

        if(G.ObjectsToAdd.length > 0){
            G.reOrderNeeded = true;
            if (G.objOrder)
                G.ObjectsToAdd = G.ObjectsToAdd._orderBy(x => G.objOrder[x.oid]);

            var l1 = G.ObjectsToAdd.length;
            for (var i = 0; i < l1; i++){
                if (!G.ObjectsToAdd[i].parentObj)
                    G.ObjectsToAdd[i].Init();
            }

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

        if(!G.IsServer && G.Tick % 23 == 0 && G.reOrderNeeded){
            console.log('gr order');
            G.reOrderNeeded = false;
            G.ReSort();
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
                    b.obA.CollideStart({ myType: b.fixA.etype, oType: b.fixB.etype, other: b.obB, t: b.obA, contact: b.contact, myFix: b.fixA, oFix: b.fixB});
                if (b.obB.CollideStart && b.obA.oid != b.obB.oid)
                    b.obB.CollideStart({ myType: b.fixB.etype, oType: b.fixA.etype, other: b.obA, t: b.obB, contact: b.contact, myFix: b.fixB, oFix: b.fixA});
            }
        });
        G.ends._each(b => {
            if(b.obA && b.obB){
                b.obA.refreshData(); b.obB.refreshData();
                if (b.obA.CollideEnd)
                    b.obA.CollideEnd({ myType: b.fixA.etype, oType: b.fixB.etype, other: b.obB, t: b.obA, contact: b.contact, myFix: b.fixA, oFix: b.fixB });
                if (b.obB.CollideEnd && b.obA.oid != b.obB.oid)
                    b.obB.CollideEnd({ myType: b.fixB.etype, oType: b.fixA.etype, other: b.obA, t: b.obB, contact: b.contact, myFix: b.fixB, oFix: b.fixA });
            }
        });
        G.begins = [];
        G.ends = [];

        G.Objs.forEach(ob => {
            ob.PostPhysics();

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

            G.bounds = {
                buffer: 700,
                min: { x: G.Stage_.pivot.x - (G.Width / G.Stage_.scale.x) * 0.5, y: G.Stage_.pivot.y - (G.Height / G.Stage_.scale.x) * 0.5 },
                max: { x: G.Stage_.pivot.x + (G.Width / G.Stage_.scale.x) * 0.5, y: G.Stage_.pivot.y + (G.Height / G.Stage_.scale.x) * 0.5 }
            };

            //Screen Movement detection (performance)
            if(mainTick){
                //Calc the Edges of the scren

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



        //left
        var x = 150;
        var y = G.Height -150;// (G.Height - (250 * G.Stage_.scale.x));

        if (GU.position.toLowerCase().includes('right'))
            x = G.Width - 160;
        if (GU.position.toLowerCase().includes('top'))
            y = 230;
        
        //if(GU.position.toLowerCase().includes('top'))
            //y = ( (250 * G.Stage_.scale.x));

        G.Stage_.x = x;
        G.Stage_.y = y;

        var scale = 100*G.Stage_.scale.x;

        var x2 = -scale;
        var y2 = scale;
        if (GU.position.toLowerCase().includes('right'))
            x2 = scale;
        if (GU.position.toLowerCase().includes('top'))
            x2 = -scale;
        
        G.Stage_.pivot.x = x2;
        G.Stage_.pivot.y = y2;
        

        //camera stuff
        //switch to a basic Camera Trap.  Box which you can pass from cenx/ceny
        if (CN && CN.Guy){

            //G.Stage_.x = -(CN.Guy.interpX - (G.Width / G.Stage_.scale.x)/2);
            //G.Stage_.y = -(CN.Guy.interpY -(G.Height / G.Stage_.scale.x)/2);

            var settings = { xpct: 0.5, ypct: 0.65, boxWidth: 40, boxHeight: 100};
            if (CN.Guy.cameraSettings)
                Object.assign(settings, CN.Guy.cameraSettings);


            var cenx = (G.Stage_.pivot.x);
            var ceny = (G.Stage_.pivot.y);
            G.Stage_.x = (G.Width) * settings.xpct;
            G.Stage_.y = (G.Height ) * settings.ypct;

            //G.Stage_.pivot.x = CN.Guy.interpX;// - ((G.Width / G.Stage_.scale.x) / 2);
            //G.Stage_.pivot.y = CN.Guy.interpY;// - ((G.Height / G.Stage_.scale.x) / 2);

            if (CN.Guy.interpX > (cenx + settings.boxWidth))
                G.Stage_.pivot.x = (CN.Guy.interpX - settings.boxWidth);
            if (CN.Guy.interpX < (cenx - settings.boxWidth))
                G.Stage_.pivot.x = (CN.Guy.interpX + settings.boxWidth);

            if (CN.Guy.interpY < (ceny - settings.boxHeight))
                G.Stage_.pivot.y = (CN.Guy.interpY + settings.boxHeight);
            if (CN.Guy.interpY > (ceny + settings.boxHeight))
                G.Stage_.pivot.y = (CN.Guy.interpY - settings.boxHeight);


            if (!G.testang)
                G.testang = 0;
            if (CN.Guy.con.getAngularVelocity() != 0)
                G.testang = -CN.Guy.con.getAngle();

            //G.Stage_.rotation = G.testang;

            /*
            var settings = CN.Guy.cameraSettings;
            var xpct = settings!=null ? settings.xpct : 0.5;
            var ypct = settings!=null ? settings.ypct : 0.5;

            var cenx = (G.Stage_.pivot.x + xpct * (G.Width / G.Stage_.scale.x));
            var ceny = (G.Stage_.pivot.y + ypct * (G.Height / G.Stage_.scale.x));
            var xwidth = 40;// + Math.abs(CN.Guy.vel.x)*0.015;
            var yheight = 100;// + Math.abs(CN.Guy.vel.y) * 0.015;

            if (CN.Guy.interpX > (cenx + xwidth))
                G.Stage_.pivot.x = (CN.Guy.interpX - xwidth) - ((G.Width / G.Stage_.scale.x) * xpct);
            if (CN.Guy.interpX < (cenx - xwidth))
                G.Stage_.pivot.x = (CN.Guy.interpX + xwidth) - ((G.Width / G.Stage_.scale.x) * xpct);

            if (CN.Guy.interpY < (ceny - yheight))
                G.Stage_.pivot.y = (CN.Guy.interpY + yheight) - ((G.Height / G.Stage_.scale.x) * ypct);
            if (CN.Guy.interpY > (ceny + yheight))
                G.Stage_.pivot.y = (CN.Guy.interpY - yheight) - ((G.Height / G.Stage_.scale.x) * ypct);
            */




            /*
                            
            var noffx = (G.Width / G.Stage_.scale.x)/2;
            var noffy = (G.Height / G.Stage_.scale.x)/2;
            
            //var vs = G.vsub({x: CN.Guy.interpX, y: CN.Guy.interpY}, {x:368,y:675});
            //var ang = Math.atan2(vs.x,vs.y);
            if(!G.testang)
            G.testang = 0;

            G.Stage_.rotation = G.testang;
            G.Stage_.pivot.x += noffx;
            G.Stage_.pivot.y += noffy;
            G.Stage_.x = noffx;
            G.Stage_.y = noffy;*/
        

            if (CG.UpdatePointer && mainTick)
                CG.UpdatePointer();
        }
    };

    G.UpdateParticles_ = function(mainTick){

        G.ParticleContainers.forEach((con,key)=> {
            if (mainTick || con.alwaysUpdate) {
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
                        //con.removeChild(p);
                        p.destroy();
                    }
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

            G.TickFunc(G.Tick + 1, function () {
                G.ParticleContainers.forEach(p => { p.removeChildren(); });
            });

            //G.UI_.removeAllListeners();
            //G.UI_.removeChildren();
            G.Stage_.removeAllListeners();
            G.Stage_.removeChildren();
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
        G.TimeStep = 1/ G.FRate_;

        if (G.acc_ >= G.FRate_) {
            engineStart = Date.now();
            if(!G.IsServer)
                G.CheckGamepad();

            G.hasDoneSecondRender = false;
            G.hasUpdatedRender = false;
            mainTickTriggered = true;
            G.TickFunc_(G.deltaStore_ / G.FRate_);
            G.deltaStore_ = 0;

            G.World_.step(G.TimeStep);
            
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
        if(tick > period && tick > 0 && part.animate.repeat){
            part.aTime = G.ATick - (tick % period);
            if(!part.animate.loop)
                states = states.reverse();
        }
            
        var offset = (part.animate.offset != null ? part.animate.offset : 0);
        G.TweenMove(part, gobj, isGraph, G.TweenStep(states, period, (tick+offset)%period, type));
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
            scalex: state[5] != null ? state[5] + ((nstate[5] - state[5]) * statePct) : null,
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
                part.scale.y = step.scale * part.ogscaleY;
                part.scale.x = step.scale * part.ogscaleX * dir;
            }
            if(step.scalex != null){
                part.scale.x = step.scalex * part.ogscaleX * dir;
            }
            if(step.opac != null)
                part.grAlpha = step.opac;

        } else {
            //real object animations?
        }
        return part;
    };

    //----------------------------------------------------------------------------------------

    //0->16  Mask is stuff you can hit?
    //generic = 0, dude = 1, terrain = 2, gate=5, punchbox=6,hurtbox=7 hurtbox=8(t2)
    //--- serverTerrain = 14, delayTerrain = 15 (moving plats)
    G.cats = [0x0001, 0x0002, 0x0004, 0x0008, 0x0010, 0x0020,
        0x0040, 0x0080, 0x0100, 0x0200, 0x0400, 0x0800, 0x1000, 0x2000, 0x4000, 0x8000];

    G.Default = {
        color: 0x000000,
        lineColor: 0x000000,
        alignment: 1, //  (0.5 = middle, 1 = outer, 0 = inner).
        zIndex: 0
    };

    G.ToImg = function(gr, filter, ops, size){

        var ft = G.filterTex(filter, 28, gr, {});
        return G.image(null, ft, ops);
    }

    //sprite to FX texture?
    G.filterTex = function (filter, pad, gr, ops = {}) {
        if(filter){
            filter.padding = pad * 2;
            gr.filters = [filter];
        }

        gr.pivot.set(0, 0);
        
        Object.assign(gr, ops);
        var bounds = gr.getLocalBounds();

        var dx = 0 - bounds.x;
        var dy = 0 - bounds.y;
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
        if (!gr) { gr = new PIXI.Sprite(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        gr.texture = texture;
        gr.pivot.set(gr.width / 2, gr.height / 2);
        if(ops.size)
            gr.scale.set(gr.size, gr.size);
       
        if(ops.fitx){
            gr.scale.x = ops.fitx / gr.width;
            gr.scale.y = ops.fity / gr.height;
        }

        return gr;
    };

    G.circle = function(gr, radius, ops){
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);

        gr.clear();
        if (gr.texture != null)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);

        gr.lineStyle(gr.lineWidth, gr.lineColor, gr.lineAlpha, gr.alignment);

        gr.drawCircle(0, 0, radius);
        gr.endFill();

        if(ops.hole){
            gr.beginHole();
            gr.drawCircle(0,0, ops.hole);
            gr.endHole();
        }

        gr.filters = gr.filter ? [gr.filter] : null;

        return gr;
    };

    G.texMatrix = function(ops){
        return new PIXI.Matrix(ops.tscale ? ops.tscale : 1, 0, 0, ops.tscale ? ops.tscale : 1, ops.tpivot ? ops.tpivot.x:0, ops.tpivot?ops.tpivot.y:0)
    }

    G.center = function(verts){
        return {
            x: (verts._min(v => v.x).x + verts._max(v => v.x).x) / 2,
            y: (verts._min(v => v.y).y + verts._max(v => v.y).y) / 2
        };
    }

    G.offsetToCenter = function(verts){
        var newPoints = [];
        
        var center = G.center(verts);
        for (var i = 0; i < verts.length; i++) {
            var v = verts[i];
            v.x = v.x - center.x;
            v.y = v.y - center.y;
            newPoints.push(v.x,v.y);
        }
        return newPoints;
    }

    G.poly = function(gr, points, ops){
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        //gr.scale = {x:1,y:1};
        gr.clear();
        if (gr.texture)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);
        gr.lineStyle({ width: gr.lineWidth, color: gr.lineColor ? gr.lineColor : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha: 1, alignment: gr.alignment, join: 'round', cap: 'round'});

        var newPoints = points;

        if(ops.center !== false){
            var vs = G.VertsFromPath(points);
            var newPoints = G.offsetToCenter(vs);
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
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);
        gr.lineStyle({ width: gr.lineWidth, color: gr.lineColor ? gr.lineColor : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha : 1, alignment: gr.alignment, join: 'round', cap: 'round' });

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
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        ops.lineWidth = ops.lineWidth == 0 ? 2 : ops.lineWidth;

        gr.clear();
        if(gr.texture)
            gr.lineStyle({ matrix: G.texMatrix(ops), texture: gr.texture, width: gr.lineWidth, color: gr.color ? gr.color : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha : 1, alignment: 0.5, join: 'round', cap: ops.cap ? ops.cap : 'round' });
        else
            gr.lineStyle({ width: gr.lineWidth, color: gr.color ? gr.color : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha : 1, alignment: 0.5, join: 'round', cap: ops.cap ? ops.cap : 'round' });

        gr.moveTo(x, y);
        gr.lineTo(x2, y2);
        return gr;
    };

    G.line2 = function(gr, points, ops){
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        ops.lineWidth = ops.lineWidth == 0 ? 2 : ops.lineWidth;

        gr.clear();
        if(gr.texture)
            gr.lineStyle({ matrix: G.texMatrix(ops), texture: gr.texture, width: gr.lineWidth, color: gr.color ? gr.color : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha : 1, alignment: (gr.alignment != null ?gr.alignment : 0.5), join: 'round', cap: ops.cap ? ops.cap : 'round' });
        else
            gr.lineStyle({ width: gr.lineWidth, color: gr.color ? gr.color : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha : 1, alignment: 0.5, join: 'round', cap: ops.cap ? ops.cap : 'round' });


        for(var i = 0; i < points.length; i++){
            if(i==0)
                gr.moveTo(points[i].x, points[i].y);
            else
                gr.lineTo(points[i].x, points[i].y);
        }
        return gr;
    }

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

    //name, gr, z, fps, canScale=false, isStatic=false
    G.particle = function(ops){
        var part = {};
        var activeScale = ops.canScale != null ? ops.canScale : false;
        var activeRotation = ops.canRotate != null ? ops.canRotate : false;

        part.con = new PIXI.ParticleContainer(1000, 
            { scale: activeScale, alpha: true, rotation: activeRotation});
        
        if(ops.gr.baseTexture)
            part.texture = ops.gr;
        else{
            ops.gr.pivot.set(0,0);
            part.texture = G.Renderer_.generateTexture(ops.gr);
        }

        part.con.gr = ops.gr;
        part.con.zIndex = ops.z!=null ? ops.z : 0;
        part.con.alwaysUpdate = ops.alwaysUpdate != null ? ops.alwaysUpdate : false;
        part.con.isStatic = ops.isStatic != null ? ops.isStatic : false;

        var existing = G.ParticleContainers.get(ops.name);
        if(existing){
            existing.removeChildren();
            G.Stage_.removeChild(G.ParticleContainers.get(ops.name));
            G.ParticleContainers.delete(ops.name);
        }

        G.Stage_.addChild(part.con);
        G.ParticleContainers.set(ops.name, part.con);

        //G.Stage_.children = G.Stage_.children._orderBy(x => x.zIndex);
        return part;
    };

    //gr can be a fitlerTex as well
    G.spawnParticle = function(part, renderParent, ops){
        if (G.IsServer) return null;
        if (renderParent && !renderParent.InFrame && !part.isStatic)
            return;

        var grPart = new PIXI.Sprite();

        if(renderParent)
            grPart.oid = renderParent.oid;
        grPart.texture = part.texture;
        grPart.decay = true;
        Object.assign(grPart, ops);
        grPart.maxLife = grPart.maxLife ? grPart.maxLife : grPart.life;
        grPart.x = grPart.rx = grPart.rx0 = ops.pos.x;
        grPart.y = grPart.ry = grPart.ry0 = ops.pos.y;
        //grPart.rotation = Math.Pi*0.5;
        grPart.alpha = grPart.life / grPart.maxLife;
        if(grPart.background){
            grPart.cBack = -100 / grPart.background;
            grPart.offx = grPart.rx0 - ((G.bounds.min.x + grPart.rx0)/grPart.cBack);
            grPart.offy = grPart.ry0 - ((G.bounds.min.y + grPart.ry0)/grPart.cBack);
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

    G.sound = function(sound, item, vol, alwaysPlay=false){
        if (!G.IsServer && (item == null || item.InFrame)){
            //if(M.Dad && M.Dad.refs.Menu.state.showMenu) return;
            var globalVol = 100;// M.Dad.refs.Menu.state.fxVol / 100;
            var soundfx = CG[sound];
            

            if(item && item.IsPlayer && (!item.IsGuy || item.IsAI))
                vol = vol * 0.1;

            if (!soundfx.total) 
                soundfx.total = [];

            if (alwaysPlay || (item != null && item.IsGuy) || !soundfx.playing(soundfx.total[0])){
                var soundId = soundfx.play();

                if (vol != null) 
                    soundfx.volume(vol * globalVol, soundId);
                soundfx.total._queue(soundId,5);
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

    G.vsimilarity = function (v1, v2) { 
        var denom = (G.vmag(v1) * G.vmag(v2));
        if(denom == 0) return 0;
        return G.vdot(v1, v2) / denom; 
    };

    //finds how similar two vectors are 0==perpendicular
    G.vdot = function(v1, v2){ return (v1.x*v2.x) + (v1.y*v2.y) }

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
            props.center = false;
            return G.poly(null, pnts, props);
        }
    };

    G.InBox = function (obj, objPos, box, buffer) {
        return box != null &&

            ((objPos.x < (box.max.x + buffer) &&
            objPos.x > (box.min.x - buffer) &&
            objPos.y < (box.max.y + buffer) && 
            objPos.y > (box.min.x - buffer)) ||

            obj.min.x < (box.max.x + buffer) &&
            obj.max.x > (box.min.x - buffer) &&
            obj.max.y > (box.min.y - buffer) &&
            obj.min.y < (box.max.y + buffer));
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

    G.pointIntercept = function(p1, p2, p3){// p1, p2 are the line, p3=point
        var xd = p2.x - p1.x;
        var yd = p2.y - p1.y;
        var u = ((p3.x - p1.x)*(p2.x-p1.x) + (p3.y-p1.y)*(p2.y-p1.y)) / (xd*xd+yd*yd);
        return {x: p1.x + u*xd, y: p1.y + u*yd};
    }

    //colllide checks for ez use.
    G.CCheck = function(e, myType, oType, otherObjName, avoidSelf = true){
        var isColide = true;

        if(myType)
            isColide = isColide && e.myType == EN.Parts.get(myType);
        if(oType)
            isColide = isColide && e.oType == EN.Parts.get(oType);

        if(otherObjName)
            isColide = isColide && e.other.etype == EN.Objs.get(otherObjName);
        if(avoidSelf){
            isColide = isColide && e.t.oid != e.other.oid;
            if (e.t.parentObj && e.other.parentObj)
                isColide = isColide && e.t.parentObj.oid != e.other.parentObj.oid;
        }
        return isColide;
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

    G.IsCW = function(verts){
        var sum = 0;
        for(var i = 1; i < verts.length; i++)
            sum += (verts[i].x - verts[i-1].x)*(verts[i].y + verts[i-1].y);
        return sum <= 0;
    }

    G.lerp = function(thing, key, val, speed, useAngDiff){
        var dx = val - thing[key];

        if(useAngDiff)
            dx = G.AngDiff(val, thing[key]);

        speed = Math.abs(dx) <= speed ? Math.abs(dx) : speed;
        thing[key] += dx > 0 ? speed : -speed;
    };

    G.Paralax = function(ox, oy, offx, offy, z=-10){ //non-paralaxed positions into laxed
        var back = -100 / z;
        return { 
            x: ((G.Stage_.pivot.x - ox)/back) + ox + offx, 
            y: ((G.Stage_.pivot.y - oy)/back) + oy + offy
        };
    }

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
        t.alpha = 1;

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
            t.olds = [];

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
        t.vel.x = t.con.m_linearVelocity.x; //i dont understand why vel doesnt need adjustment.
        t.vel.y = t.con.m_linearVelocity.y;
        t.pos.x = t.con.m_xf.p.x * G.pscale;
        t.pos.y = t.con.m_xf.p.y * G.pscale;
    }

    PostPhysics(){
        var t = this;
        t.refreshData();
        if (t.olds && !t.IsServerObject)
            t.olds._queue({ pos: {x: t.pos.x, y: t.pos.y} }, 5);
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

        gr.type = type;
        gr.pivot.set(px + gr.pivot.x, py + gr.pivot.y);
        gr.wx = gr.ogx = wx;
        gr.wy = gr.ogy = wy;
        gr.wa = gr.oga = wa;
        gr.ogdx = gr.ogx >= 0 ? 1 : -1;
        gr.ogdy = gr.ogy >= 0 ? 1 : -1;
        gr.grAlpha = gr.alpha != null ? gr.alpha : 1;
        gr.ogAlpha = gr.grAlpha;

        gr.oz = gr.zIndex;
        gr.ogscaleX = gr.scale.x;
        gr.ogscaleY = gr.scale.y;
        bod.grs[type] = gr;
        bod.grKeys = Object.keys(bod.grs);

        if (!t.mainGraphic || gr.width > t.mainGraphic.width)
            t.mainGraphic = gr;

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

        t.parts._each(p=> {
            //p._reset();
        })
 
        for (var i = 0; i < t.children.length; i++)
            t.children[i].RoundedSync();

        t.refreshData();
    }

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
    }

    Render(mainTick, tickDiffRnd, pct){
        var t = this;
        var x = t.pos.x;
        var y = t.pos.y;
        var ang = t.con.getAngle();
        var doUpdate = mainTick || t.alwaysUpdate;

        //60fps interp estimation stuff - 
        if (t.olds && t.olds.length > 3 && !t.PositionSet) { //&&IsServerObject
            var earlyF = { pos: {x, y}, angle: ang };
            var lateF = t.olds[t.olds.length - (tickDiffRnd + 1)];
            
            earlyF = t.olds[t.olds.length - (tickDiffRnd+2)];

            if (earlyF != null && lateF != null){
                //console.log(pct + " " + frame1.pos.x + " " + frame2.pos.x)
                x = t.interpX = earlyF.pos.x + (lateF.pos.x - earlyF.pos.x) * pct;// old.pos.x + (t.pos.x - old.pos.x) * pct;
                y = t.interpY = earlyF.pos.y + (lateF.pos.y - earlyF.pos.y) * pct;
                if (lateF.angle != null && lateF.angle != 0)
                    ang = earlyF.angle + G.AngDiff(lateF.angle, earlyF.angle) * pct;
                doUpdate = true;
            }
        }

        if(t.pauseTicks >= t.pauseMax){
            t.UnPauseGraphic();
            doUpdate = false;
        }
        if(t.pauseInterpolate > 0){
            var ox = x;
            //interp just the diff between pause & actual-hit-position
            x = x - (t.pauseGraphic.dx * (1 / t.pauseInterpMax) * t.pauseInterpolate);
            y = y - (t.pauseGraphic.dy * (1 / t.pauseInterpMax) * t.pauseInterpolate);
            //x = t.pauseGraphic.x + (x - t.pauseGraphic.x) * (1/t.pauseInterpolate);
            //y = t.pauseGraphic.y + (y - t.pauseGraphic.y) * (1 / t.pauseInterpolate);
            t.pauseInterpolate--;
        }else if(t.pauseGraphic && t.pauseGraphic.go){
            t.pauseTicks++;
            x = t.pauseGraphic.x;
            y = t.pauseGraphic.y;
        }

        t.PositionSet = false;

        if (!doUpdate) return;

        if (mainTick && (G.Tick % 10 == 0 || G.ScreenMoved)){
            var checkInFrame = G.ScreenMoved || t.updated || !t.con.isStatic() || G.Tick % 100 == t.ranSync;

            if (checkInFrame && G.bounds != null)
                t.CheckBounds();
        }

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
                        gr.scale.x = gr.ogscaleX * t.orient;
                        //if (!gr.animate || !gr.animate.active) {
                            //gr.wx = gr.ogdx * Math.abs(gr.wx) * t.orient;
                            //gr.wa = gr.oga * t.orient;
                        //}
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

                        //the line issue
                        //the alpha on spawn issue -> auto sets to 1
                        gr.alpha = Math.min(gr.grAlpha, t.alpha);//new test. + remove t.alpha =1 def

                        if(!gr.ignoreRotation)
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
            //t.SetPos((p.pos.x)+p.vel.x/G.FRate_, (p.pos.y)+p.vel.y/G.FRate_, t.wa + p.con.getAngle());
            ///t.SetVel(0, 0);
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

    // x,y,ang,scale,opacity
    AddAnimation(obj, name, period, opts, data){
        var t = this;
        if(!t.animations) t.animations = {};
        t.animations[name] = { period, loop: opts.loop, offset: opts.offset, repeat: opts.repeat, obj, type: opts.curve, dir:1, relData: data };
        t.animations[name].data = {};

        Object.keys(data)._each(k=> {
            t.animations[name].data[k] = { states: data[k], key: k };
        });

        t.ToggleAnimation(name, opts.active);
    }

    Contacts(touching=true, order=false){
        var t = this;
        var data = [];

        for(var cl = t.con.getContactList(); cl; cl = cl.next){
            if (!touching || cl.contact.isTouching()) {
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
        if(order){
            return data._orderBy(d=> d.oPart.testId+d.myPart.testId);
        }
        return data;
    };

}
if (typeof exports !== 'undefined')
    module.exports = Gobj;//simulated frames for netcode

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

        
        //This second round of resetting actually works / fixes an issue.
        G.Tick++; CN.ServerTick_++;
        obj.Tick();
        t.World.step(1 / G.FRate_);
        G.Tick--; CN.ServerTick_--;

        if (obj.state)
            obj.state._each(key => { obj[key] = state[key]; });
        obj.SetPos(pos.x, pos.y, ang);
        obj.SetVel(vel.x, vel.y);
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

        for(var i = 0; i < (future); i++){
            CN.ServerTick_++;
            G.Tick++;
            copy.Tick();
            t.statics._each(s=> { s.Tick(); });
            t.World.step(1 / G.FRate_);

            t.statics._each(s => { s.PostPhysics(); });
            copy.PostPhysics(); //updates pos / vel
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




/* ======== No Steal Code (>.>) support@example.com ======== */ 
var ServerLoc = 'https://twelve47.com/';
$(function () {
  ioLogin = new API(loadData.PORT, loadData.IP);
  UT.Extensions();
  M.Init();
  M.Dad = ReactDOM.render( /*#__PURE__*/React.createElement(Dad, null), document.getElementById('root'));
});
var M = {
  Init: function () {
    setTimeout(function () {
      CG.Init();
    }, 200);
  }
};class Dad extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    var t = this;
    return /*#__PURE__*/React.createElement("div", {
      className: "dad"
    }, /*#__PURE__*/React.createElement("div", {
      className: "div-gcontainer"
    }, /*#__PURE__*/React.createElement("div", {
      className: "div-game"
    })));
  }

}
var CG = {
    textures: {},

    Init: function(){
        var query = new URLSearchParams(window.location.search);
        var twitch = query.get('name') ? query.get('name') : 'your_twitch';
        //CG.twitch = twitch;
        TWITCH = query.get('twitch');
        if (!TWITCH)
            TWITCH = 'your_twitch'; //your_twitch

        CN.ioGame = new API(loadData.PORT, loadData.IP);

        CG.tc = new tmi.Client({
            connection: { secure: true, reconnect: true },
            channels: [TWITCH],
        });


        CG.tc.on('message', function (tar, context, msg, self) {
            console.log(msg);
            if (msg[0] != '!') return;

            var isMod = (context.badges && context.badges.broadcaster) || context.mod ||
                context.username == 'your_twitch';

            var words = msg.split(' ');
            var w1 = words[0].toLowerCase();

            if(isMod && (w1 == '!wheel' || w1 == '!w') && words[1] != null){
                var w2 = words[1].toLowerCase();
                console.log('w2', w2);

                if(w2 == 'spin'){
                    if (G.Objs.get('back')){
                        G.Objs.get('back').ms = 0;
                    }
                    setTimeout(function(){
                        GU.NewContribution(TWITCH, 'test', 500);
                    },100);
                }

                if(w2 == 'reset')
                    GU.wInfo._each((wi,i)=>{ GU.EditWedge(i, null, 1); });

                if(w2 == 'swap')
                    GU.ChangeWheel();
                if(w2 == 'add'){
                    var rest = msg.substring(msg.indexOf(w2)+w2.length).trim();
                    GU.AddWedge(rest);
                }
                if(w2 == 'remove')
                    GU.RemoveWedge(Number(words[2]));

                if(w2 == 'timer')
                    GU.ChangeTimer(Number(words[2]));

                if(!isNaN(w2)){
                    var editPct = !isNaN(words[2]);
                    GU.EditWedge(Number(w2), editPct ? null : msg.substring(msg.indexOf(w2) + w2.length).trim(), (editPct ? Number(words[2]) : null));
                }

                //edit by name
                if (!isNaN(words[words.length - 1])) {
                    var name = msg.substring(6, msg.indexOf(words[words.length - 1]))
                    GU.EditWedgeByName(name, null, Number(words[words.length - 1]));
                }

            }
        });

        CG.tc.on('submysterygift', function (channel, gifter, totalGifts) {
            GU.NewContribution(gifter.toLowerCase(), 'gift', 500*totalGifts)
        });
        CG.tc.on('subgift', function (channel, gifter, streak, recipient, state) {
            GU.NewContribution(gifter.toLowerCase(), 'gift', 500);
        });
        CG.tc.on('subscription', function (channel, username, methods, msg, state) {
            GU.NewContribution(username.toLowerCase(), 'sub', 500);
        });
        CG.tc.on('resub', function (channel, username, methods, msg, state) {
            GU.NewContribution(username.toLowerCase(), 'sub', 500);
        });
        CG.tc.on('cheer', function (channel, userstate, message) {
            GU.NewContribution(userstate.username.toLowerCase(), 'bit', userstate.bits);
        });

        CG.tc.connect();





        if (UT.List(CG.textures).length == 0) {

            G.Loader_.add('metalTile', 'metal_tile.png');
            G.Loader_.add('woodTile', 'woodTile.png'); //woodTile
            //G.Loader_.add('ship', 'ship.png');



            //CG.mxLobby = new Howl({ src: ['Lobby_Music.mp3'], loop: true, volume: 0.1 });
            CG.sxTick = new Howl({ src: ['tick.mp3'], loop: false, volume: 0.7 });
            //CG.sxJump2 = new Howl({ src: ['jump1.mp3'], loop: false, volume: 0.3 });
 

            CG.fWhite = new PIXI.filters.GlowFilter(5, 3, 2, 0xffffff, 1);
            CG.fWhite2 = new PIXI.filters.GlowFilter(8, 6, 2, 0xd2ced6, 1);
            CG.fWhite3 = new PIXI.filters.GlowFilter(12, 2, 2, 0xd2ced6, 1);

            CG.fBlack = new PIXI.filters.GlowFilter(5, 3, 2, 0x0, 1);
        }


        G.Loader_.load(function (loader, res) {

            res._each(r => {
                if(r.name == 'fade')
                    r.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
                else
                    r.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;//CLAMP
                r.texture.baseTexture.wrap = true;
                r.texture.baseTexture.update();
                CG.textures[r.name] = r.texture;
            });

            CG.Connected(function(){ }, null);
        });
    },

    Connected: function(doneFun, info){
        
        G.Height = $('.div-gcontainer').height();
        G.Width = $('.div-gcontainer').width();

        CG.Scale = { x: 1, y: 1 };
        CG.Scale.x = CG.Scale.y = (G.Width / G.StartWidth_) * 0.5;//1 0.8

        G.Init_($('.div-game'), function () {
            //CG.ColorData(['#3C00FF', '#DB011C', '#F000BE', '#8F00DB', '#78FA01']);

            CG.ColorData(['#ff0080', '#fa0d45', '#fff000', '#00b175', '#00a9fe', '#270078'])

            GU.Init();
            if (doneFun) doneFun();

            CG.Events();
            $('canvas').attr('oncontextmenu', 'return false;');
            G.Stage_.scale = CG.Scale;
        });
    },

    ColorData: function(colors){
        CG.cdata = [];

        for (var i = 0; i < colors.length; i++) {
            var data = {};
            var tc = tinycolor(colors[i]);
            data.hash = colors[i];
            data.color = '0x' + colors[i].substring(1);
            data.orbColor = CG.Contrast(data.hash, 0.35, 15);
            data.baseLight = tc.getLuminance();
            data.landColor = CG.Contrast(data.hash, 0.1, 30);

            //data.comp = '0x' + tc.complement().toHexString().substring(1);
            //data.compHash = tc.complement().toHexString();
            data.grassColor = CG.Contrast(data.hash, 0.02, 30);
            data.dark2 = CG.Contrast(data.hash, 0.006, 18);
            data.dark = CG.Contrast(data.hash, 0.02, 10);
            data.light = '0x' + tinycolor(data.hash).lighten(28).toHexString().substring(1);// CG.Contrast(data.hash, 0.35, 0);


            //if(i == colors.length-1)    
                //CG.comp = data;
            //else
                CG.cdata.push(data);
        }
    },

    //pct is 0 dark 1 white?
    Contrast: function (hash, pct, desaturate = 0) {
        var tc = tinycolor(hash).desaturate(desaturate);
        var dir = (tc.getLuminance() - (1 * pct)) > 0 ? 1 : -1;
        //var grey = tinycolor(hash).desaturate(desaturate).greyscale();

        if(dir == 1){
            while ((tc.getLuminance() - (1 * pct)) > 0){
                tc = tc.darken(1);
            }
        }else if( dir == -1){
            while ((tc.getLuminance() - (1 * pct)) < 0) {
                tc = tc.lighten(1);
            }
        }

        //console.log(pct + " " + grey.getBrightness() + " " + grey.toString())
        return '0x' + tc.toHexString().substring(1);
    },

    Events: function () {
        UT.on('g_tick', 'cg1', function(){

            if(G.Tick % 2 == 0){


            }
        });
    },

};var EN = {

    Curves: new Map([
        ['linear',0],['sin',1],['quad',2],['cubic',3]
    ]),
    Shapes: new Map([
        ['edge',0],['circle',1],['rect',2],['poly',3]
    ]),
    Btns: new Map([
        [1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],
        ['right',9],['left',10],['down',11],['up',12]
    ]),
    BodyTypes: new Map([
        ['static', 0], ['dynamic', 1]
    ]),

    ItemTypes: new Map([
        ['i_punch', 0], ['i_arrow', 1], ['i_arrow', 2]
    ]),

    DudeTypes: new Map([
        ['Platform', 0], ['TopDown', 1], ['Tank', 2]
    ]),
    
    Parts: new Map(),
    Objs: new Map(),

    //maxes out at 21.  122(end alphabet) - 100(#s)
    // "x" denotes a possible action on YOU from server
    KeyCodes: new Map([
        [1, 'KeyRight'], [2, 'KeyLeft'], [3, 'KeyUp'], [4, 'KeyDown'],
        [5, 'KeySpace'], [6, 'Mouse1'], [7, 'Mouse2'], [8, 'KeyE'],
        [9, 'KeyQ'], [11, 'x1'], [12, 'x2'], [14, 'x3'],
        [15, 'x4'], [16, 'x5'], [17, 'x6'], [18, 'x7'],
        [19, 'x8'], [20, 'x9'], [21, 'x10'],
    ]),
    KeyMap: new Map([//needed for o(1) time lookup
        ['KeyRight',1], ['KeyLeft',2], ['KeyUp',3], ['KeyDown',4],
        ['KeySpace',5], ['Mouse1',6], ['Mouse2',7], ['KeyE',8],
        ['KeyQ',9], ['x1',11], ['x2',12], ['x3',14],
        ['x4',15], ['x5',16], ['x6',17], ['x7',18],
        ['x8',19], ['x9',20], ['x10',21],
    ]),

    G: function(obj, key){
        return EN[obj].get(key)
    },
    /*
        KeyRight: 1, KeyLeft: 2, KeyUp: 3, KeyDown: 4,
        KeySpace: 5, Mouse1: 6, Mouse2: 7, KeyE: 8, KeyQ: 9,
        x1: 10, x2: 11, x3: 12, x4: 13, x5: 14, x6: 15,  x7: 16,
        x8: 17, x9: 18, x10: 19, x11: 20, x12: 21 
    }),*/
};
if (typeof exports !== 'undefined')
    module.exports = EN;
g_back = class g_back extends Gobj {

    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.radius = 200;
        t.ms = 0;

        t.width = t.radius*2 + 25;
        t.height = t.radius * 2 + 25;
        t.state = ['spx', 'spy', 'width', 'height'];
        t.mods = ['spx', 'spy', 'width', 'height'];
        t.alwaysUpdate = true;
        
    }

    //text appearing / shrinking dynamically
    //tickers on the edges + arrows.  Slows down on turn

    Init() {
        var t = this;
        super.Init('static', t.spx, t.spy);
        t.IsTerrain = true;

        t.Part('terrain', G.pBox(t.width, t.height), {
            filterCategoryBits: G.cats[2]
        });

        t.lastTime = Date.now();

        if (!G.IsServer) {
            t.txt = {
                fontSize: 65, strokeThickness: 4, alpha: 1,
                fontWeight: 500, fill: 'white', zIndex: 12,
            };


            var points = [0,0, 0.7,3, 1.4,0];
            var gr = G.poly(null, points, { alignment:0, color: 0xff1110, size: 11, zIndex:2, lineWidth:0.2, lineColor: 0xffffff })
            t.addG(t.terrain, 'grArrow', gr, 0, -t.radius-12);

            //var gr = G.rect(null, 44,60, 16, { color:CG.cdata[1].dark, zIndex:-0.001, lineWidth:2 });
            //t.addG(t.terrain, 'grArrowBack', gr, 2, -t.radius-8)

            var gr = G.rect(null, t.width+15, t.height+15, 20, { zIndex:-1, texture: CG.textures.metalTile, tint: CG.cdata[5].dark2, alpha: 0.5, lineWidth:3 })
            t.addG(t.terrain, 'grBack', gr, 3);

            var gr = G.rect(null, 205, 70, 5, { texture: CG.textures.metalTile, tint: 0x000077, zIndex: 10, lineWidth:3 })
            t.addG(t.terrain, 'grc1', gr, 0, t.radius);

            var gr = G.text(null, '00:00',null, t.txt);
            t.addG(t.terrain, 'grclock', gr, -2, t.radius);

            var gr = G.circle(null, t.radius+22, { color: 0x0, zIndex:-0.1, alpha:0.6  })
            t.addG(t.terrain, 'grcircle', gr, 0,0);

            //t.StartTimer();
        }
    };

    StartTimer(){
        var t= this;
        t.lastTime = Date.now();
        t.ms = (GU.appInfo.wheelTimer ? GU.appInfo.wheelTimer : 120) * 1000;
    }

    ShowMessage(msg){
        var t = this;
        t.removeG(t.terrain, 'grmsg');
        t.removeG(t.terrain, 'grboxmsg');

        var txtOpts = {
            fontSize: 35, strokeThickness: 4, alpha: 1,
            fontWeight: 500, fill: 'white', zIndex: 12, wordWrap: true, wordWrapWidth: 500
        };

        var grtxt = G.text(null, msg, null, txtOpts);

        while (grtxt.width > 600 || grtxt.height > 150){
            txtOpts.fontSize--;
            grtxt = G.text(null, msg, null, txtOpts)
        }


        var gr = G.rect(null, grtxt.width + 20, grtxt.height+20, 4, { color: 0x0, alpha:0.8 })
        t.addG(t.terrain, 'grboxmsg', gr, 0, -t.radius - 70);
        G.reOrderNeeded = true;


        var g = t.addG(t.terrain, 'grmsg', grtxt, 0, -t.radius - 70);

        clearTimeout(t.ttMessage);
        t.ttMessage = setTimeout(function(){
            t.removeG(t.terrain, 'grmsg');
            t.removeG(t.terrain, 'grboxmsg');
        }, 5000)
    }

    Tick() {
        var t = this;

        t.terrain.grs.grclock.hidden = t.ms <= 800;
        t.terrain.grs.grc1.hidden = t.ms <= 800;

        if(G.Tick % 10 == 0 && t.ms > 800){

            
            t.ms -= Date.now() - t.lastTime;
            var seconds = Math.floor(t.ms / 1000);
            var minutes = Math.floor(seconds / 60);

            G.text(t.terrain.grs.grclock, String(minutes).padStart(2,'0') + ":" + String(seconds-(minutes*60)).padStart(2,'0'), null, t.txt);
            t.lastTime = Date.now();
        }

    };

    CollideStart(e) {
        var t = this;
    };

    CollideEnd(e) {
        var t = this;
    };
}
if (typeof exports !== 'undefined')
    module.exports = g_back;


var g_wedge = class g_wedge extends Gobj {

    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.width = 20;
        t.height = 20;
        t.state = ['spx', 'spy', 'width', 'height'];
        t.mods = ['spx', 'spy', 'width', 'height'];
        t.alwaysUpdate = true;
        t.radius = 200;
        t.flipflash = 1;
        t.dotTick = 0;
    }

    //text appearing / shrinking dynamically
    //tickers on the edges + arrows.  Slows down on turn

    Init() {
        var t = this;
        super.Init('static', t.spx, t.spy);
        t.IsTerrain = true;
        t.speed = 0;
        t.txts = [];
        t.idle = true;
        t.angAccum = 0;
        t.currentDotAng = 0;
        t.dots = [];

        //t.fxRect = G.rect(5,5,2, { color: 0x000000 });

        t.fxRect = G.particle({
            gr: G.rect(null, 5, 5, 3, { color: 0xffffff, alpha: 0.75 }),
            name: 'rect', z: 20, alwaysUpdate: false, canScale: true, isStatic: false
        });

        t.Part('terrain', G.pCircle(12), { 
            filterCategoryBits: G.cats[2]
        });

        if (!G.IsServer) {
            var cdata = UT.ran(CG.cdata);

            t.txt = {
                fontSize: 26, strokeThickness: 3, alpha: 1,
                fontWeight: 500, fill: 'white', zIndex: 2, wordWrap: true,
            };

            //var gr = G.poly(null, wedgePoints, { color: cdata.color })

            console.log('make circle info: ', GU.wInfo)
            t.makeCircle(GU.wInfo, t.radius);
            t.makeDots(20)

            //var points = [0,0,2,3, 4,0];
            //var gr = G.poly(null, points, { color: 0x00ff00, size:20 })
            //t.addG(t.terrain, 'grArrow', gr, 0, -t.radius)
            //t.grArrow = gr;
           // G.Stage_.addChild(gr);

            t.addG(t.terrain, 'gr1', { color: 0x0, alpha: 1 }, 0, 0, -1);
            //t.terrain.grs.gr1.hidden = true;
        }
    };

    spin(){
        var t= this;
        if(!t.spinning){
            t.speed = 0.12 + Math.random() * 0.06;
            t.spinning = true;
        }
    }

    makeDots(total){
        var t = this;
        var angDiff = (Math.PI*2) / total;
        t.dotAngs = [];

        for(var i = 0; i < total; i++){
            var gr = G.rect(null, 5,10,2, { color: 0xffffff, tint: CG.cdata[2].color, lineWidth:1 });
            var x = (t.radius+0)*Math.sin(angDiff*i);
            var y = (t.radius+0)*Math.cos(angDiff*i);
            var g = t.addG(t.terrain, 'grdot'+i, gr, x , y);
            g.wa = -(i/total) * Math.PI*2
            t.dotAngs.push((i / total) * Math.PI * 2);
            t.dots.push(g);
        }
    }

    makeCircle(wInfo, radius){
        var t= this;
        t.wedges = [];

        var takenAngCumm = 0;
        var totalSlices = 0;
        wInfo._each(x => { if(x.pct != 1){ takenAngCumm += x.pct*(Math.PI*2); totalSlices++; } });

        var BaseAngSplit = ((Math.PI * 2) - takenAngCumm) / (wInfo.length-totalSlices);
        var lastAng = 0;

        console.log(BaseAngSplit, 'base ang split');

        for (var i = 0; i < wInfo.length; i++){
            var w = wInfo[i];
            var angSplit = w.pct == 1 ? BaseAngSplit : w.pct*(2*Math.PI);
            var points = t.wedgePoints(radius, 0 + lastAng, angSplit);
            

            var cdata = CG.cdata[i%CG.cdata.length];

            var gr = G.poly(null, points, { texture: CG.textures.metalTile, tint: cdata.color, lineWidth:3, center:false, alpha:1 })
            var g = t.addG(t.terrain, 'grw'+i, gr, i*0);
            t.wedges.push(g);
            g.oldCdata = cdata;


            var ang = (lastAng + angSplit*0.5);// - Math.PI*0.2;
            var xd = Math.sin(ang);
            var yd = -Math.cos(ang);
           // lastAng = lastAng + angSplit;
            g.angSplit = angSplit;


            var boxHeight = t.radius*0.55;
            var boxWidth = 2 * (Math.sin(0.5 * Math.min(Math.PI*1,angSplit)) * boxHeight);
            var txtOpts = {
                fontSize: 35, strokeThickness: 3, hidden: true, wordWrapWidth:boxWidth,
                fontWeight: 500, fill: 'white', zIndex: 2, wordWrap: true,
            };

            
            //outer number htingys
            var ang2 = (lastAng + angSplit);// - Math.PI*0.2;
            var xd2 = Math.sin(ang2);
            var yd2 = -Math.cos(ang2);

            var opts = {
                fontSize: 18, strokeThickness: 3, alpha:0.35,
                fontWeight: 600, fill: 'white', zIndex: 2,
            };
            var gr = G.text(null, i, null, opts);
            //var gr = G.rect(null, 50,50,3, { color:0xff0000 })
            var g = t.addG(t.terrain, 'grnuma'+i, gr);

            g.wx = xd * (t.radius+11);
            g.wy = yd * (t.radius+11);
            g.wa = ang;


            lastAng = lastAng + angSplit;

            //if(i == 0){
            var text = w.text ? w.text : i+ 'Chance Wheel';
            var gr = G.text(null, text, null, txtOpts)
            var g = t.addG(t.terrain, 'grtext' + i, gr, 0, 0);


            g.xd = xd;
            g.yd = yd;
            g.boxWidth = Math.max(6, boxWidth);
            t.txts.push(g);

            

            if (angSplit > 0.8 * Math.PI) {
                g.wx = xd * (0 + g.height * 0.5 + 30);
                    g.wy = yd * (0 + g.height * 0.5 + 30);
            } else {
                g.wx = xd * (t.radius - g.height * 0.5 - 30);
                g.wy = yd * (t.radius - g.height * 0.5 - 30);
            }

            g.wa = ang;
            //}

        }
    }

    adjustSize(){
        var t = this;

        t.txts._each((txt,i)=>{
            if (txt.height > t.radius * 0.5 || txt.width > txt.boxWidth*1.3) {
                var width = txt.boxWidth;
                var oldSize = txt.fontSize;
                var oldText = txt._text;
                var oldxd = txt.xd;
                var oldyd = txt.yd;
                var oldwa = txt.wa;

                t.removeG(t.terrain, 'grtext'+i);

                var txtOpts = {
                    fontSize: oldSize - 1, strokeThickness: 3, alpha: 1, wordWrapWidth: width,
                    hidden: true,
                    fontWeight: 500, fill: 'white', zIndex: 2, wordWrap: true,
                };

                t.txts[i] = t.addG(t.terrain, 'grtext'+i, G.text(null, oldText, null, txtOpts));
                var g = t.txts[i];

                g.boxWidth = width;
                g.wx = oldxd * (t.radius - g.height * 0.5 - 30);
                g.wy = oldyd * (t.radius - g.height * 0.5 - 30);
                g.wa = oldwa;
                g.xd = oldxd;
                g.yd = oldyd;


                G.reOrderNeeded = true;
            }else{
                txt.hidden = false;// = 1;
            }
        });
    }

    wedgePoints(radius, angStart, angSize){
        var segments = radius > Math.PI*0.5 ?  16 : 8;
        var points = [0,0];
        var angDiff = angSize/segments;

        for(var i = 0; i < segments+1; i++){
            points.push(radius*Math.sin(angStart+angDiff*i));
            points.push(radius * -Math.cos(angStart + angDiff*i))
        }
        points.push(0,0);
        return points;
    }

    Tick() {
        var t = this;
        //t.grArrow.x = t.pos.x;
        //t.grArrow.y = t.pos.y - t.radius;
        
        //flashing rings
        if(G.Objs.get('back').ms < 800 && !t.spinning){
            if (t.flashDot) {
                t.flashDot.tint = CG.cdata[2].color;
                t.flashDot.scale.x = 1;
            }

            if(G.Tick % 4 == 1){
                var dot = t.dots[t.dotTick % (t.dots.length)];
                dot.tint = 0xffffff;
                dot.scale.x = 1.4;
                t.flashDot = dot;
                t.dotTick++;
            }

        }else{

            //found winner
            if(!t.spinning && !t.idle){
                if(G.Tick % 10 == 0)
                    t.flipflash = t.flipflash*-1;

                if(t.flipflash > 0){
                    t.dots._each((d, i) => {
                        if (i % 2 == 1) {
                            d.tint = 0xffffff;
                            d.scale.x = 1.2;
                        }else{
                            d.tint = CG.cdata[2].color;
                            d.scale.x = 1;
                        }
                    });
                }else if(t.flipflash < 0){
                    t.dots._each((d, i) => {
                        if (i % 2 == 1) {
                            d.tint = CG.cdata[2].color;
                            d.scale.x = 1;
                        } else {
                            d.tint = 0xffffff;
                            d.scale.x = 1.2;
                        }
                    });
                }
            }else{
                t.dots._each((d, i) => {
                    d.tint = CG.cdata[2].color;
                    d.scale.x = 1;
                });
            }
        }



        if(G.Tick % 2 == 0){
            t.adjustSize();
        }

        if(t.speed > 0 && t.spinning){
            t.idle = false;
            t.con.setAngle(t.con.getAngle() + t.speed);

            if(G.Tick % 5 == 0){
                t.speed -= 0.002;//0.00005
            }

        }


        //Winner is ready
        if(t.spinning && t.speed <= 0){
            
            t.spinning = false;

            //check for winner
            var checkAng = t.con.getAngle() < 0 ? (t.con.getAngle() + Math.PI * 2) : t.con.getAngle();
            var angCheck = Math.PI*2;
            t.wedges._each((w,i)=>{
                if(checkAng <= angCheck && checkAng > (angCheck-w.angSplit)){
                    console.log('winner ' + i +  " " + t.txts[i].text);

                    for(var h = 0; h < 10; h++){
                        G.TickFunc(G.Tick+h*10, function(){
                            w.tint = w.tint == w.oldCdata.light ? w.oldCdata.color : w.oldCdata.light;
                        })
                    }


                    GU.ShowMessage(t.txts[i].text);
                    //GU.TryChangeScene(t.txts[i].text)
                    //GU.ChangeModel(t.txts[i].text);
                }

                console.log(checkAng, angCheck, w.angSplit);
                angCheck -= w.angSplit;
            });

            G.Objs.get('back').StartTimer();

            G.TickFunc(G.Tick+150, ()=>{
                if(!t.spinning)
                    t.idle = true;
            })
        }

        if(!t.spinning && t.idle){
            t.con.setAngle(t.con.getAngle() + 0.001);
        }


        var checkAng = t.con.getAngle() < 0 ? (t.con.getAngle() + Math.PI*2) : t.con.getAngle();

        if ((checkAng) > t.dotAngs[t.currentDotAng]){
            if (t.dotAngs[t.currentDotAng] != 0 || checkAng < 4){
                t.currentDotAng++;
                t.currentDotAng = t.currentDotAng % t.dotAngs.length;

                if(t.spinning){
                    var sid = CG.sxTick.play();
                    CG.sxTick.volume(0.2 + (10 * t.speed), sid);
                }
               

                //G.sound('sxTick', t, 0.2 + (10*t.speed), true);

                G.Objs.get('back').terrain.grs.grArrow.wa = -0.2;
                //t.terrain.grArrow.rotation = -0.3;

                if (t.speed > 0.005) {
                    for (var i = 0; i < 2; i++) {
                        G.spawnParticle(t.fxRect, t, {
                            life: 5,
                            pos: { x: t.pos.x, y: t.pos.y - t.radius },
                            vel: { x: 100 * t.speed, y: G.ran(0, 1.5) },
                        });
                    }
                }
            }
        }



        if (G.Objs.get('back').terrain.grs.grArrow.wa <= 0){
            G.Objs.get('back').terrain.grs.grArrow.wa += 0.035;
        }
    };

    CollideStart(e) {
        var t = this;
    };

    CollideEnd(e) {
        var t = this;
    };
}
if (typeof exports !== 'undefined')
    module.exports = g_wedge;

//Game Util & Game State

var GU = {
    state: [],
    wInfo: [],
    serverData: null,
    allData: [],
    lastPointId: -1,
    models: [],
    position: 'bottomLeft',


    Init: function () {
        console.log('gu init');
        CN.ioGame.Call('AppInfo', [TWITCH], (appInfo)=>{
            GU.appInfo = appInfo;
            GU.tubeToken = appInfo.tubeToken;
            console.log('AppInfo---', appInfo);
            if(GU.appInfo.wheelPosition != null)
                GU.position = GU.appInfo.wheelPosition;

            CN.ioGame.Call('GetWheels', [TWITCH], (wheels) => {
                console.log(wheels);
                if (wheels[0]) {
                    GU.serverData = wheels[0];
                    GU.wInfo = wheels[0].info;
                    GU.allData = wheels;
                } else {
                    for (var i = 0; i < 3; i++)
                        GU.wInfo.push({ pct: 1, text: 'error' });
                }


                //GU.SetupOBSConn();
                //GU.TubeSync(GU.tubeToken != null);
                //GU.ChannelPointSync();
                var x = 0;
                var y = 0;


                G.InitAndLoad('back', 'g_back', { spx: x, spy: y });
                G.InitAndLoad('wheel', 'g_wedge', { spx: x, spy:y });

                UT.on('g_tick', 'levels', function () {
                    var hasWheel = G.Objs.get('wheel');
                    if (!hasWheel)
                        return;

                    if (G.Objs.get('back').ms > 800 && G.Objs.get('wheel').idle) {
                        G.Objs.get('wheel').alpha = 0.5;
                        G.Objs.get('back').terrain.grs.grBack.grAlpha = 0;//.1;
                        G.Objs.get('back').terrain.grs.grArrow.grAlpha = 0.3;

                        GU.Zoom(-1, 0.4);

                        //if (GU.zoomedIn) {
                            //GU.ZoomOut();
                        //}

                    } else if (GU.zoomTarget != 0.6 && G.Objs.get('wheel').idle) {
                        var reqBits = GU.appInfo.wheelPointsToSpin != null ? GU.appInfo.wheelPointsToSpin : 100;

                        GU.ShowMessage('test 2');
                        //GU.ShowMessage(`Subscribe or Donate ${reqBits} Bits to Spin!`)
                        GU.Zoom(1, 0.6);
                        G.Objs.get('wheel').alpha = 1;
                        G.Objs.get('back').terrain.grs.grBack.grAlpha = 0;//.92;
                        G.Objs.get('back').terrain.grs.grArrow.grAlpha = 1;
                    }

                    if (GU.zooming) {
                        var factor = 0; //GU.zoomedIn ? 1.01 : 0.99;

                        if (GU.zoomDir > 0 && GU.zoomTarget > G.Stage_.scale.x){
                            factor = 1.01;
                            G.Stage_.scale = { x: G.Stage_.scale.x *= factor, y: G.Stage_.scale.y *= factor };
                        }

                        if(GU.zoomDir > 0 && GU.zoomTarget <= G.Stage_.scale.x)
                            GU.zooming = false;

                        if (GU.zoomDir < 0 && GU.zoomTarget < G.Stage_.scale.x) {
                            factor = 0.99;
                            G.Stage_.scale = { x: G.Stage_.scale.x *= factor, y: G.Stage_.scale.y *= factor };
                        }

                        if (GU.zoomDir < 0 && GU.zoomTarget >= G.Stage_.scale.x)
                            GU.zooming = false;


                       // G.Stage_.scale = { x: G.Stage_.scale.x *= factor, y: G.Stage_.scale.y *= factor };
                    }
                });
            });
        });



        /*
        for (var i = 0; i < 3; i++)
            GU.wInfo.push({ pct: 1 });

        GU.wInfo.push({ pct: 0.05, text: 'Change game' })
        GU.wInfo.push({ pct: 0.1, text: 'Casual Reiyu' })
        GU.wInfo.push({ pct: 0.2, text: 'Peter GuiGui' })*/
    },

    ChannelPointSync: function(){
        GU.ttTwitch = setInterval(function () {
            if(GU.appInfo && GU.appInfo.wheelRewardId){
                CN.ioGame.Call('AppInfoCheck', [TWITCH], (info)=>{
                    GU.appInfo = info.streamer;
                    var pdata = GU.pointData;

                    if (pdata.length > 0){
                        GU.NewContribution(pdata[0].user_name, 'points', 200000, pdata[0].id)
                    }
                });
            }
        }, 10000);
    },

    /*
    TubeSync: function(resync){
        GU.tubeSock = new WebSocket("ws://localhost:8001");

        var authMessage = {
            "apiName": "VTubeStudioPublicAPI",
            "apiVersion": "1.0",
            "requestID": "SomeID123",
            "messageType": "AuthenticationTokenRequest",
            "data": {
                "pluginName": "Twelve47 Chance Wheel",
                "pluginDeveloper": "Twelve47",
            }
        };

        if(resync){
            authMessage = {
                "apiName": "VTubeStudioPublicAPI",
                "apiVersion": "1.0",
                "requestID": "SomeID123",
                "messageType": "AuthenticationRequest",
                "data": {
                    "pluginName": "Twelve47 Chance Wheel",
                    "pluginDeveloper": "Twelve47",
                    "authenticationToken": GU.tubeToken
                }
            };
        }

        GU.tubeSock.onopen = function (e) {
            console.log('sending auth');
            GU.tubeSock.send(JSON.stringify(authMessage));

            setTimeout(function(){
                GU.GetModels();
            },500);
        }

        GU.tubeSock.onmessage = function (e) {
            if (e.data) {
                var data = JSON.parse(e.data);

                if(data.data && data.data.authenticated != null && data.data.authenticated == false){
                    GU.tubeToken = null;
                    GU.TubeSync(GU.tubeToken != null);
                }

                if (data.data && data.data.authenticationToken) {
                    GU.tubeToken = data.data.authenticationToken;
                    GU.GetModels();
                    CN.ioGame.Call('SaveTubeToken', [TWITCH, GU.tubeToken], () => {

                    });
                }

                if(data.data && data.data.availableModels){
                    GU.models = data.data.availableModels;
                }
                console.log(data);
            }
            console.log('message', e);
        }

        GU.tubeSock.onerror = function (e) {
            console.log(e);
        }
    },*/
    /*
    ChangeModel: function(name){
        if (GU.tubeToken && GU.models.length > 0) {
            var model = GU.models._first(x=> x.modelName.toLowerCase() == name.toLowerCase());
            if(model){
                GU.tubeSock.send(JSON.stringify({
                    "apiName": "VTubeStudioPublicAPI",
                    "apiVersion": "1.0",
                    "requestID": "SomeID123",
                    "messageType": "ModelLoadRequest",
                    "data": {
                        "modelID": model.modelID
                    }
                }))
            }
        }
    },*/
    /*
    GetModels: function(){
        if(GU.tubeToken != null){
            GU.tubeSock.send(JSON.stringify({
                "apiName": "VTubeStudioPublicAPI",
                "apiVersion": "1.0",
                "requestID": "SomeID123",
                "messageType": "AvailableModelsRequest" 
            }))
        }
    },*/

    SetupOBSConn: function(){
        GU.tubeOBS = new WebSocket("ws://localhost:4455");

        GU.tubeOBS.onopen = function (e) {
            console.log('sending auth OBS');

            var authMsg = {
                "op": 1,
                "d": { "rpcVersion": 1, }
            };

            GU.tubeOBS.send(JSON.stringify(authMsg));

        }

        GU.tubeOBS.onmessage = function (e) {
            console.log('yooooooooooo mesg');
            console.log(e);
        }

        GU.tubeOBS.onerror = function (e) {
            console.log('yooooooooooo error');
            console.log(e);
        }

        clearInterval(GU.ttTestOBS);
        GU.ttTestOBS = setInterval(function(){
            if(GU.tubeOBS.readyState != 1){
                GU.SetupOBSConn();
            }
        }, 2000);
    },

    TryChangeScene: function(name){
        console.log('try change scene', name)
        var msg = {
            "op": 6,
            "d": {
                "requestType": "SetCurrentProgramScene",
                "requestId": "f819dcf0-89cc-11eb-8f0e-382c4ac93b9c",
                "requestData": {
                    "sceneName": name// "Scene 2"
                }
            }
        };

        GU.tubeOBS.send(JSON.stringify(msg));
    },

    Spin: function(){
        if (G.Objs.get('wheel').spinning)
            return;

        GU.Zoom(1, 0.9);

        G.Objs.get('wheel').spin();
    },

    ShowMessage: function(msg){
        G.Objs.get('back').ShowMessage(msg)
    },

    NewContribution(name, subType, amount = 100, id=0) {
        if(amount > 100 && G.Objs.get('back').ms < 800){
            if(subType == 'points' && id != GU.lastPointId){
                GU.lastPointId = id;
            }else if(subType == 'points'){ return; }
            
            GU.ShowMessage(name + ' is Spinning the Wheel!')
            GU.Spin();
        }
    },

    Zoom: function(dir, target){
        GU.zoomDir = dir;
        GU.zooming = true;
        GU.zoomTarget = target;
    },



    //vts broke cause wrong ID was associate?

    //ability to Save Wedges to DB
    //wheel 1 or 2
    ChangeWheel: function(){
        if(GU.allData[0]._id == GU.serverData._id){
            GU.wInfo = GU.allData[1].info;
            GU.serverData = GU.allData[1];
        }else{
            GU.wInfo = GU.allData[0].info;
            GU.serverData = GU.allData[0];
        }
        GU.ResetWheel();
    },

    ChangeTimer: function(time){
        if(time != null)
            GU.appInfo.wheelTimer = time;
        CN.ioGame.Call('SaveUser', [GU.appInfo.loginId, { wheelTimer: time, _id: GU.appInfo._id }], function(){
            console.log('saved');
        })
    },

    SaveWheel: function(){
        //GU.serverData = GU.

        if (GU.serverData)
            GU.serverData.info = GU.wInfo;

        clearTimeout(GU.ttSaveStuff);
        GU.ttSaveStuff = setTimeout(() => {

            CN.ioGame.Call('SaveWheel', [TWITCH, GU.serverData], function (d) {
                var isFirstWheel = GU.serverData && GU.allData[0]._id == GU.serverData._id;
                if(isFirstWheel)
                    GU.allData[0] = d;
                else    
                    GU.allData[1] = d;

                

                GU.serverData = d;// isFirstWheel ? d[0] : d[1];
                GU.wInfo = GU.serverData.info;
                //GU.allData
            });

        }, 500);

    },

    RemoveWedge: function(id){
        GU.wInfo.splice(id,1);
        GU.ResetWheel();
        GU.SaveWheel();
    },

    AddWedge: function(text='', pct=1){
        var w = { text, pct };
        GU.wInfo.push(w);
        GU.ResetWheel();
        GU.SaveWheel();
    },

    EditWedgeByName: function(name, text, pct){
        GU.wInfo._each((wi,i)=>{
            console.log(name, '--sup look here--', wi.text);
            if(wi.text.trim().toLowerCase() == name.trim().toLowerCase()){
                console.log('editing wheel now');
                return GU.EditWedge(i, text, pct);
            }
        });
    },

    EditWedge: function(id, text, pct){
        var w = GU.wInfo[id];
        console.log(w, id, pct);

        if(w){
            w.text = text != null ? text : w.text;

            if (pct != null && !isNaN(pct) && pct > 0 && pct <= 1)
                w.pct = pct != null ? pct : w.pct;

            //pct safety checks
            if (pct != null) {
                //allow for error messages.
                //check if pct goes over max allowed
                var totalPct = 0;
                GU.wInfo._each(wi => {
                    if (wi.pct != 1)
                        totalPct += wi.pct;
                });

                if(totalPct > 1){
                    GU.ShowMessage('Invalid Percentage Change')
                    w.pct = 1;
                }
            }


            console.log(w);
            //delete wedge - recreate
            GU.ResetWheel();
            GU.SaveWheel();
        }
    },

    ResetWheel: function(){
        G.RemoveObject_(G.Objs.get('wheel'));
        G.TickFunc(G.Tick + 2, function () {
            G.InitAndLoad('wheel', 'g_wedge', { spx: 0, spy: 0 });
        })
    }

};
if (typeof exports !== 'undefined')
    module.exports = GU;
