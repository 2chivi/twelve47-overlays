
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

};