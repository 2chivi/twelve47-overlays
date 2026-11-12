var Parts = {
    things: {},


    Init: function () {
        var t = this;

        t.fxCircle = G.particle('circle',
            G.circle(null, 6, { color: 0xffffff, opacity: 0.6 }), 2, null);
        t.fxCircle60 = G.particle('circle60',
            G.circle(null, 6, { color: 0xffffff, opacity: 0.3 }), 0, 60);
        t.fxRect = G.particle('rect',
            G.rect(null, 10, 10, 2, { color: 0xffffff, opacity: 0.5 }), 0, null, true);


        G.ReSort();
    },

    AlphaPulseFunc(p) {
        if ((p.life / p.maxLife) > 0.5) {
            p.alpha = Math.min(0.5, 1 - (p.life / p.maxLife));
        }
    },

    OrbFunc(p) {
        if (p.life >= (p.maxLife * 4))
            p.decay = true;
        else if (p.life < (p.maxLife * 4) && !p.decay)
            p.life += 2;

        //paralax is broken with this system.
        p.rx += (1000 / p.background) / p.background; //600
        p.x = p.offx + ((G.Stage_.pivot.x + p.rx) / p.cBack);
        p.y = p.offy + ((G.Stage_.pivot.y + p.ry) / p.cBack);

        if (p.x > (G.bounds.max.x + 100)) {
            p.rx0 = p.rx = G.Stage_.pivot.x;
            p.offx = p.rx0 - ((G.Stage_.pivot.x + p.rx0) / p.cBack);
        }
        else if (p.y > (G.bounds.max.y + 100)) {
            p.ry0 = p.ry = G.Stage_.pivot.y;
            p.offy = p.ry0 - ((G.Stage_.pivot.y + p.ry0) / p.cBack);
        }
        else if (p.x < (G.bounds.min.x - 100)) {
            p.rx0 = p.rx = G.bounds.max.x;
            p.offx = p.rx0 - ((G.Stage_.pivot.x + p.rx0) / p.cBack);
        }
        else if (p.y < (G.bounds.min.y - 100)) {
            p.ry0 = p.ry = G.bounds.max.y;
            p.offy = p.ry0 - ((G.Stage_.pivot.y + p.ry0) / p.cBack);
        }
    },

    RealToBack(z, realx, realy) {
        var back = -100 / z;

        realx = (G.Stage_.pivot.x * back) + realx * back;
        realy = (G.Stage_.pivot.y * back) + realy * back;
        return { x: realx, y: realy };
    },

    BackFunc(gr) {
        var t5 = -100 / gr.background;

        gr.x = ((G.Stage_.pivot.x + gr.rx) / t5);
        gr.y = ((G.Stage_.pivot.y + gr.ry) / t5);
    },

    Gradient(from, to) {
        const c = document.createElement("canvas");
        c.width = 1;
        c.height = 256;
        const ctx = c.getContext("2d");
        const grd = ctx.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0, from);
        grd.addColorStop(1, to);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 1, 256);
        var tex = new PIXI.Texture.from(c);
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        //tex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
        //tex.baseTexture.wrap = true;
        tex.baseTexture.update();

        return new PIXI.Texture.from(c);
    }

};
if (typeof exports !== 'undefined')
    module.exports = Parts;