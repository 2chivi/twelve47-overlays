var e = exports;

e.TwitchId = function (req, dal, key, args, done) {
    req.emit('any', key, APP.TwitchId);
};

e.Update = function (req, dal, key, args, done) {
    if (PublishMode && (Date.now() - APP.LastUpdateCall > 2000))
        APP.Update(dal);
    req.emit('any', key, {});
};

//need to change this
e.NeedsReset = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);
    if(guy)
        guy.needsReset = true;

    req.emit('any', key, true);
};

e.ResetPage = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);
    if (guy)
        guy.needsReset = true;

    req.emit('any', key, true);
};

e.Test = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args);
    if(guy){
        guy.testTrain = true;
        req.emit('any', key, true);
    }else{
        req.emit('any', key, null);
    }
};

e.CustomFiles = function (req, dal, key, args, done) {
    dal.Get('files', { 'twitch': args }, function (files) {
        req.emit('any', key, files);
    });
};

/*()
e.EventSubSetup = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if (guy) {
        dal.Get('streamer', { 'twitch': args[0] }, function (guys) {
            var streamer = guys[0];
            if (!streamer) return;

            var token = streamer.token;

            var header = {
                "Content-Type": "application/json",
                "Client-ID": APP.cid,
                "Authorization": "Bearer " + token
            };

            //GET SUBS
            App.request({
                url: 'https://api.twitch.tv/helix/eventsub/subscriptions',
                header: header,
            }, function (data) {

                if (!data || !data.data)
                    return;

                for (var i = 0; i < data.data.length; i++) {
                    //DELETE EXISTING SUBS
                    App.request({
                        url: 'https://api.twitch.tv/helix/eventsub/subscriptions?id=' + data.data[i].id,
                        method: 'DELETE',
                        header: header
                    }, function () { });
                }
                //CREATE NEW SUB FROM WEBSOCKET INFO
                App.request({
                    url: 'https://api.twitch.tv/helix/eventsub/subscriptions',
                    method: 'POST',
                    header: header,
                    postData: {
                        type: 'channel.hype_train.progress',
                        version: 1,
                        condition: { broadcaster_user_id: streamer.id }, //streamer.id
                        transport: {
                            method: 'websocket',
                            session_id: args[1]
                        }
                    }
                }, function (data) {
                    req.emit('any', key, 'setup_good');
                });

            });

        });
    }
};*/
/*
e.TrainData = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if (guy) {
        var twitchId = args[1];
        var info = {};

        if (!PublishMode)
            twitchId = guy.streamer.id;
        if (guy.streamer)
            info.streamer = guy.streamer;


        info.testTrain = guy.testTrain;
        info.needsReset = guy.needsReset;

        guy.testTrain = false;
        guy.needsReset = false;


        req.emit('any', key, info);
    }
};*/


e.TrainData = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if(guy){
        var twitchId = args[1];
        var token = args[2];

        if(!PublishMode){
            twitchId = guy.streamer.id;
            token = guy.streamer.token;
        }

        //https module???
        request({
            url: 'https://api.twitch.tv/helix/hypetrain/events/?broadcaster_id=' + twitchId,// + myGuy.id,
            headers: { 'Authorization': 'Bearer ' + token, 'Client-ID': APP.cid },
            timeout:2500,
            dataType: 'json',
        }, function (er, res, info) {

            if(er != null)
                return;

            try{
                info = JSON.parse(info);

                info.testTrain = guy.testTrain;
                info.needsReset = guy.needsReset;

                guy.testTrain = false;
                guy.needsReset = false;

                if (guy.streamer)
                    info.streamer = guy.streamer;


                if (info.data && info.data.length > 0) {
                    info.data[0].event_data.startTime = dayjs.utc(info.data[0].event_data.started_at).valueOf()
                    info.data[0].event_data.endTime = dayjs.utc(info.data[0].event_data.expires_at).valueOf()
                }

                req.emit('any', key, info);
            }catch(e){}

        });
    }
};

e.TrainStatus = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if(guy){
        var twitchId = args[1];
        var token = args[2];

        if(!PublishMode){
            twitchId = guy.streamer.id;
            token = guy.streamer.token;
        }

        request({
            url: 'https://api.twitch.tv/helix/hypetrain/status?broadcaster_id=' + twitchId,
            headers: { 'Authorization': 'Bearer ' + token, 'Client-ID': APP.cid },
            timeout:2500,
            dataType: 'json',
        }, function (er, res, info) {

            if(er != null)
                return;

            try{
                info = JSON.parse(info);

                info.testTrain = guy.testTrain;
                info.needsReset = guy.needsReset;

                guy.testTrain = false;
                guy.needsReset = false;

                if (guy.streamer)
                    info.streamer = guy.streamer;

                if (info.data && info.data.length > 0 && info.data[0].current) {
                    info.data[0].current.startTime = dayjs.utc(info.data[0].current.started_at).valueOf();
                    info.data[0].current.endTime = dayjs.utc(info.data[0].current.expires_at).valueOf();
                }

                req.emit('any', key, info);
            }catch(e){}

        });
    }
};