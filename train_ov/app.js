
API = require('./p1_core/server/api');
io = require('socket.io-client');
PORT = process.env.PORT ? process.env.PORT : 3100;
GPATH = __dirname;
PublishMode = true;
APP = { guys: new Map(), typeName: 'train' };

TWITCH = process.env.TWITCH ? process.env.TWITCH : 'your_twitch';
https = require('https'); //twitch interface
request = require('request')
seedrandom = require('seedrandom');
dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'))
//Emote = require('./p8_emote/server/emote');

ANALY = require('./p1_core/server/analy');
cp = require("child_process");

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
        if (PublishMode)
            ANALY.Init();

            /*
        if (!PublishMode) {
            APP.guys.set(TEST_USER, { twitch: TEST_USER, twitchId: TEST_USERID, name: TEST_USER });

            dal.Connect(mongoc, dbstring, function () {
                Emote.FindEmoteData(dal, APP.guys.get(TEST_USER));
            });
        }*/

        clearInterval(APP.ttUpdate);
        APP.ttUpdate = setInterval(function () {
            //if(PublishMode)
                APP.Update(dal);
        }, 5500);

        APP.Update(dal);
    };
};

APP.Update = function (dal) {
    APP.LastUpdateCall = Date.now();

    dal.Connect(mongoc, dbstring, function () {
        var search = { 'activetrain': true };
        var fields = PublishMode ? { twitch: 1, id: 1, InActive: 1, AppTicks: 1 } : {};
        if(!PublishMode){
            fields = {}; //allow all data for testing - no streamData from 1247site
            search = { twitch: TEST_USER };
        }

        dal.Select('streamer', search, fields, function (guys) {

            guys._each(g => {
                var appGuy = APP.guys.get(g.twitch);

                if(!PublishMode)
                    g.InActive = false;

                if (!appGuy && g.InActive == false) {
                    var time = Date.now();
                    var activeBuffer = 1000 * 60 * 15; //15 minutes

                    //new inactive system checks individual apps.
                    if ((!g.AppTicks || !PublishMode) || (g.AppTicks[APP.typeName] != null && (time - g.AppTicks[APP.typeName]) < activeBuffer)) {
                        var gdata = { twitch: g.twitch, twitchId: g.id, name: g.twitch };

                        if (!PublishMode)
                            gdata.streamer = g;

                        APP.guys.set(g.twitch, gdata);
                        //Emote.FindEmoteData(dal, APP.guys.get(g.twitch));
                        if (PublishMode && APP.guys.size % 5 == 0)
                            App.Discord("train add: " + g.twitch + " total: " + APP.guys.size, false);
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
