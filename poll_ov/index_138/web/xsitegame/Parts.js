
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
        t.geoBox = G.GeoFromPath(points, { depth:10, rounded:5 });// new THREE.ShapeGeometry(new THREE.Shape(G.VertsFromPath(points)));


        var points = [-50, -50, 50, -50, 50, 50, -50, 50];
        t.geoPlane = G.GeoFromPath(points, { depth: 2 });// new THREE.ShapeGeometry(new THREE.Shape(G.VertsFromPath(points)));


        points = G.CirclePoints(100, 100);
        t.geoCircle = G.GeoFromPath(points, { depth: 2 });// G.GeoExtrude(points, {depth: 2, bevel: false});
    },


    InitGeometry: function () {
        var t = this;

    },

    InitTextures: function () {
        var t = this;

        CG.ColorData(['#c41414', '#c45314', '#c47414', '#cdd417', '#70d417', '#17d449', '#17d495', '#17d4c3', '#175fd4', '#5b17d4', '#a617d4', '#d4179f', '#040617'],);
        G.color = CG.cdata[0];

        CG.cdata._each((c,i)=>{
            t.mats['c' + i] = new THREE.MeshLambertMaterial({ color: c.color, fog: false });
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

        t.InitGeometry();
    },

    InitParticles: function () {
        var t = this;

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