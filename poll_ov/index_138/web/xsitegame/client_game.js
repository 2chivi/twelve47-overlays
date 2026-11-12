
var CG = {
    textures: {},

    Init: function(){
        //CN.ioGame = new API(loadData.PORT, loadData.IP);
        Parts.Init();
        SF.Init(); //Sprite Factory Setup
        
        setTimeout(function () {
            CG.Connected(function () { }, null);
            Parts.InitTextures();
        }, 500)
    },

    Connected: function(doneFun, info){
        
        G.Height = Math.floor(document.querySelector('html').clientHeight);// $('.div-gcontainer').height();
        G.Width = Math.floor(document.querySelector('html').clientWidth); //$('.div-gcontainer').width();

        CG.Scale = { x: 1, y: 1 };
        CG.Scale.x = CG.Scale.y = (G.Width / G.StartWidth_) * 1;//1 0.8

        G.Init_(document.querySelector('.div-game'), function () {
            GU.Init();
            if (doneFun) doneFun();

            CG.Events();
            document.querySelector('canvas').setAttribute('oncontextmenu', 'return false;')
            //$('canvas').attr('oncontextmenu', 'return false;');
            G.Cam.zoom = 0.8;//1/CG.Scale.x;
            G.Cam.updateProjectionMatrix();
            //alert(G.Cam.zoom, G.Width)
        });
    },

    ColorData: function(colors){
        CG.cdata = [];

        for (var i = 0; i < colors.length; i++) {
            var data = {};
            var tc = tinycolor(colors[i]);
            data.hash = colors[i];
            data.color = Number('0x' + colors[i].substring(1));
            data.orbColor = CG.Contrast(data.hash, 0.35, 15);
            data.baseLight = tc.getLuminance();
            data.landColor = CG.Contrast(data.hash, 0.1, 30);

            data.comp = Number('0x' + tc.complement().toHexString().substring(1));
            //data.compHash = tc.complement().toHexString();
            data.grassColor = CG.Contrast(data.hash, 0.02, 30);
            data.dark2 = CG.Contrast(data.hash, 0.006, 18);
            data.dark = CG.Contrast(data.hash, 0.02, 10);
            data.light = Number('0x' + tinycolor(data.hash).lighten(28).toHexString().substring(1));// CG.Contrast(data.hash, 0.35, 0);


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
        return Number('0x' + tc.toHexString().substring(1));
    },

    Events: function () {

    },

};