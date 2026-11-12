
API = require('./p1_core/server/api');
PORT = process.env.PORT ? process.env.PORT : 3100;
GPATH = __dirname;
PublishMode = false;
APP = { guys: new Map() };

TWITCH = process.env.TWITCH ? process.env.TWITCH : 'your_twitch';
request = require('request')
tmi = require('tmi.js'); //twitch interface
seedrandom = require('seedrandom');

TEST_USER = 'your_twitch'; //your_twitch
TEST_USERID = 29734255; //29734255  26551727  28141853

setTimeout(function(){
    Init();
},50);

//deployment procedues: 
/*
    node_modules/planck-js/lib/Solver.js + World + Contact  edits
    PublishMode on
    Editor commented out M.Dad
    https://twelve47studios.com?twitch=your_twitch   (your_twitch doesnt have emotes)
*/

var Init = function(){
    require('./p1_core/server/coreApp');
    console.log(PORT);
    console.log(TWITCH);
    APP.cid = PublishMode ? 'YOUR_TWITCH_CLIENT_ID' : 'YOUR_DEV_TWITCH_CLIENT_ID';
    APP.secret = PublishMode ? 'YOUR_TWITCH_CLIENT_SECRET' : 'YOUR_DEV_TWITCH_CLIENT_SECRET';


    APP.LastUpdateCall = Date.now();

    App.OnLoad = function (dal) {

        if (!PublishMode) {
            APP.guys.set(TEST_USER, { twitch: TEST_USER, twitchId: TEST_USERID, name: TEST_USER });
        }

        clearInterval(APP.ttUpdate);
        APP.ttUpdate = setInterval(function () {
            if (PublishMode)
                APP.Update(dal);
        }, 5500);
    };

    APP.UID_ = function () {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var uid = "";
        for (var i = 0; i < 3; i++)
            uid += chars[Math.floor(Math.random() * chars.length)];
        return uid;
    };
};

APP.Update = function (dal) {
    APP.LastUpdateCall = Date.now();

    dal.Connect(mongoc, dbstring, function () {
        dal.Select('streamer', { 'activewheel': true }, { twitch: 1, id: 1, InActive: 1 }, function (guys) {
            guys._each(g => {
                var appGuy = APP.guys.get(g.twitch);
                if (!appGuy && g.InActive == false) {
                    APP.guys.set(g.twitch, { twitch: g.twitch, twitchId: g.id, name: g.twitch });

                    App.Discord("wheel add: " + g.twitch + " total: " + APP.guys.size, false);
                }
            });

            APP.guys.forEach((ag, key) => {
                var sguy = guys._first(sg => sg.twitch == ag.twitch);
                if (!sguy || sguy.InActive) {
                    APP.guys.delete(key);
                    App.Discord("wheel remove: " + ag.twitch + " total: " + APP.guys.size, false);
                }
            });
        });
    });
}
