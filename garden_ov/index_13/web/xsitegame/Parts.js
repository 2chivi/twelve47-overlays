
var Parts = {
    things: {},
    textures: {},
    mats: {},
    particleGroups: {},

    Init: function () {
        var t = this;
        //One Time Creations of Textures, Materials, Geometries
        //Static creations
        //dynamically allow new creations?? maybe

        var points = [-50, -50, 50, -50, 50, 50, -50, 50];
        t.geoBox = G.GeoFromPath(points, { 
            depth:1, rounded:5 
        });// new THREE.ShapeGeometry(new THREE.Shape(G.VertsFromPath(points)));



        //var points = [-50, -50, 50, -50, 50, 50, -50, 50];
        //t.geoPlane = G.GeoFromPath(points, { depth: 2 });// new THREE.ShapeGeometry(new THREE.Shape(G.VertsFromPath(points)));


        //t.geoPlane = G.Plane(Parts.mats.c1, {});

        points = G.CirclePoints(100, 100);
        t.geoCircle = G.GeoFromPath(points, { depth: 2 });// G.GeoExtrude(points, {depth: 2, bevel: false});
    },


    InitGeometry: function () {
        var t = this;

    },

    InitTextures: function () {
        var t = this;
        //bark-color-brown:  #322b1b
        //orange, green, flower-pink, flower-inner
        CG.ColorData(['#694942', GU.settings.gardenGrassColor, '#d18e9f', '#ffe720'],);
        G.color = CG.cdata[0];

        var white = tinycolor(CG.cdata[1].hash).desaturate(30).lighten(14).toHexString();

        CG.cdata._each((c,i)=>{
            t.mats['cd' + i] = new THREE.MeshLambertMaterial({ color: c.dark, fog: false, transparent: true });
            t.mats['c' + i] = new THREE.MeshLambertMaterial({ color: c.color, fog: false, transparent: true });
            t.mats['cl' + i] = new THREE.MeshLambertMaterial({ color: c.color, fog: false, transparent: true, opacity: 0.6 });
            t.mats['cl2' + i] = new THREE.MeshLambertMaterial({ color: c.dark, fog: false, transparent: true, opacity: 0.9 });
        });


        t.mats.shadow = new THREE.ShadowMaterial();
        t.mats.shadow.opacity = 0.2;
        t.mats.basicRed = new THREE.MeshBasicMaterial({ color: 0xff0000, fog: false });


        G.Loader2.load('audio.png', function (tex) {
            t.textures.ship = tex;

            var tex = t.textures.ship.clone();
            t.mats.audio = new THREE.MeshBasicMaterial({
                map: tex,
                color: G.color.dark2,
                transparent: true,
                opacity: 1
            });
        });

        G.Loader2.load('apple.png', function (tex) {
            t.mats.apple = new THREE.SpriteMaterial({
                map: tex, fog: false, transparent: true,
            });
        });

        G.Loader2.load('can.png', function (tex) {
            t.mats.can = new THREE.SpriteMaterial({
                map: tex, color: GU.settings.gardenCanColor, fog: false, transparent: true,
            });
        });

        G.Loader2.load('bulb.png', function (tex) {
            t.mats.bulb = new THREE.SpriteMaterial({
                map: tex, color: '#91bc4f', fog: false
            });
        });

        /*
        G.Loader2.load('leaf3.png', function (tex) {
            t.mats.leaf3 = new THREE.SpriteMaterial({
                map: tex, color: '#91bc4f', fog: false, transparent: true,
                opacity: 0.85
            });
        });*/

        //#ddc410
        //#c75c28
        //#d2370e
        G.Loader2.load('leaf2.png', function (tex) {
            t.mats.leaf_0 = new THREE.SpriteMaterial({
                map: tex, color: GU.settings.gardenGrassColor, fog: false, transparent: true,
                opacity: 0.9
            });
            t.mats.leaf_1 = new THREE.SpriteMaterial({
                map: tex, color: '#ddc410', fog: false, transparent: true,
                opacity: 0.9
            });
            t.mats.leaf_2 = new THREE.SpriteMaterial({
                map: tex, color: '#c75c28', fog: false, transparent: true,
                opacity: 0.9
            });
        });

        G.Loader2.load('blue_inner.png', function (tex) {
            t.mats.blueInner = new THREE.SpriteMaterial({
                map: tex, color: 0xffffff, fog: false, transparent: true, opacity:0.8
            });
            t.mats.blueInnert = new THREE.SpriteMaterial({
                map: tex, color: 0xffffff, fog: false, transparent: true, opacity: 0.9
            });
        });

        G.Loader2.load('blue.png', function (tex) {
            t.mats.blue = new THREE.SpriteMaterial({
                map: tex, fog: false, color: GU.settings.gardenBlueColor
            });
            t.mats.bluet = new THREE.SpriteMaterial({
                map: tex, fog: false, color: GU.settings.gardenBlueColor, transparent: true, opacity: 0.9
            });
        });

        G.Loader2.load('delphy2.png', function (tex) {
            t.mats.delphy = new THREE.SpriteMaterial({
                map: tex, fog: false, color: GU.settings.gardenDelphyColor
            });
            t.mats.delphyt = new THREE.SpriteMaterial({
                map: tex, fog: false, color: GU.settings.gardenDelphyColor, transparent: true, opacity: 0.9
            });
        });
        G.Loader2.load('daisy_inner.png', function (tex) {
            var color = CG.cdata[3].hash;

            t.mats.daisyInner = new THREE.SpriteMaterial({
                map: tex, fog: false, color: color
            });
            t.mats.daisyInnert = new THREE.SpriteMaterial({
                map: tex, fog: false, color: color, transparent: true, opacity: 0.9
            });
        })
        G.Loader2.load('daisy.png', function(tex){
            t.mats.daisy = new THREE.SpriteMaterial({ 
                map: tex, fog: false, color: GU.settings.gardenDaisyColor
            });
            t.mats.daisyt = new THREE.SpriteMaterial({ 
                map: tex, fog: false, color: GU.settings.gardenDaisyColor, transparent: true, opacity:0.9
            });
        })
        G.Loader2.load('clover.png', function (tex) {
            var color = CG.cdata[1].hash;
            var light = CG.cdata[1].white;

            t.mats.clover = new THREE.SpriteMaterial({ 
                map: tex, color: 0xffffff, fog: false, color: color
            });
            t.mats.clovert = new THREE.SpriteMaterial({
                map: tex, color: 0xffffff, fog: false, color: light, transparent: true, opacity: 0.9
            });
        })

        t.InitGeometry();
        t.InitParticles();
    },

    InitParticles: function () {
        var t = this;

        SF.CircleMaterial(20, {}, function (tex) {
            t.InitParticleGroup('3', { total: 80, size: 7, color: '#41b0e7', tex, alpha: 0.95 });
        });

    },

    InitParticleGroup: function (name, opts) {
        var t = this;
        var verts = [];
        var geo = new THREE.BufferGeometry();
        var deads = [];
        var parts = [];
        var colors = new Float32Array(opts.total * 4);

        for (var i = 0; i < opts.total; i++) {
            verts.push(-10, -10, 10);
            deads.push(i);
            parts.push(t.InitParticle(i));
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
        //geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

        var mat = new THREE.PointsMaterial({
            vertexColors: true,
            depthTest: false,
            transparent: true,
            map: opts.tex != null ? opts.tex : null,
            size: opts.size != null ? opts.size : 50,
            fog: false,
        });
        var mesh = new THREE.Points(geo, mat);


        mesh.alives = [];
        mesh.deads = deads;
        mesh.parts = parts;
        mesh.frustumCulled = false;

        var color = opts.color ? opts.color : '#ffffff';
        var rgba = tinycolor(color).toRgb();
        mesh.rgba = rgba;
        mesh.alphaStart = opts.alpha != null ? opts.alpha : 1;
        mesh.total = opts.total;
        mesh.decayDelay = opts.decayDelay != null ? opts.decayDelay : 0;

        t.particleGroups[name] = mesh;
        G.Scene.add(mesh);
    },

    InitParticle: function (i) {
        var part = { i };
        return Parts.ResetParticle(part);
    },

    ResetParticle: function (part) {
        part.age = 0;
        part.lifetime = 50;
        part.vx = 0;
        part.vy = 0;
        part.slow =1;
        part.decayDelay = 0;
        //part.size = 1;
        return part;
    },

    EmitParticle: function (obj, group, opts) {
        var t = this;
        var pg = t.particleGroups[group];

        //console.log(pg, obj, obj.InFrame);

        if (pg && (obj == null || obj.InFrame)) {
            var i = pg.deads.pop();
            if (i) {
                pg.alives.push(i);
                Object.assign(pg.parts[i], opts);
                pg.geometry.attributes.position.setXYZ(i, opts.x, -opts.y, opts.z != null ? opts.z : 10);
            }
        }
    },

    UpdateParticles: function () {
        var t = this;
        t.particleGroups._each(pg => {
            var positions = pg.geometry.attributes.position;
            var colors = pg.geometry.attributes.color;

            for (var i = 0; i < pg.alives.length; i++) {
                var j = pg.alives[i];
                var part = pg.parts[j];

                var px = positions.getX(j);
                var py = positions.getY(j);
                var pz = positions.getZ(j);
                var n = pg.total;

                var fage = Math.max(0, part.age - part.decayDelay);
                var alph = (pg.alphaStart - (fage / (part.lifetime - part.decayDelay)));

                colors.setXYZW(j, (pg.rgba.r / n) + 0, (pg.rgba.g / n) + 0, (pg.rgba.b / n) + 0, alph);


                positions.setXYZ(j, px + part.vx, py + part.vy * -1, pz);
                part.vx = part.vx * part.slow;
                part.vy = part.vy * part.slow;
                if(part.grav)
                    part.vy = part.vy + part.grav;

                part.age++;

                if (part.age > part.lifetime) {
                    t.ResetParticle(part);
                    positions.setXYZ(j, -10, -10, -10);
                    colors.setXYZW(j, 0, 0, 0, 0);

                    pg.alives.splice(i, 1);
                    pg.deads.push(j);
                }
            }

            positions.needsUpdate = true;
            colors.needsUpdate = true;
        });
    },


};

if (typeof exports !== 'undefined')
    module.exports = Parts;