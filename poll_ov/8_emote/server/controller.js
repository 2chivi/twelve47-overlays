var e = exports;

e.InitEmoteData = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args);
    if (guy && !guy.twitchEmotes) {
        e.FindEmoteData(dal, guy, function () {
            req.emit('any', key, guy.twitchEmotes);
        });
    }else if(guy){
        req.emit('any', key, guy.twitchEmotes);
    }
};

e.GetImageData = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args.TWITCH);
    if (guy && guy.twitchEmotes) {


        console.log(args.code);

        var e = guy.twitchEmotes._first(em=> em.code == args.code);

        if(e == null)
            e = APP.defaultEmotes._first(em=> em.code == args.code);

        if(e != null){
            if (e.origin == '7tv')
                var url = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
            if(e.origin == 'bttv')
                var url = `https://cdn.betterttv.net/emote/${e.id}/2x`;
            if(e.origin == 'ffz')
                var url = `https://cdn.frankerfacez.com/emoticon/${e.id}/${e.size}`;
            if(e.origin == 'twitch')
                var url = `https://static-cdn.jtvnw.net/emoticons/v1/${e.id}/2.0`;

            fetch(url).then(res => res.arrayBuffer()).then(data => {
                req.emit('any', key, { raw: data, emote: e });
            });
        }else{
            req.emit('any', key, false);
        }
    }
};

e.FindEmoteData = function (dal, guy, done) {
    guy.twitchEmotes = {};
    var doneCount = 4 + (!APP.globalTwitchLoaded ? 1 : 0) + (!APP.globalBTTVLoaded ? 1 : 0);
    var doneFunc = function () { if (done && doneCount <= 0) done(); };


    //twitch 
    dal.Get('TwitchToken', {}, function (toks) {
        var tok = toks[0] ? toks[0] : {};
        //tok.access_token = data.access_token;
        //tok.cid = cid;

        //twitch global
        if (!APP.globalTwitchLoaded){
            fetch('https://api.twitch.tv/helix/chat/emotes/global', {
                headers: { 'Authorization': 'Bearer ' + tok.access_token, 'Client-ID': tok.cid }
            })
            .then(res => res.json()).then(data => {
               //console.log(data, tok, 'got global data emote');
                APP.globalTwitchLoaded = true;

                data.data.forEach(em => {
                    var type = em.format[1] === 'animated' ? 'gif' : 'png';
                    APP.defaultEmotes[em.id] = { id: em.id, code: em.name, origin: 'twitch', type };
                });
            }).catch(error => { })
            .finally(() => {
                doneCount--;
                doneFunc();
            });
        }

        //twitch user specific
        fetch('https://api.twitch.tv/helix/chat/emotes?broadcaster_id=' + guy.twitchId, {
            headers: { 'Authorization': 'Bearer ' + tok.access_token, 'Client-ID': tok.cid }
        })
        .then(res => res.json()).then(data => {
            data.data.forEach(em => {
                var type = em.format[1] === 'animated' ? 'gif' : 'png';
                guy.twitchEmotes[em.id] = { id: em.id, code: em.name, origin: 'twitch', type };
            });
        })
        .catch(error => { })
        .finally(() => {
            doneCount--;
            doneFunc();
        });
    });

    //7tv
    fetch(`https://7tv.io/v3/users/twitch/${guy.twitchId}`, {
        headers: { 'Content-Type': 'application/json' },
    }).then(res => res.json()).then(data => {
        if (data && data.emote_set && data.emote_set.emotes) {
            data.emote_set.emotes.forEach(em => {
                var type = em.data.animated ? 'webp' : 'png';
                guy.twitchEmotes['ttv'+em.id] = { id: em.id, code: em.name, origin: '7tv', type };
            });
        }
    })
    .catch(error => { })
    .finally(() => {
        doneCount--;
        doneFunc();
    });

    //ffz
    fetch('https://api.frankerfacez.com/v1/room/' + guy.name.toLowerCase(), {
        headers: { 'Content-Type': 'application/json'},
    }).then(res => res.json()).then(data => {
        if (data && data.sets) {
            data.sets[data.room.set].emoticons.forEach(em => {
                guy.twitchEmotes['ffz'+em.id] = { id: em.id, code: em.name, origin: 'ffz', size: em.urls.length > 1 ? 2 : 1, };
            });
        }
    })
    .catch(error => { })
    .finally(() => {
        doneCount--;
        doneFunc();
    });

    //bttv globals
    if(!APP.globalBTTVLoaded){

        fetch('https://api.betterttv.net/3/cached/emotes/global', {
            headers: { 'Content-Type': 'application/json' },
        }).then(res => res.json()).then(data => {
            //console.log(data, 'bttv globals loaded ehre');
            APP.globalBTTVLoaded = true;

            if (data) {
                data.forEach(em => {
                    APP.defaultEmotes[em.id] = { id: em.id, code: em.code, origin: 'bttv', type: em.imageType };
                });
            }
        }).catch(error => { })
        .finally(() => {
            doneCount--;
            doneFunc();
        });
    }

    //bttv emotes
    fetch('https://api.betterttv.net/3/cached/users/twitch/' + guy.twitchId, {
        headers: { 'Content-Type': 'application/json' },
    }).then(res => res.json()).then(data => {
        if (data && data.channelEmotes) {
            data.channelEmotes.forEach(em => {
                guy.twitchEmotes[em.id] = { id: em.id, code: em.code, origin: 'bttv', type: em.imageType };
            });
            data.sharedEmotes.forEach(em => {
                guy.twitchEmotes[em.id] = { id: em.id, code: em.code, origin: 'bttv', type: em.imageType, };
            });
        }
    })
    .catch(error => { })
    .finally(() => {
        doneCount--;
        doneFunc();
    });
}


APP.defaultEmotes = {

};