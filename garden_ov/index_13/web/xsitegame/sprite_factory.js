
var SF = {

    Init: function () {
        var t = this;
        t.Renderer_ = new PIXI.Renderer({
            transparent: true, width: 800, height: 800, antialias: true, powerPreference: 'high-performance'
        });
    },

    //convert text into a sprite
    TextMaterial: function (text, opts, done) {
        var t = this;

        var txtOpts = {
            //font: '',
            fontSize: 21, strokeThickness: 4, alpha: 1,
            fontWeight: 600, fill: '#ffffff',
        };
        Object.assign(txtOpts, opts);

        var gr = t.text(null, text, null, txtOpts);


        var ft = t.filterTex(null, 10, gr, {});
        var ex = t.Renderer_.extract.canvas(ft).toDataURL();

        G.Loader2.load(ex, function (tex) {
            var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, color: 0xffffff });
            //var img = G.Image(mat, {});
            done(mat, opts);
        });
    },

    CircleMaterial: function (radius, ops, done) {
        var t = this;
        if (!ops.color)
            ops.color = 0xffffff;

        if(!CG.fWhite2)
            CG.fWhite2 = new PIXI.filters.GlowFilter(8, 6, 2, 0xd2ced6, 1);

        var gr = t.circle(null, radius, ops);
        var ft = t.filterTex(CG.fWhite2, 10, gr, {});
        var ex = t.Renderer_.extract.canvas(ft).toDataURL();


        G.Loader2.load(ex, function (tex) {
            //var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, color: 0xffffff });
            done(tex);
        });
    },

    RectMaterial: function(width, height, ops, done){
        var t = this;
        if (!ops.color)
            ops.color = 0xffffff;

        var ft = t.rect(null, width, height, ops);
        if(ops.filter)
            ft = t.filterTex(ops.filter, 10, ft, {});
        var ex = t.Renderer_.extract.canvas(ft).toDataURL();

        G.Loader2.load(ex, function (tex) {
            done(tex);
        });
    },

    PolyMaterial: function (points, ops, done) {
        var t = this;
        if (!ops.color)
            ops.color = 0xffffff;
        ops.alpha = 1;

        var gr = t.poly(null, points, ops);
        if (ops.filter != null)
            gr = t.filterTex(ops.filter, 10, gr, {});
        var ex = t.Renderer_.extract.canvas(gr).toDataURL();


        G.Loader2.load(ex, function (tex) {
            //var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, color: 0xffffff });
            done(tex);
        });
    },

    filterTex: function (filter, pad, gr, ops) {
        var t = this;

        if (filter) {
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

        return t.Renderer_.generateTexture(gr, null, null, new PIXI.Rectangle(
            bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2
        ));
    },

    circle: function (gr, radius, ops) {
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

        if (ops.hole) {
            gr.beginHole();
            gr.drawCircle(0, 0, ops.hole);
            gr.endHole();
        }

        return gr;
    },

    rect: function (gr, w, h, ops) {
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);
        gr.clear();

        if (gr.texture != null)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);

        gr.lineStyle(gr.lineWidth, gr.lineColor, gr.lineAlpha, gr.alignment);

        gr.drawRoundedRect(0, 0, w, h, 4);
        gr.endFill();

        if (ops.holeWidth) {
            gr.beginHole();
            gr.drawRoundedRect((w/2)-(ops.holeWidth/2), (h/2)-(ops.holeHeight/2), ops.holeWidth, ops.holeHeight, 0);
            gr.endHole();
        }

        return gr;
    },

    poly: function (gr, points, ops) {
        if (G.IsServer) return null;
        if (!gr) { gr = new PIXI.Graphics(); Object.assign(gr, G.Default); }
        Object.assign(gr, ops);

        gr.clear();
        if (gr.texture != null)
            gr.beginTextureFill({ texture: gr.texture, matrix: G.texMatrix(ops) })
        else
            gr.beginFill(gr.color, gr.alpha);
        gr.lineStyle({ width: gr.lineWidth, color: gr.lineColor ? gr.lineColor : 0x0, alpha: gr.lineAlpha ? gr.lineAlpha : 1, alignment: gr.alignment, join: 'round', cap: 'round' });

        var newPoints = points;

        if (ops.center !== false) {
            var newPoints = G.offsetToCenter(points);
        }

        gr.drawPolygon(newPoints)

        gr.endFill();
        gr.filters = gr.filter ? [gr.filter] : null;
        //gr.scale = ops.scale;

        if (ops.size)
            gr.scale.set(gr.size, gr.size);
        //gr.pivot.set(gr.offx, gr.offy);
        return gr;
    },

    text: function (gr, text, anchor, ops) {
        if (G.IsServer) return null;
        var isNew = !gr;

        var txtDef = {
            fontFamily: 'Open Sans',
            fontSize: 14,
            lineJoin: 'round',
            align: 'center',
            strokeThickness: 1,
        };
        Object.assign(txtDef, ops);

        var gr = isNew ? new PIXI.Text('sdf', txtDef) : gr;


        Object.assign(gr, ops);
        gr.text = text;
        gr.anchor = anchor ? anchor : { x: 0.5, y: 0.5 };
        gr.resolution = 2;

        return gr;
    }
}