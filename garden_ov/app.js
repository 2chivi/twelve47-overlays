PublishMode = true;
Minify = false;

API = require('./1_core/server/api');
PORT = process.env.PORT ? process.env.PORT : 3100;
GPATH = __dirname;

APP = { guys: new Map(), typeName:'garden', subs: new Map() };

TWITCH = process.env.TWITCH ? process.env.TWITCH : 'your_twitch';
//request = require('request'); // use https instead? https://blog.logrocket.com/5-ways-to-make-http-requests-in-node-js/
https = require('https'); //twitch interface
seedrandom = require('seedrandom');
WebSocket = require('ws');

TEST_USER = 'your_twitch'; //your_twitch
TEST_USERID = 29734255; //29734255  26551727  28141853

setTimeout(function(){
    console.log(process.version);
    console.log(TWITCH, PORT);
    Init();
},50);


var Init = function(){
    require('./1_core/server/coreApp');
    console.log(PORT);
    console.log(TWITCH);
    APP.cid = PublishMode ? 'YOUR_TWITCH_CLIENT_ID' : 'YOUR_DEV_TWITCH_CLIENT_ID';
    APP.secret = PublishMode ? 'YOUR_TWITCH_CLIENT_SECRET' : 'YOUR_DEV_TWITCH_CLIENT_SECRET';

    APP.LastUpdateCall = Date.now();

    App.OnLoad = function (dal) {







        clearInterval(APP.ttUpdate);
        APP.ttUpdate = setInterval(function () {
            APP.Update(dal);
        }, 5500);
        APP.Update(dal);
        
    };
};


APP.GetSubs = async function(streamer){
     var res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + streamer.token,
            'Content-Type': 'application/json',
            'Client-Id': APP.cid
        },
    });

    res = await res.json();

    return new Promise((resolve, rej) => { resolve(res.data); });
}

APP.DeleteOldSubs = async function(streamer){
    var subs = await APP.GetSubs(streamer);

    if(Array.isArray(subs)){
        for (var i = 0; i < subs.length; i++) {
            var sub = subs[i];

            await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + streamer.token,
                    'Content-Type': 'application/json',
                    'Client-Id': APP.cid
                },
                body: JSON.stringify({ id: sub.id })
            });
        }
    }


    return new Promise((resolve, rej) => { resolve(); });
}

//adds an eventsub. + getall & delete old eventsubs
APP.UpdateEventSubs = function(streamer, done){
    var broadcasterId = streamer.id;
    var token = streamer.token;

    APP.DeleteOldSubs(streamer).then(()=>{
        var ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws', {
            'Client-ID': APP.cid,
            'Authorization': `Bearer ${token}`
        });

        ws.on('open', function (data) {
            console.log('Connected to Twitch WebSocket', data);
        });

        ws.addEventListener('error', (e) => { console.log(e, 'error'); })

        ws.on('message', function (data) {
            //console.log(data.toString())
            var data = JSON.parse(data.toString());

            if (data && data.payload.event) {
                done(data.payload.event.user_name);
                console.log(data.payload.event.user_name);
            }

            if (data && data.payload.session && !APP.subs.has(broadcasterId)) {
                var sessionId = data.payload.session.id;
                console.log(sessionId);
                console.log('subscribing to follwoers');

                //create follower subscription
                fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json',
                        'Client-Id': APP.cid
                    },
                    body: JSON.stringify({
                        type: 'channel.follow',
                        condition: { "broadcaster_user_id": broadcasterId, moderator_user_id: broadcasterId },
                        version: '2',
                        transport: {
                            "method": "websocket",
                            session_id: sessionId
                        },
                    })
                }).then(res => res.json()).then(data => {
                    //console.log(data)
                    if (data[0]) {
                        var subId = data[0].id;
                        APP.subs.set(broadcasterId, subId);
                        console.log(data[0].id);
                    }
                });
            }
        });
    });
}

APP.Update = function (dal) {
    APP.LastUpdateCall = Date.now();

    dal.Connect(mongoc, dbstring, function () {
        var search = {};
        if(PublishMode)
            search[`active${APP.typeName}`] = true;
        else
            search.twitch = TEST_USER;

        var fields = PublishMode ? { twitch: 1, id: 1, InActive: 1, AppTicks: 1 } : {};

        dal.Select('streamer', search, fields, function (guys) {
            guys._each(g => {
                var appGuy = APP.guys.get(g.twitch);

                if (!PublishMode)
                    g.InActive = false;

                if (!appGuy && g.InActive == false) {
                    var time = Date.now();
                    var activeBuffer = 1000 * 60 * 15; //15 minutes

                    //new inactive system checks individual apps.
                    if ((!g.AppTicks || !PublishMode) || (g.AppTicks[APP.typeName] != null && (time - g.AppTicks[APP.typeName]) < activeBuffer)){

                        console.log('update event subs - ', g.twitch);

                        APP.UpdateEventSubs(g, function (follower) {
                            console.log('follower: ', follower);
                            var guy = APP.guys.get(g.twitch);
                            if (guy && guy.sock) {
                                guy.sock.emit('NewFollower', { name: follower });
                            }
                        });

                        APP.guys.set(g.twitch, {
                            token: g.token,
                            twitch: g.twitch,
                            twitchId: g.id,
                            name: g.twitch,
                        });
                        if (PublishMode && APP.guys.size % 3 == 0)
                            App.Discord(`${APP.typeName} add: ` + g.twitch + " total: " + APP.guys.size, false);

                    }
                }
            });

            APP.guys.forEach((ag, key) => {
                var sguy = guys._first(sg => sg.twitch == ag.twitch);
                if (!sguy || sguy.InActive) {
                    APP.guys.delete(key);
                }
            });
        });
    });
}
