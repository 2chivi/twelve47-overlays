
var ServerLoc = 'https://twelve47.com/';
var query = new URLSearchParams(window.location.search);
var TWITCH = query.get('twitch') ? query.get('twitch') : 'your_twitch';

window.onload = (event) => {
    UT.Extensions();
    ioLogin = new API(loadData.PORT, loadData.IP);

    setTimeout(function () { MAIN.Init(); }, 250)
};

var MAIN = {

    Init: function(){  
        ioLogin.Call('Setup', TWITCH, function(){ });

        ioLogin.Sock.on('NewFollower', function(data){
            if (data.name != GU.lastFollower && GU.settings.gardenFollowers)
                GU.Water(data.name, 'New Follower');
            GU.lastFollower = data.name;
        });

        ioLogin.Sock.on('UpdateSettings', function(sdata){
            var data = sdata.streamer;
            
            var old = Object.assign({}, defaults.garden, GU.settings);
            if(GU.settings.gardenTree != null && data.gardenTree != old.gardenTree)
                top.location.reload(true);
            
            GU.settings = Object.assign({}, defaults.garden, data);

            CG.Init();
            MAIN.handleTwitch();
        });
    },

    handleTwitch: function(){
        MAIN.tc2 = new tmi.Client({
            connection: { secure: true, reconnect: true },
            channels: [TWITCH],
        });
        MAIN.tc2.connect().then(data => { });

        MAIN.tc2.on('submysterygift', function (channel, gifter, totalGifts) {
            console.log('myst gift happ');
            MAIN.Donation(gifter.toLowerCase(), 'gift', totalGifts);
        });
        MAIN.tc2.on('subgift', function (channel, gifter, streak, recipient, state) {
            MAIN.Donation(gifter.toLowerCase(), 'gift', 1);
        });
        MAIN.tc2.on('subscription', function (channel, username, methods, msg, state) {
            MAIN.Donation(username.toLowerCase(), 'sub', 1);
        });
        MAIN.tc2.on('cheer', function (channel, userstate, message) {
            var total = userstate.bits / 500;
            if (total >= 0.2)
                MAIN.Donation(userstate.username.toLowerCase(), 'bits', total);
        });
    },

    Donation: function(name, type, amount){
        if(GU.watering){
            setTimeout(function () { MAIN.Donation(name, type, amount); }, 500);
        }else{
            var action = 'subscribed';
            if(type == 'gift')
                action = `gifted ${amount} subs`;
            if(type == 'bits')
                action = 'donated bits';
            GU.Water(name, action);
        }
    }
}

