//Game Util & Game State

var GU = {

    colors: ['#0abab5', '#7a93ff', '#b569ff', '#ff7ad5', '#ff8668', '#ffcb6a', '#a7ff78'],
    treeHeight: 2,
    treeTime: 0, //0==fresh, 1==fall
    lastWater: Date.now()-(1*2*1000),
    watering: false,

    settings: { },

    Init: function () {

        setTimeout(function(){
            //G.InitLoad('guy1', 'g_guy', { spx: G.bounds.max.x - 200, spy: G.bounds.max.y - 200 });

            //make wind effect trees as well..  check paraellelness of branch
            //make wind behave as a wave.. it doesnt effect each flower at the same time.
            GU.wind = GU.lastWind = 0.02;
            GU.windyness = GU.lastWindy = 0.005;

            UT.on('g_tick', 'wind', function () {
                var ran = Math.random();
            
                if(G.Tick % 140 == 0){
                    GU.lastWindChange = G.Tick;
                    GU.lastWindy = GU.windyness;

                    var ran = Math.random();
                    if(ran > 0.5)
                        GU.windyness = 0.001;
                    else if( ran > 0.4)
                        GU.windyness = 0.005;
                    else
                        GU.windyness = 0.0035;
                }

                if(ran > 0.5){//95
                    GU.wind += GU.windyness*0.05;
                    GU.lastWind += GU.lastWindy*0.05;
                }


                GU.lastWind *= 0.98;
                GU.wind *= 0.98;

                var waterTime = GU.settings.gardenWaterTime * 60000;

                if ((Date.now() - GU.lastWater) > (waterTime)){
                    if(GU.treeTime == 0)
                        GU.FallTree(1);
                }

                if ((Date.now() - GU.lastWater) > (waterTime*2)) {
                    if (GU.treeTime == 1)
                        GU.FallTree(2);
                }
            });

            console.log('create tree');

            //bottom left
            if(GU.settings.gardenTreePosition == 'right')
                GU.CreateTree(G.bounds.max.x - 200, G.bounds.max.y + 55);//580+60
            else
                GU.CreateTree(G.bounds.min.x+200, G.bounds.max.y+55);//580+60

            console.log('create objects');

            var swidth = G.bounds.max.x - G.bounds.min.x;
            GU.items = GU.CreateClover(G.bounds.min.x, G.bounds.max.y - 5, swidth,  300);
            GU.items._each((it,index)=>{ it.rollout = Math.floor(Math.random()*3); });

            GU.items._each((it, ind) => {
                var id = G.UID_();

                if (it.rollout <= 0 && !it.made) {

                    it.made = true;

                    if (it.flowerType == 'clover')
                        GU.MakeClover(`clover${ind}${id}`, it.x);
                    if (it.flowerType == 'grass')
                        GU.MakeGrass(`grass${ind}${id}`, it.x);
                    if (it.flowerType == 'blue')
                        GU.MakeBlue(`blue${ind}${id}`, it.x);
                    if (it.flowerType == 'daisy')
                        GU.MakeDaisy(`daisy${ind}${id}`, it.x);
                    if (it.flowerType == 'delphy')
                        GU.MakeDelphy(`delphy${ind}${id}`, it.x);
                }
            })


            G.InitLoad(`background`, 'g_back', { spx: 0, spy:G.bounds.max.y });//588
            G.InitLoad(`can1`, 'g_can', { spx: 0, spy: G.bounds.max.y-150});//588

            //testing
            /*
            setInterval(function(){
                var users = ['fred_123', 'bob_456', 'batman12', 'someGuy_4', 'your_twitch', 'twelve47'];
                MAIN.Donation(UT.ran(users), 'bits', 2);
            },7000);*/


            setTimeout(function(){
                GUI.Init();
            },500)
            
        },1500)
    },

    FallTree: function(time){
        var apple = GU.treeTime == 0 && time == 0 && GU.treeHeight >= 5;
        GU.treeTime = time;
        //age each branch's leaves

        G.Objs._each(ob=>{
            if(ob.type == 'g_branch'){
                if(time != 2){
                    if(apple && !ob.showApple)
                        ob.Apple();
                    else if(!apple){
                        ob.FallLeaves(time);
                    }
                }
                else{
                    ob.KillLeaves();
                }
            }
        });
    },

    Water: function(name, action){
        var swidth = G.bounds.max.x - G.bounds.min.x;
        var totalParts = 20;
        var maxThings = 450;
        var pwidth = swidth / totalParts;
        var isFollow = action == 'New Follower';

        var part = Math.floor(Math.random() * totalParts);
        var emptyParts = [];
        GU.lastWater = Date.now();


        var can = G.Objs.get('can1');
        if(can)
            can.ChangeName(name + " " + action);


        GU.watering = true;
        setTimeout(function(){
            console.log('watering false');
            GU.watering = false;
        },6000);


        if(GU.items._where(it=> !it.made).length < 50){
            GU.items = GU.CreateClover(G.bounds.min.x, G.bounds.max.y - 5, swidth, 300);
            GU.items._each((it, index) => { it.rollout = Math.floor(Math.random() * 3); });
            console.log('new items made');
        }



        if (G.Objs.size > maxThings) {
            var amountToRemove = G.Objs.size - maxThings;
            var obs = G.Objs._where(x => x.type == 'g_clover')._orderBy(x => x.tickCreated);

            for (var i = 0; i < amountToRemove; i++) {
                //G.RemoveObject_(obs[i]);
                obs[i].Fade();
            }
        }

        //timeout for removals
        setTimeout(()=>{


            //if there is an area with nothing.. do that first
            for (var i = 0; i < totalParts; i++) {
                var total = G.Objs._where(x =>
                    x.type == 'g_clover' && (
                        x.pos.x > (G.bounds.min.x + i * pwidth) && x.pos.x < (G.bounds.min.x + i * pwidth + pwidth))).length;

                if (total < 7) {
                    console.log(i, total);
                    part = i;
                    emptyParts.push(i);
                }
            }


            if (emptyParts.length > 0)
                part = UT.ran(emptyParts);

            //testing
            //part = UT.ran([1,2,3]);

            G.Objs.get('can1').Pour(G.bounds.min.x + (part * pwidth));

            //timeout for Pour animation
            setTimeout(()=>{


                setTimeout(function(){

                    GU.FallTree(0);

                    if (GU.treeHeight <= 4) {
                        GU.treeHeight++;
                        if(GU.guy)
                            GU.guy.allowAging = true;
                    }
                },500)


                console.log('part: ', part);
                //grow each plant in that part

                var x1 = G.bounds.min.x + part * pwidth;
                var x2 = G.bounds.min.x + (part * pwidth) + pwidth;

                G.Objs._each(o => {
                    var scale = 1;

                    if(isFollow)
                        scale = 0.7;

                    if (o.type != 'g_clover')
                        return;

                    if (o.pos.x > x1 && o.pos.x < x2) {
                        var totalGrowth = o.targetAge < 1.3 ? 0.2 : 0.01;

                        o.growthSpeed = o.targetAge < 1.3 ? 1 : 0.5;
                        o.targetAge = o.targetAge + totalGrowth*scale;
                        //o.SetPos(o.pos.x, 500)
                    } else if (o.pos.x > (x1 - pwidth) && o.pos.x < (x2 + pwidth)) {
                        var totalGrowth = o.targetAge < 1.3 ? 0.1 : 0.01;
                        o.growthSpeed = o.targetAge < 1.3 ? 0.5 : 0.25;
                        o.targetAge = o.targetAge + totalGrowth * scale;;
                        // o.SetPos(o.pos.x, 550)
                    } else if (o.pos.x > (x1 - pwidth * 2) && o.pos.x < (x2 + pwidth * 2)) {
                        var totalGrowth = o.targetAge < 1.3 ? 0.05 : 0.005;
                        o.growthSpeed = o.targetAge < 1.3 ? 0.25 : 0.15;
                        o.targetAge = o.targetAge + totalGrowth * scale;;
                        // o.SetPos(o.pos.x, 550)
                    }
                });

                var maxRoll = GU.items._where(it => it.x > (x1) && it.x < (x2) && it.made)
                    ._max(x=> x.rollout);
                if(!maxRoll)
                    maxRoll = -1;
                else
                    maxRoll = maxRoll.rollout;


                GU.items._each((it, ind) => {
                    var id = G.UID_();

                    if (it.rollout <= (maxRoll+1) && it.x > (x1 - pwidth) && it.x < (x2 + pwidth) && !it.made) {
                        var make = true;
                        if(isFollow && Math.random()>0.5)
                            make = false;
                        if(!make)
                            return;

                        it.made = true;
                        if (it.flowerType == 'clover')
                            GU.MakeClover(`clover${ind}${id}`, it.x);
                        if (it.flowerType == 'grass')
                            GU.MakeGrass(`grass${ind}${id}`, it.x);
                        if (it.flowerType == 'blue')
                            GU.MakeBlue(`blue${ind}${id}`, it.x);
                        if (it.flowerType == 'daisy')
                            GU.MakeDaisy(`daisy${ind}${id}`, it.x);
                        if (it.flowerType == 'delphy')
                            GU.MakeDelphy(`delphy${ind}${id}`, it.x);
                    }
                })

            },1000);
        },100);

    },

    CreateClover: function(x,y, width, total, chance=1){
        var swidth = width;
        var totalItems = total;
        var interval = Math.floor(swidth / totalItems);
        var id = G.UID_();

        var items = [];

        for (var i = 0; i < totalItems; i++){
            var yval = G.ran(y,7);
            var isBackground = yval < y;

            if(Math.random() >= chance)
                continue;

            var ran = Math.random();

            if (ran > 0.25){
                /*
                G.InitLoad(`clover${i + id}`, 'g_clover', {
                    spx: G.ran(x + i * interval, 5),
                    spy: yval,
                    flowerType: 'clover',
                    plantHeight: G.ran(28, 8),
                    isFar: isBackground,
                    flowerScale: G.ran(0.35, 0.03),//G.ran(0.5,0.05),//0.5
                    windResistance: 1.6
                });*/

                if(Math.random() > 0.15)
                    items.push({ x: G.ran(x + i * interval, 10), flowerType: 'clover' });

                if(Math.random() > 0.9){
                    if (Math.random() > 0.85) {
                        items.push({ x: G.ran(x + i * interval, 40), flowerType: 'delphy' });
                        items.push({ x: G.ran(x + i * interval, 40), flowerType: 'delphy' });
                        /*
                        GU.MakeDelphy(`delphy${i + id}a`, G.ran(x + i * interval, 40), y);
                        GU.MakeDelphy(`delphy${i + id}b`, G.ran(x + i * interval, 40), y);*/
                    } else {
                        items.push({ x: G.ran(x + i * interval, 10), flowerType: 'daisy' });
                        //GU.MakeDaisy(`flower${i + id}`, G.ran(x + i * interval, 10), y);
                    }
                }
            }


            if (ran < 0.25){

                if(Math.random() > 0.7){
                    var numBlue = Math.random() > 0.75 ? 3 : 2;
                    for (var j = 0; j < numBlue; j++)
                        items.push({ x: G.ran(x + i * interval, 30), flowerType: 'blue' });

                    //GU.MakeGrass(`grass${i}a`, G.ran(x + i * interval, 5), y);
                    /*
                    GU.MakeBlue(`blue${i + id}a`, G.ran(x + i * interval, 30), y);
                    GU.MakeBlue(`blue${i + id}b`, G.ran(x + i * interval, 30), y);
                    GU.MakeBlue(`blue${i + id}c`, G.ran(x + i * interval, 30), y);*/
                }else{
                    items.push({ x: G.ran(x + i * interval, 5), flowerType: 'grass' });
                    items.push({ x: G.ran(x + i * interval, 12), flowerType: 'grass' });
                    items.push({ x: G.ran(x + i * interval, 20), flowerType: 'grass' });
                    items.push({ x: G.ran(x + i * interval, 20), flowerType: 'grass' });

                    /*
                    GU.MakeGrass(`grass${i + id}a`, G.ran(x + i * interval, 5), y);
                    GU.MakeGrass(`grass${i + id}b`, G.ran(x + i * interval, 12), y);
                    GU.MakeGrass(`grass${i + id}c`, G.ran(x + i * interval, 20), y);
                    GU.MakeGrass(`grass${i + id}d`, G.ran(x + i * interval, 20), y);*/
                }
            }
        }    
        
        return items;
    },

    MakeClover: function(name, x){
        var y = G.bounds.max.y - 5;
        var yval = G.ran(y, 7);
        var isBackground = yval < y;

        G.InitLoad(name, 'g_clover', {
            spx: x,
            spy: yval,
            flowerType: 'clover',
            plantHeight: G.ran(28, 8),
            isFar: isBackground,
            flowerScale: G.ran(0.35, 0.03),//G.ran(0.5,0.05),//0.5
            windResistance: 1.6
        });
    },

    MakeBlue: function (name, x){
        var y = G.bounds.max.y - 5;
        var yval = G.ran(y, 7);
        var isBackground = yval < y;

        G.InitLoad(name, 'g_clover', {
            spx: x,
            spy: yval,
            flowerType: 'blue',
            plantHeight: G.ran(55, 8),
            isFar: isBackground,
            flowerScale: 0.4,//G.ran(0.8,0.16),
            windResistance: 1.3,
            stemWidth: 10,
        });
    },

    MakeDelphy: function (name, x){
        var y = G.bounds.max.y - 5;
        var yval = G.ran(y, 7);
        var isBackground = yval < y;

        G.InitLoad(name, 'g_clover', {
            spx: x,
            spy: yval,
            flowerType: 'delphy',
            plantHeight: G.ran(250, 30),
            isFar: isBackground,
            windResistance: G.ran(1.3, 0.3),
            stemWidth: 18,
            flowerScale: 0.25
        });
    },

    MakeGrass: function(name, x){
        var y = G.bounds.max.y - 5;
        var yval = G.ran(y, 7);
        var isBackground = yval < y;

        G.InitLoad(name, 'g_clover', {
            spx: x,
            spy: yval,
            flowerType: 'grass',
            plantHeight: 15 + G.ran(30,25),
            isFar: isBackground,
            windResistance: G.ran(1.3,0.3),
            stemWidth:10,
        });
    },

    MakeDaisy: function(name, x){
        var y = G.bounds.max.y - 5;
        var yval = G.ran(y, 7);
        var isBackground = yval < y;

        G.InitLoad(name, 'g_clover', {
            spx: x,
            spy: yval,
            flowerType: 'daisy',
            plantHeight: G.ran(130, 30),
            isFar: isBackground,
            flowerScale: 0.8,//G.ran(0.8,0.16),
            windResistance: 1.3
        });
    },

    CreateTree: function(x, y){
        var pheight = 5;
        if(!GU.settings.gardenTree)
            return;

        GU.guy = G.InitLoad('plant1', 'g_plant', {
            spx: x, spy: y,
        });

        G.TickFunc(G.Tick+1, function(){
            GU.MakeBranch(GU.guy, 0, pheight, 'A');
        })   
    },

    MakeBranch: function(parent, height, maxHeight, type){
        var id = G.UID_();
        var b1 = G.InitLoad(`b${height}${type}${id}`, 'g_branch', { 
            height: height,
            parentid: parent.oid,
            parentAng: parent.core.grs.grBox1.wa,
            hasApple: Math.random() > 0.5
            //windResistance: 1
        });
        GU['branch' + height] = b1;

        b1.SetParent(parent, parent.endOffset.x, parent.endOffset.y);

        if(height < maxHeight){
            G.TickFunc(G.Tick+2, function(){
                GU.MakeBranch(b1, height + 1, maxHeight, 'A');

                if(type == 'A'){
                    
                    //if(height <= 2)
                        GU.MakeBranch(b1, height + 1, maxHeight, 'B');

                    //else
                        //GU.MakeBranch(b1, height + 1, maxHeight, 'A');
                }
            })
        }
    }

};
if (typeof exports !== 'undefined')
    module.exports = GU;
