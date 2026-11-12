PublishMode = true;
Minify = false;

API = require('./1_core/server/api');
PORT = process.env.PORT ? process.env.PORT : 3100;
GPATH = __dirname;

APP = { guys: new Map(), typeName:'poll' };

TWITCH = process.env.TWITCH ? process.env.TWITCH : 'your_twitch';
//request = require('request'); // use https instead? https://blog.logrocket.com/5-ways-to-make-http-requests-in-node-js/
https = require('https'); //twitch interface
seedrandom = require('seedrandom');

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


APP.Update = function (dal) {
    APP.LastUpdateCall = Date.now();

    dal.Connect(mongoc, dbstring, function () {
        var search = {};
        if(PublishMode)
            search[`active${APP.typeName}`] = true;
        else
            search.twitch = TEST_USER;

        var fields = PublishMode ? { twitch: 1, id: 1, InActive: 1 } : {};

        dal.Select('streamer', search, fields, function (guys) {
            guys._each(g => {
                var appGuy = APP.guys.get(g.twitch);

                if (!PublishMode)
                    g.InActive = false;

                if (!appGuy && g.InActive == false) {

                    APP.guys.set(g.twitch, { 
                        twitch: g.twitch, 
                        twitchId: g.id, 
                        name: g.twitch,
                    });
                    if (PublishMode && APP.guys.size % 5 == 0)
                        App.Discord(`${APP.typeName} add: ` + g.twitch + " total: " + APP.guys.size, false);
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
