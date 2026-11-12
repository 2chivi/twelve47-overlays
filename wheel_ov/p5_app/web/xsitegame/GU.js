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
