
var EM = {

    emotes: {},
    textures: {},
    animations: {},

    InitEmoteData: function (TWITCH, done) {
        ioLogin.Call('InitEmoteData', TWITCH, function (data) {
            EM.emoteData = data;
            done(data);
        });
    },

    FetchEmote: function (em, TWITCH, done) {
        if (EM.emotes[em] != null) {
            done(true, em);
            return;
        }

        if(!EM.emoteData[em]){
            done(false);
            return;
        }

        EM.fetching = true;

        clearTimeout(EM.fetching);
        EM.ttFetch = setTimeout(function(){
            EM.fetching = false;
        },2000);

        ioLogin.Call('GetImageData', { code: em, TWITCH, emote: EM.emoteData[em] }, (data) => {
            EM.fetching = false;

            if (data) {
                console.log('fetch emote', em, data);
                EM.CheckLoad(data.raw, data.emote, done);
            }
            else {
                done(false);
            }
        });
    },

    //check if its been loaded -> if not -> load
    CheckLoad: function (raw, emote, done) {
        emote.raw = raw;
        EM.emotes[emote.code] = emote;

        if (!emote.loaded) {
            emote.raw = EM.To64Data(raw, (emote.type == 'gif' ? 'gif' : 'png'));

            if (emote.type == 'gif') {
                EM.ParseGif(emote.raw, emote.code, function (frames) {
                    emote.animationLength = frames.length;

                    var doneC = frames.length;
                    frames._each((f, i) => {
                        EM.LoadFrame(emote, f.durl, i, function () {
                            doneC--;
                            if (doneC <= 0)
                                done(true, emote.code)
                        });
                    });

                })
            } else if (emote.type == 'webp') {
                EM.ParseWebp(raw, emote.code, function (frames) {

                    if (frames.length == 1) {
                        return EM.Load(emote, function () { done(true, emote.code) });
                    }

                    emote.animationLength = frames.length;
                    var doneC = frames.length;

                    frames._each((f, i) => {
                        EM.LoadFrame(emote, f.durl, i, function () {
                            doneC--;
                            if (doneC <= 0)
                                done(true, emote.code)
                        });
                    });
                });
            }
            else {
                EM.Load(emote, function () {
                    done(true, emote.code);
                });
            }


            //gifs + webp images + webp animations
        }
    },


    /* 
        shadow underneath stuff here

        var tex = G.texture(null, r.texture, {});
    //var ft = G.filterTex(EM.f2, 10, tex, { zIndex: 5 });
    var ft = G.filterTex(CG.f1, 5, tex, { zIndex: 5 });

    EM.ogTextures[r.name] = r.texture;
    EM.textures[r.name] = ft;
    EM.originals[r.name] = G.texture(null, r.texture, {  });
    */

    Load: function (em, done) {
        //threejs vs 2d
        if (G.Loader2) {
            G.Loader2.load(em.raw, function (tex) {
                //handle if animation happens vs a normal
                em.loaded = true;
                EM.textures[em.code] = tex;

                /*
                var tex = G.texture(null, tex, {});
                var ft = G.filterTex(CG.f1, 5, tex, { zIndex: 5 });
                EM.textures[r.name] = ft;*/


                Parts.mats[em.code] = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, fog: false });
                done();
            });
        } else {
            var loader = new PIXI.Loader();
            loader.add(em.code, em.raw);
            loader.load(function (loader, res) {
                //handle if animation happens vs a normal
                em.loaded = true;

            
                EM.textures[em.code] = res[em.code].texture;

                /*
                var tex = G.texture(null, res[em.code].texture, {});
                var ft = G.filterTex(CG.f1, 5, tex, { zIndex: 5 });
                EM.textures[em.code] = ft;*/

                done();
            });
        }
    },

    LoadFrame: function (em, durl, index, done) {
        if (G.Loader2) {
            G.Loader2.load(durl, function (tex) {
                //handle if animation happens vs a normal
                if (em.animationLength == index - 1)
                    em.loaded = true;
                EM.animations[em.code].frames[index] = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, fog: false });
                done();
            });
        } else {
            var loader = new PIXI.Loader();
            loader.add(index + '_' + em.code, durl);
            loader.load(function (loader, res) {
                //handle if animation happens vs a normal
                if (em.animationLength == index - 1)
                    em.loaded = true;
                EM.textures[em.code] = res[index + '_' + em.code].texture;
                EM.animations[em.code].frames[index] = res[index + '_' + em.code].texture;

                /*

                var tex = G.texture(null, res[index + '_' + em.code].texture, {});
                var ft = G.filterTex(CG.f1, 5, tex, { zIndex: 5 });
                EM.textures[em.code] = ft;
                EM.animations[em.code].frames[index] = ft;*/

                done();
            });
        }
    },

    //return dataurl
    To64Data: function (stuff, type = 'png') {
        var t2 = btoa(new Uint8Array(stuff).reduce(function (data, byte) {
            return data + String.fromCharCode(byte);
        }, ''));
        return 'data:image/' + type + ';base64,' + t2;
    },

    ParseWebp: function (durl, code, done) {
        var response = btoa(new Uint8Array(durl).reduce(function (data, byte) {
            return data + String.fromCharCode(byte);
        }, ''));
        response = Array.from(new Uint8Array(durl));
        //console.log('here', code, null, memcmp(response, 0, 'RIFF', 4))
        var webpdecoder = new WebPDecoder();
        var imagearray = WebPRiffParser(response, 0);


        //single image in webp
        if (!imagearray || !imagearray['frames'] || imagearray['frames'].length == 1) {
            //var img = new window.Image();
            //img.src = src;
            //$('body').append(img);

            //if (!G.Loader_.resources[d.code])
            //G.Loader_.add(d.code, src);

            return [durl];
        } else {
            var durls = [];

            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            imagearray['response'] = response;
            imagearray['rgbaoutput'] = true;
            imagearray['dataurl'] = false;
            var header = imagearray['header'] ? imagearray['header'] : null;
            var frames = imagearray['frames'] ? imagearray['frames'] : null;

            if (header) {
                header['loop_counter'] = header['loop_count'];
                canvas.height = header['canvas_height'];
                canvas.width = header['canvas_width'];
                var blend = false;
                for (var f = 0; f < frames.length; f++)
                    if (frames[f]['blend'] == 0) { blend = true; break; }
            }



            //incoming processing stuff from viewer.js
            for (var f = 0; f < frames.length; f++) {
                var height = [0];
                var width = [0];
                var frame = frames[f];
                var rgba = webpdecoder.WebPDecodeRGBA(response, frame['src_off'], frame['src_size'], width, height);
                frame['imgwidth'] = width[0];
                frame['imgheight'] = height[0];

                if (!header) {
                    canvas.height = height[0];
                    canvas.width = width[0];
                } else {
                    if (blend) {
                        var oldimagedata;
                        var oldimagedata = [];
                        var oldimagedata_ = ctx.getImageData(frame['offset_x'], frame['offset_y'], width[0], height[0], { willReadFrequently: true });
                        for (var i = 0; i < width[0] * height[0] * 4; i++)
                            oldimagedata[i] = oldimagedata_.data[i];
                    }
                }
                var imagedata = ctx.createImageData(width[0], height[0]);

                if ((frames.length == 1 && typeof frame['blend'] === 'undefined') || frame['blend'] == 1) {
                    for (var i = 0; i < width[0] * height[0] * 4; i++)
                        imagedata.data[i] = rgba[i];
                } else {
                    for (var i = 0; i < width[0] * height[0] * 4; i += 4) {
                        if (rgba[i + 3] > 0) {
                            imagedata.data[i + 3] = rgba[i + 3];
                            imagedata.data[i] = rgba[i];
                            imagedata.data[i + 1] = rgba[i + 1];
                            imagedata.data[i + 2] = rgba[i + 2];
                        } else {
                            imagedata.data[i + 3] = oldimagedata[i + 3];
                            imagedata.data[i] = oldimagedata[i];
                            imagedata.data[i + 1] = oldimagedata[i + 1];
                            imagedata.data[i + 2] = oldimagedata[i + 2];
                        }
                    }
                }

                if (frames.length == 1)
                    ctx.putImageData(imagedata, 0, 0);
                else
                    ctx.putImageData(imagedata, frame['offset_x'], frame['offset_y']);

                frame['dataurl'] = canvas.toDataURL();


                if (!EM.animations[code])
                    EM.animations[code] = { frames: [], frameInfo: frames };

                /*
                //standard add stuff goes here
                G.Loader_.add(f + '_gif_' + d.code, frame.dataurl);




                if (f == frames.length - 1)
                    total--;
                if (total <= 0) done();*/

                durls.push({ durl: frame.dataurl, code: code });

                //var img = new Image();
                //img.src = frame.dataurl;
                //$('body').append(img);

                if (frame['dispose'] == 1)
                    ctx.clearRect(frame['offset_x'], frame['offset_y'], width[0], height[0]);

            }
            done(durls);
        }
    },

    //parses individual dataurls from raw animation
    ParseGif: function (dataurl, code, done) {
        var durls = [];

        gifFrames({ url: dataurl, frames: 'all', outputType: 'canvas' })
            .then(function (fdata) {
                //console.log(fdata[0].frameInfo);
                //console.log(d);

                for (var i = 0; i < fdata.length; i++) {

                    var canv = fdata[i].getImage();
                    var durl = canv.toDataURL();

                    if (i == 0 && EM.animations[code])
                        break;


                    var speed = fdata[i].frameInfo.delay ? fdata[i].frameInfo.delay : 5;

                    if (!EM.animations[code])
                        EM.animations[code] = { frames: [], speed: speed, finfo: [] };

                    durls.push({ durl: durl, code: code, speed: speed });
                }
                done(durls);
            });
    },

    FrameAnimation(gr, anim) {
        if (!gr) return;
        if (gr && !gr.lastFrameChange) {
            gr.lastFrameChange = G.RTick;
            gr.animFrame = 0;
        }

        var dur = anim.speed;

        if (anim.frameInfo != null)
            dur = anim.frameInfo[gr.animFrame].duration * 0.25 * 0.45;

        if (G.RTick - gr.lastFrameChange > (0.25 * dur)) {
            gr.material.map = anim.frames[(gr.animFrame + 1) % anim.frames.length].map;
            gr.lastFrameChange = G.RTick;
            gr.animFrame = (gr.animFrame + 1) % anim.frames.length;
        }
    }

}