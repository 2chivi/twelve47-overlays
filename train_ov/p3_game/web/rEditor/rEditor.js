
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

        var txt = {
            fontSize: 15, strokeThickness: 4,
            fontWeight: 600, fill: 'white', zIndex: 15
        };

        UT.on('new_world', 'e1', function(){
            setTimeout(function () {
                t.PopulateDropDowns();
                t.forceUpdate();
            }, 5000);
        })
        UT.on('g_init', 'edit1', function(){
            setTimeout(function(){
                t.PopulateDropDowns();
                t.forceUpdate();
            },5000);
            

            if (!t.mark) {
                t.myLocation = G.circle(null, 10, { zIndex:20, lineWidth: 2, lineColor: 0xffffff });
                t.mark = G.circle(null, 5, { lineWidth: 2, lineColor: 0xffffff });
                G.Stage_.addChild(t.mark);
                G.Stage_.addChild(t.myLocation);
                var color = 0xffffff;
                var o = {x: -2000, y: -4000}

                if(t.showGrid){
                    for (var i = 0; i < 100; i++) {
                        var li = G.line(null, 50, -2000, 50, 2000, { color: color, lineWidth: 2, opacity: 0.05 });
                        G.Stage_.addChild(li);
                        t.grids.push(li);
                    }
                    for (var i = 0; i < 100; i++) {
                        var li = G.line(null, -2000, 50, 2000, 50, { color: color, lineWidth: 2, opacity: 0.05 });
                        G.Stage_.addChild(li);
                        t.grids.push(li);
                    }
                }
            }
        })

        $(window).on('mouseup', function (e) {
            if(t.createReady){
                var pnt = { x: Math.ceil(CG.mx / t.rd) * t.rd, y: Math.ceil(CG.my / t.rd) * t.rd };
                t.Create(pnt.x, pnt.y);
            }
            if (t.findReady) {
                var pnt = { x: Math.ceil(CG.mx / t.rd) * t.rd, y: Math.ceil(CG.my / t.rd) * t.rd };
                t.Find(pnt.x, pnt.y);
            }
            if (t.state.drawing && e.target.nodeName == 'CANVAS') {
                console.log(CG.mx + " " + CG.my);
                t.clicked = true;
                var pnt = { x: Math.ceil(CG.mx / t.rd) * t.rd, y: Math.ceil(CG.my / t.rd) * t.rd };
                t.Points.push(pnt);
                
                var line = G.line(null, pnt.x, pnt.y, pnt.x, pnt.y, { color: 0xff, lineWidth: 6, lineOpacity: 1 });
                G.Stage_.addChild(line);
                t.Lines.push(line);

                var ll = t.Points[t.Points.length - 1];
                if (ll) {
                    var tx = G.text(null, ((pnt.x - ll.x) / t.rd) + "," + ((pnt.y - ll.y) / t.rd), null, txt);
                    tx.x = pnt.x;
                    tx.y = pnt.y;
                    G.Stage_.addChild(tx);
                    t.Text.push(tx);
                }
                G.SortGraphics();

                if(pnt.x == t.Points[0].x && pnt.y == t.Points[0].y && t.Points.length > 1){
                    var ss = [];
                    t.Points._each(p => { ss.push(p.x); ss.push(p.y); })
                    console.log(ss);

                    //box
                    if(ss.length == 10 && (ss[0]==ss[2] || ss[1] == ss[3])){
                        var w = t.Points._max(p => p.x).x - t.Points._min(p=> p.x).x;
                        var h = t.Points._max(p => p.y).y - t.Points._min(p => p.y).y;
                        var spx = (t.Points._max(p => p.x).x + t.Points._min(p => p.x).x)/2;
                        var spy = (t.Points._max(p => p.y).y + t.Points._min(p => p.y).y) / 2;
                        console.log('G.InitAndLoad(null, "g_box", {width: ' + w + ', height: ' + h + '});')
                        eval('G.InitAndLoad(null, "g_box", {spx: '+spx+', spy: '+spy+', width: '+w+', height: '+h+'});');
                    }else{
                        console.log('G.InitAndLoad(null, "g_land", {pnts:[' + ss + ']});');
                        eval('G.InitAndLoad(null, "g_land", {pnts:[' + ss + ']});');
                    }
                    
                    setTimeout(function(){
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
            var pnt = { x: Math.ceil(CG.mx / t.rd) * t.rd, y: Math.ceil(CG.my / t.rd) * t.rd };

            for(var i = 0; i < t.grids.length; i++){
                var l = t.grids[i];
                if(i < 100){
                    l.x = -50*t.rd + pnt.x + i*t.rd;
                    l.y = pnt.y;
                }else{
                    l.y = -50 * t.rd + pnt.y + (i-100) * t.rd;
                    l.x = pnt.x;
                }
            }

            if (t.state.drawing) {
                var tx = t.Text[t.Text.length-1];
                var line = t.Lines[t.Lines.length - 1];
                var opnt = t.Points[t.Points.length - 1];
                if (line){
                    line = G.line(line, opnt.x, opnt.y, pnt.x, pnt.y, {  });
                    tx = G.text(tx, ((pnt.x - opnt.x) / t.rd) + "," + ((pnt.y - opnt.y) / t.rd), null, txt);
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
        var types = Object.keys(window)._where(x=> x.substring(0,2) == 'g_');
        t.refs.ddObjs.setState({ val: null, data: pobjs });
        t.refs.ddTypes.setState({ val:null, data: types });
        var temp = eval('new ' + types[0] + "('test')");
        t.typeVals = [];
        if(!t.typeProps){
            t.typeProps = temp.mods;
            temp.mods._each(m => { t.typeVals.push(temp[m] ? temp[m] : '') });
        }
    }

    PickedType(){
        var t = this;
        var type = t.refs.ddTypes.state.val;
        var temp = eval('new ' + type + "('test')");

        t.typeVals = [];
        t.typeProps = temp.mods;
        temp.mods._each(m => { t.typeVals.push(temp[m] ? temp[m] : '') });
        t.forceUpdate();
    }

    PickedObj(obj) {
        var t = this;
        t.forceUpdate();
        setTimeout(function(){
            if (t.obj) {
                t.myLocation.x = t.obj.pos.x;
                t.myLocation.y = t.obj.pos.y;
            }
        },500);
    }

    Zoom(dir) {
        G.Stage_.scale = { x: G.Stage_.scale.x *= dir, y: G.Stage_.scale.y *= dir };
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

        t.setState({ drawing: !t.state.drawing });
    }


    Mod(e,m) {
        var t = this;
        if(!isNaN(t.obj[m]))
            t.obj[m] = Number($(e.target).val());
        else
            t.obj[m] = $(e.target).val();
        t.forceUpdate();
        console.log($(e.target).val());
    }

    ModType(e) {
        var t = this;

        var m = Number($(e.target).attr('index'));

        if (isNaN($(e.target).val()))
            t.typeVals[m] = $(e.target).val();
        else
            t.typeVals[m] = Number($(e.target).val());
        t.forceUpdate();
        console.log($(e.target).val() + " " + m);
    }

    Reset(){
        var t = this;
        if(t.obj){
            var newString = t.Print(t.obj);
            G.RemoveObject_(t.obj);
            
            G.TickFunc(G.Tick+4, function(){
                t.nObj = eval(newString);
                setTimeout(function(){ 
                    t.PopulateDropDowns();
                    t.refs.ddObjs.setState({ val: t.nObj });
                    t.forceUpdate();
                },1000);
            })
        }
    }

    Delete(){
        var t = this;
        if (t.obj) {
            G.RemoveObject_(t.obj);
            G.TickFunc(G.Tick+1, function(){
                t.PopulateDropDowns();
                t.forceUpdate();
            })
        }
    }

    FindReady() {
        var t = this;
        t.findReady = true;
    }

    Find(x,y) {
        var t = this;
        t.findReady = false;
        var pobjs = G.Objs._where(x => x.mods != null);
        var obj = pobjs._min(obj => G.dist(obj.pos, {x,y}) );
        if(obj){
            t.refs.ddObjs.setState({ val: obj });
            t.forceUpdate();
            console.log(obj);
            t.PickedObj(obj);
        }
    }

    CreateReady(){
        var t = this;
        t.createReady = true;
    }

    Create(x,y){
        var t = this;
        var type = t.refs.ddTypes.state.val;
        var props = {};
        t.createReady = false;
        props.spx = x;
        props.spy = y;
        $('input[mtype]').each(function () {
            if ($(this).val().length > 0){
                
                if (isNaN($(this).val()))
                    props[$(this).attr('mtype')] = $(this).val();
                else
                    props[$(this).attr('mtype')] = Number($(this).val());
            }
        });

        var nobj = 'G.InitAndLoad(null, "' + type + '",' + JSON.stringify(props) + ')';
        console.log(nobj);
        t.nObj = eval(nobj);

        G.TickFunc(G.Tick + 1, function () {
            t.PopulateDropDowns();
            t.refs.ddObjs.setState({ val: t.nObj });
            t.forceUpdate();
        });
    }

    PrintLevel(){
        var s = "";
        var i = 0;
        G.Objs.forEach((ob,key)=> {
            if(ob.mods && !ob.delay && !ob.minWorld){
                var props = {};
                var creation = 'G.InitAndLoad'; //!ob.IsMover ? 'G.InitAndLoad' : 'GU.MovingObj';

                ob.mods._each(m => { props[m] = ob[m]; });
                if (ob.IsServerObj)
                    s += 'SN.SendNewObject(G.UID_(), "' + ob.type + '",' + JSON.stringify(props) + ') \n';
                else
                    s += creation + '("g' + i.toString().padStart(3,'0')+ '", "' + ob.type + '",' + JSON.stringify(props) + ') \n';
                i++;
            }
        });
        console.log(s);
    }

    Print(){
        var t = this;
        var props = {}
        t.obj.mods._each(m => { props[m] = t.obj[m]; });

        var test = 'G.InitAndLoad("'+t.obj.oid+'", "'+t.obj.type+'",' + JSON.stringify(props) + ')'; 
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
        
        if(t.obj){
            t.obj.mods._each(m => {
                inputs.push(
                    <div>
                        {m}: <input value={t.obj[m]} onChange={(e)=> { t.Mod(e,m); }} />
                    </div>
                );
            });
        }

        if(t.typeProps){
            for(var i = 0; i < t.typeProps.length; i++){
                var tp = t.typeProps[i];
                var v = t.typeVals[i];
                if (tp != 'spx' && tp != 'spy')
                    createInputs.push(<div> {tp}: <input mtype={tp} index={i} value={v} onChange={(e) => { t.ModType(e); }} /> </div>);
            }
        }

        return <div className='Editor'>
            <div class='btn' onClick={() => { t.Zoom(1.2) }}>Z-In</div>
            <div class='btn' onClick={() => { t.Zoom(0.8) }}>Z-Out</div>
            <div class='btn' onClick={() => { t.Draw(); }}>{drawName}</div>

            <div>
                <DD ref='ddTypes' valueType='name' nameType='name' 
                    onChange={() => { t.PickedType(); }} />
            </div>
            <div class='btn' onClick={() => { t.CreateReady() }}>Create</div>
            <div class='btn' onClick={() => { t.PrintLevel(); }}>Print</div>
            <div>
                {createInputs}
            </div>
            <div></div><div></div>
            

            <div>
                <DD ref='ddObjs' valueType='oid' nameType='oid'
                onChange={(v, e) => { t.PickedObj(v, true); }} />
            </div>
            
            <div class='btn' onClick={() => { t.Reset(); }}>Reset</div>
            <div class='btn' onClick={() => { t.Delete(); }}>Del</div>
            <div class='btn' onClick={() => { t.FindReady(); }}>Find</div>
            
            {inputs}
        </div>
    }
}