var TWITCH = null;

var CG = {
    textures: {},
    testData: { "data": [{ "id": "1qeIyD8M8BR9rj1HBTdC5S51UU5", "event_type": "hypetrain.progression", "event_timestamp": "2021-04-03T07:11:20Z", "version": "1.0", "event_data": { "broadcaster_id": "40934651", "cooldown_end_time": "2021-04-03T09:13:23Z", "expires_at": "2021-04-03T07:13:23Z", "goal": 3000, "id": "1a26ea4b-3b37-441b-a462-947c88e777a0", "last_contribution": { "total": 500, "type": "SUBS", "user": "126322671" }, "level": 5, "started_at": "2021-04-03T07:08:23Z", "top_contributions": [{ "total": 5000, "type": "SUBS", "user": "654880286" }, { "total": 1000, "type": "BITS", "user": "38900412" }], "total": 20700 } }], "pagination": { "cursor": "eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6IjQwOTM0NjUxOjE2MTc0MzM4ODA6MXFlSXlEOE04QlI5cmoxSEJUZEM1UzUxVVU1In19" } },

    Init: function () {
        var query = new URLSearchParams(window.location.search);
        TWITCH = query.get('twitch');
        if (!TWITCH)
            TWITCH = 'your_twitch';

        //CN.ioGame = new API(loadData.PORT, loadData.IP);


        CG.tc = new tmi.Client({
            connection: { secure: true, reconnect: true },
            channels: [TWITCH],
        });

        CG.tc.on('message', function (tar, context, msg, self) {
            if (!CG.activeTrain) return;
            if (context && context.username) {
                var peep = GU.peeps.get(context.username.toLowerCase());
                if (peep) {
                    var words = msg.split(' ');
                    for (var i = 0; i < words.length; i++) {

                        if(CG.emotes[words[i]] != null){
                            EM.FetchEmote(words[i], TWITCH, function (success, code) {
                                console.log('got ehre fetch', success, peep, code)
                                peep.emoteName = code;
                            });
                        }

                        //if (EM.textures[words[i]] != null)
                            //peep.emoteName = words[i];
                    }
                }
            }
        });

        CG.tc.on('submysterygift', function (channel, gifter, totalGifts) {
            console.log('myst gift happ');
            for (var i = 0; i < totalGifts; i++) {
                G.TickFunc(G.Tick + i * 4, function () {
                    GU.NewContribution(gifter.toLowerCase(), 123, 'gift', 500);
                })
            }
        });
        CG.tc.on('subgift', function (channel, gifter, streak, recipient, state) {
            GU.NewContribution(gifter.toLowerCase(), 123, 'gift', 500);
        });
        CG.tc.on('subscription', function (channel, username, methods, msg, state) {
            GU.NewContribution(username.toLowerCase(), 123, 'sub', 500);
        });
        CG.tc.on('resub', function (channel, username, methods, msg, state) {
            GU.NewContribution(username.toLowerCase(), 123, 'sub', 500);
        });
        CG.tc.on('cheer', function (channel, userstate, message) {
            var total = Math.ceil(userstate.bits / 100);

            if (userstate.bits >= 50) {
                for (var i = 0; i < total; i++)
                    GU.NewContribution(userstate.username.toLowerCase(), 123, 'bit', 100);
            }
        });

        CG.tc.connect();

        setTimeout(function () {
            CG.GetSettingsNew();
        }, 4000)

        clearInterval(CG.ttUpdate);

        CG.ttUpdate = setInterval(function () {
            CG.GetSettingsNew();
        }, 7000 + Math.floor(Math.random() * 4000));


        if (UT.List(CG.textures).length == 0) {
            ioLogin.Call('CustomFiles', TWITCH, function (files) {
                CG.files = files;
                console.log('custom files starting???', files);

                var loc = "https://twelve47.s3.us-east-2.amazonaws.com/app_train/";

                G.Loader_.add('wheel', loc + 'Engine_Wheel.png');
                G.Loader_.add('wheel2', loc + 'Car_Wheel.png');
                G.Loader_.add('engine', loc + 'engine.png');
                G.Loader_.add('cart', loc + 'Car.png');
                G.Loader_.add('bit', loc + 'bit.png');
                G.Loader_.add('sub', loc + 'sub.png');
                G.Loader_.add('gift', loc + 'gift.png');

                if (CG.files.length > 0) {
                    var engine = files._first(x => x.fileType == 'Engine');
                    var car = files._first(x => x.fileType == 'Car');
                    var engine_wheel = files._first(x => x.fileType == 'Engine_Wheel');
                    var car_wheel = files._first(x => x.fileType == 'Car_Wheel');

                    if (engine)
                        G.Loader_.add('custom_engine', engine.file);
                    if (car)
                        G.Loader_.add('custom_car', car.file);
                    if (engine_wheel)
                        G.Loader_.add('custom_engine_wheel', engine_wheel.file);
                    if (car_wheel)
                        G.Loader_.add('custom_car_wheel', car_wheel.file);
                }


                CG.sxTrain = new Howl({ src: [loc + 'train.mp3'], loop: false, volume: 0.3 });


                CG.fWhite = new PIXI.filters.GlowFilter(3, 2, 2, 0xd2ced6, 1);//5,3,2,1
                CG.fWhite2 = new PIXI.filters.GlowFilter(8, 6, 2, 0xd2ced6, 1);

                G.Loader_.load(function (loader, res) {
                    console.log('GameConnect-> G.Loader_load -> LoadEmotes');

                    res._each(r => {
                        r.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
                        r.texture.baseTexture.wrap = true;
                        r.texture.baseTexture.update();
                        CG.textures[r.name] = r.texture;
                    });

                    CG.Connected();
                });
            });
        }

    },

    GetSettings: function () {
        var streamer = window.streamer;
        var sid = window.streamer ? window.streamer.id : null;
        var token = window.streamer ? window.streamer.token : null;

        ioLogin.Call('TrainData', [TWITCH, sid, token], function (data) {
            var tdata = data;
            var startTrain = tdata && tdata.data && tdata.data.length > 0;

            if (tdata.streamer)
                streamer = tdata.streamer;

            tdata.trainEmote = streamer.trainEmote;
            tdata.twitchId = streamer.id;
            tdata.trainColor = streamer.trainColor ? streamer.trainColor : '#ff0000';
            tdata.trainEmoteH = streamer.trainEmoteH != null ? Number(streamer.trainEmoteH) : 40;
            tdata.trainEmoteX = streamer.trainEmoteX != null ? Number(streamer.trainEmoteX) : 0;
            tdata.trainEmoteY = streamer.trainEmoteY != null ? Number(streamer.trainEmoteY) : 0;
            tdata.trainWheelH = streamer.trainWheelH != null ? Number(streamer.trainWheelH) : 60;
            tdata.trainWheelX = streamer.trainWheelX != null ? Number(streamer.trainWheelX) : 0;
            tdata.trainWheelY = streamer.trainWheelY != null ? Number(streamer.trainWheelY) : 0;
            tdata.trainSmokeX = streamer.trainSmokeX != null ? Number(streamer.trainSmokeX) : 0;
            tdata.trainSmokeY = streamer.trainSmokeY != null ? Number(streamer.trainSmokeY) : 0;

            tdata.trainConductorX = streamer.trainConductorX != null ? streamer.trainConductorX : 0;
            tdata.trainConductorY = streamer.trainConductorY != null ? streamer.trainConductorY : 0;

            if (tdata) {
                CG.twitchId = tdata.twitchId;
                CG.trainEmote = tdata.trainEmote;
                CG.trainColor = tdata.trainColor;
                CG.sdata = tdata;

                if (tdata.needsReset)
                    top.location.reload(true);
            }


            if (tdata.testTrain) {
                if (CG.trainColor)
                    CG.ColorData([CG.trainColor]);
                GU.TestTrain();
                console.log('tring to test');
            }


            if (startTrain && !CG.activeTrain && CG.ready) {
                var edata = tdata.data[0].event_data;
                if (CG.trainColor)
                    CG.ColorData([CG.trainColor]);

                if (Date.now() < (edata.endTime - 15000)) {
                    CG.activeData = edata;
                    CG.activeTrain = true;
                    GU.StartTrain();
                }
            }

            if (startTrain && CG.ready && CG.activeTrain) {
                var edata = tdata.data[0].event_data;
                CG.activeData = edata;
            }

            if (!CG.testing && CG.activeTrain && Date.now() >= (CG.activeData.endTime + 6000)) {
                CG.activeTrain = false;
                GU.EndTrain();
            }

            if (!CG.loadedEmotes && !CG.loadingStuff) {

                if (CG.trainColor)
                    CG.ColorData([CG.trainColor]);



                //initemotedata

                CG.LoadEmotes(function () {
                    CG.ready = true;
                    $('.div-loading').hide();
                });
            }

            console.log('tdata', tdata);
        });

    },

    GetSettingsNew: function () {
        var streamer = window.streamer;
        var sid = window.streamer ? window.streamer.id : null;
        var token = window.streamer ? window.streamer.token : null;

        ioLogin.Call('TrainStatus', [TWITCH, sid, token], function (data) {
			console.log('train status', data);
            var tdata = data;
            var startTrain = tdata && tdata.data && tdata.data.length > 0 && tdata.data[0].current;

            if (tdata.streamer)
                streamer = tdata.streamer;

            tdata.trainEmote = streamer.trainEmote;
            tdata.twitchId = streamer.id;
            tdata.trainColor = streamer.trainColor ? streamer.trainColor : '#ff0000';
            tdata.trainEmoteH = streamer.trainEmoteH != null ? Number(streamer.trainEmoteH) : 40;
            tdata.trainEmoteX = streamer.trainEmoteX != null ? Number(streamer.trainEmoteX) : 0;
            tdata.trainEmoteY = streamer.trainEmoteY != null ? Number(streamer.trainEmoteY) : 0;
            tdata.trainWheelH = streamer.trainWheelH != null ? Number(streamer.trainWheelH) : 60;
            tdata.trainWheelX = streamer.trainWheelX != null ? Number(streamer.trainWheelX) : 0;
            tdata.trainWheelY = streamer.trainWheelY != null ? Number(streamer.trainWheelY) : 0;
            tdata.trainSmokeX = streamer.trainSmokeX != null ? Number(streamer.trainSmokeX) : 0;
            tdata.trainSmokeY = streamer.trainSmokeY != null ? Number(streamer.trainSmokeY) : 0;

            tdata.trainConductorX = streamer.trainConductorX != null ? streamer.trainConductorX : 0;
            tdata.trainConductorY = streamer.trainConductorY != null ? streamer.trainConductorY : 0;

            if (tdata) {
                CG.twitchId = tdata.twitchId;
                CG.trainEmote = tdata.trainEmote;
                CG.trainColor = tdata.trainColor;
                CG.sdata = tdata;

                if (tdata.needsReset)
                    top.location.reload(true);
            }


            if (tdata.testTrain) {
                if (CG.trainColor)
                    CG.ColorData([CG.trainColor]);
                GU.TestTrain();
                console.log('tring to test');
            }


            if (startTrain && !CG.activeTrain && CG.ready) {
                var edata = tdata.data[0].current;
                if (CG.trainColor)
                    CG.ColorData([CG.trainColor]);

                if (Date.now() < (edata.endTime - 15000)) {
                    CG.activeData = edata;
                    CG.activeTrain = true;
                    GU.StartTrain();
                }
            }

            if (startTrain && CG.ready && CG.activeTrain) {
                var edata = tdata.data[0].current;
                CG.activeData = edata;
            }

            if (!CG.testing && CG.activeTrain && Date.now() >= (CG.activeData.endTime + 6000)) {
                CG.activeTrain = false;
                GU.EndTrain();
            }

            if (!CG.loadedEmotes && !CG.loadingStuff) {

                if (CG.trainColor)
                    CG.ColorData([CG.trainColor]);



                //initemotedata

                CG.LoadEmotes(function () {
                    CG.ready = true;
                    $('.div-loading').hide();
                });
            }

            console.log('tdata', tdata);
        });

    },

    /* 
        request a random emote twice. for every car
        take first emote that hasnt been chosen. flag it as chosen.
        otherwise take a random chosen emote.
    */
    ResetRandomEmote: function(){
        var hasEmotes = CG.emoteList._any(x=> !x.default);
        if(hasEmotes)
            code = UT.ran(CG.emoteList._where(x=> x.type == 'png' && !x.default)._select(x=> x.code));
        else
            code = UT.ran(CG.emoteList._where(x => x.type == 'png')._select(x => x.code));

        EM.FetchEmote(code, TWITCH, function(success){
            if(success){

            }
        });
    },

    LoadEmotes: function (done) {
        CG.loadingStuff = true;

        EM.InitEmoteData(TWITCH, function(data){
            CG.emoteList = UT.List(data);
            CG.emotes = data;
            CG.ResetRandomEmote();
            CG.ResetRandomEmote();
            CG.ResetRandomEmote();
            if (CG.trainEmote)
                EM.FetchEmote(CG.trainEmote, TWITCH, function (success) { });

            CG.loadedEmotes = true;
            CG.loadingStuff = false;
            done();
            console.log('done getting emotes');
        })
    },

    Connected: function (doneFun) {
        G.Height = $('.div-gcontainer').height();
        G.Width = $('.div-gcontainer').width();

        CG.Scale = { x: 1, y: 1 };
        CG.Scale.x = CG.Scale.y = (G.Width / G.StartWidth_) * 0.9;//0.9

        G.Init_($('.div-game'), function () {
            //CG.ColorData(['#970097', '#CD0045', '#48009E']);

            Parts.Init();

            //GU.StartTrain();
            if (doneFun) doneFun();

            CG.Events();
            $('canvas').attr('oncontextmenu', 'return false;');
            G.Stage_.scale = CG.Scale;
            //G.UI_.scale = CG.Scale;
        });
    },

    ColorData: function (colors) {
        CG.cdata = [];
        //CG.textures.w_body = G.filterTex(CG.fWhite2, 10, G.image(null, CG.textures.body, {}), {});
        //CG.textures.w_helm = G.filterTex(CG.fWhite2, 10, G.image(null, CG.textures.helm, {}), {});

        for (var i = 0; i < colors.length; i++) {
            var data = {};
            var tc = tinycolor(colors[i]);
            data.hash = colors[i];
            data.color = '0x' + colors[i].substring(1);
            data.baseContrast = tc.getLuminance();

            data.dim = CG.Contrast(data.hash, 0.1, 0.2);
            data.dark = CG.Contrast(data.hash, 0.02, 0);
            data.light = CG.Contrast(data.hash, 0.55, 0);

            data.f = new PIXI.filters.GlowFilter(8, 8, 0, CG.Contrast(data.hash, 0.1, 60), 1);
            data.fsmall = new PIXI.filters.GlowFilter(6, 6, 0, CG.Contrast(data.hash, 0.1, 60), 1);
            data.fbig = new PIXI.filters.GlowFilter(12, 10, 0, CG.Contrast(data.hash, 0.1, 60), 1);

            CG.cdata.push(data);
        }
    },

    //lighten removes black, brighten adds white
    Contrast: function (hash, pct, desaturate = 0) {
        var tc = tinycolor(hash).desaturate(desaturate);
        //var grey = tinycolor(hash).desaturate(desaturate).greyscale();

        while (Math.abs(tc.getLuminance() - (1 * pct)) > 0.02) {
            var bl = tc.getLuminance() - (1 * pct);
            tc = bl > 0 ? tc.darken(1) : tc.lighten(1);//.saturate(1);
            //grey = bl > 0 ? grey.darken(1) : grey.lighten(1);
        }
        //console.log(pct + " " + grey.getBrightness() + " " + grey.toString())
        return '0x' + tc.toHexString().substring(1);
    },

    UpdateUI: function () {
        M.Dad.forceUpdate();
    },

    Events: function () {

        UT.on('g_tick', 'cg1', function () {

        });

    },
};