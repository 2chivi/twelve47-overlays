var EMhj = {

    ogTextures: {},
    textures: {},
    channelEmotes: {},
    color: {},
    raw: [],
    originals: {},

    GetEmotes: function (id, done) {

        var c = tinycolor("#004a88").darken(20).toString();

        EM.f1 = new PIXI.filters.GlowFilter(5, 5, 0, 0x0, 1);
        EM.f2 = new PIXI.filters.GlowFilter(7, 7, 0, 0x0, 1);
        EM.f3 = new PIXI.filters.GlowFilter(5, 5, 0, 0xffffa1, 1);
        EM.f4 = new PIXI.filters.GlowFilter(15, 10, 0, "0x"+c.substring(1), 1);

        var url = 'https://api.twitchemotes.com/api/v4/channels/' + id;

        $.get(url, function (data) {})
        .always(function(data){
            if (data.emotes) {
                data.emotes._each(em => {
                    EM.twitchEmotes[em.id] = { id: em.id, code: em.code, origin: 'twitch' };
                });
            }

            EM.LoadEmotes(UT.List(EM.twitchEmotes), function () {
                G.Loader_.load(function (loader, res) {
                    console.log(res);
                    res._each(r => {
                        if (!CG.textures[r.name]) {
                            var cdata = UT.ran(CG.cdata);
                            var tex = G.image(null, r.texture, {});
                            var ft = G.filterTex(EM.f2, 10, tex, { zIndex: 5 });
                            var ftc1 = G.filterTex(cdata.fsmall, 10, tex, { zIndex: 5 });
                            ftc1.cdata = cdata;
                            console.log(r);
                            if(r.myData && !r.myData.global)
                                EM.channelEmotes[r.name] = ft;

                            EM.ogTextures[r.name] = r.texture;
                            EM.textures[r.name] = ft;
                            EM.color[r.name] = ftc1;
                            EM.originals[r.name] = G.image(null, r.texture, { alpha:0.5 });
                        }
                    });

                    if (done) done(EM.textures);
                });
            });
        });


    },

    To64Data: function (stuff) {
        var t2 = btoa(new Uint8Array(stuff).reduce(function (data, byte) {
            return data + String.fromCharCode(byte);
        }, ''));
        return 'data:image/png;base64,' + t2;
    },

    LoadEmotes: function (list, done) {
        var total = list.length;

        list._each(d => {
            var url = "https://static-cdn.jtvnw.net/emoticons/v1/" + d.id + "/2.0";
            if (d.origin == 'ffz')
                url = 'https://cdn.frankerfacez.com/emoticon/' + d.id + '/' + d.size;

            if (d.origin != 'bttv') {
                var oReq = new XMLHttpRequest();
                oReq.open("GET", url, true);
                oReq.responseType = "arraybuffer";
                oReq.edata = d;
                oReq.onload = function (oEvent) {
                    var arrayBuffer = oReq.response;
                    var src = EM.To64Data(arrayBuffer);
                    EM.raw.push({data: src, info: d});

                    if (!G.Loader_.resources[oEvent.target.edata.code]){
                        var test = G.Loader_.add(oEvent.target.edata.code, src);
                        if(test.resources[oEvent.target.edata.code]){
                            test.resources[oEvent.target.edata.code].myData = d;
                        }
                    }

                    total--;
                    if (total <= 0) done();
                };
                oReq.send();
            } else
                total--;
        });
    },

    twitchEmotes: {
        '1': { origin: 'twitch', code: '\:-?\)', id: 1, global: true },
        '354': { origin: 'twitch', code: '4Head', id: 354, global: true },
        '86': { origin: 'twitch', code: 'BibleThump', id: 86, global: true },
        '33': { origin: 'twitch', code: 'DansGame', id: 33, global: true },
        '360': { origin: 'twitch', code: 'FailFish', id: 360, global: true },
        '114836': { origin: 'twitch', code: 'Jebaited', id: 114836, global: true },
        '25': { origin: 'twitch', code: 'Kappa', id: 25, global: true },
        '55338': { origin: 'twitch', code: 'KappaPride', id: 55338, global: true },
        '41': { origin: 'twitch', code: 'Kreygasm', id: 41, global: true },
        '425618': { origin: 'twitch', code: 'LUL', id: 425618, global: true },
        '58765': { origin: 'twitch', code: 'NotLikeThis', id: 58765, global: true },
        //'88': { origin: 'twitch', code: 'PogChamp', id: 88, global: true },
        '245': { origin: 'twitch', code: 'ResidentSleeper', id: 245, global: true },
    },

};
if (typeof exports !== 'undefined')
    module.exports = EM;