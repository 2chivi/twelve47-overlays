var e = exports;

e.Update = function (req, dal, key, args, done) {
    if (PublishMode && (Date.now() - APP.LastUpdateCall > 1200))
        APP.Update(dal);
    req.emit('any', key, {});
};

e.SaveTubeToken = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if(guy){

        ///get streamer, then save
        dal.Get('streamer', { 'twitch': args[0] }, function (guys) {
            var streamer = guys[0];
            streamer.tubeToken = args[1];

            dal.Save('streamer', streamer, function (data) {
                req.emit('any', key, data ? data : null);
            });
        });
    }
};

//create new reward if it doesnt exist?
//hard to test this exactly
/*
e.SetCustomReward = function (streamer) {
    request({
        url: 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + streamer.id,// + myGuy.id,
        headers: { 'Authorization': 'Bearer ' + streamer.token, 'Client-ID': APP.cid },
        dataType: 'json',
    }, function (er, res, info) {
        try {
            info = JSON.parse(info);

            App.Discord('testing 1: ' + JSON.stringify(info), false);


            if(info && info.data){
                //look for Spin Wheel reward

                var reward = info.data._first(x=> x.title.toLowerCase() == 'spin chance wheel');

                App.Discord('testing 2: ' + (reward == null), false);

                if(reward && reward.id){
                    streamer.wheelRewardId = reward.id;
                    dal.Save('streamer', streamer, function (data) { });

                    //edit reward to new reward.
                    if (streamer.wheelPointsToSpin != reward.cost){
                        //
                        request.patch({
                            url: 'https://api.twitch.tv/helix/channel_points/custom_rewards?id=' + reward.id +'&broadcaster_id=' + streamer.id,// + myGuy.id,
                            headers: { 'Authorization': 'Bearer ' + streamer.token, 'Client-ID': APP.cid, 'content-type': 'application/json' },
                            dataType: 'json',
                            body: JSON.stringify({ cost: streamer.wheelPointsToSpin }),
                        }, function (er, res, info) {

                        });
                    }
                }else{
                    //create new reward
                    var cost = streamer.wheelPointsToSpin ? streamer.wheelPointsToSpin : 20000;

                    App.Discord('testing 3 (create): ', false);

                    request.post({
                        url: 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + streamer.id,// + myGuy.id,
                        headers: { 'Authorization': 'Bearer ' + streamer.token, 'Client-ID': APP.cid, 'content-type': 'application/json' },
                        dataType: 'json',
                        body: JSON.stringify({ title: 'Spin Chance Wheel', cost: cost }),
                    }, function (er, res, info) {
                        try {
                            info = JSON.parse(info);
                            App.Discord('testing 4: ' + JSON.stringify(info), false);

                            if(info && info.data){

                                var reward = info.data._first(x => x.title.toLowerCase() == 'spin chance wheel');
                                App.Discord('testing 5: ' + (reward == null), false);

                                if (reward && reward.id) {
                                    streamer.wheelRewardId = reward.id;
                                    dal.Save('streamer', streamer, function (data) { });
                                }
                            }
                        } catch (e) { }
                    });
                }
            }

        } catch (e) { }
    });
};*/
e.AppInfo = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);
    console.log(APP.guys);
    console.log('----');
    console.log(guy);

    if(guy){

        dal.Get('streamer', { 'twitch': args[0] }, function (guys) {
            var streamer = guys[0];
            if(!streamer)return;

            //does this just once
            //e.SetCustomReward(streamer);

            req.emit('any', key, streamer);
        });
    }
};

//on repeat\
e.AppInfoCheck = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if(guy){
        dal.Get('streamer', { 'twitch': args[0] }, function (guys) {
            var streamer = guys[0];

            if(streamer && streamer.wheelRewardId){
                //when to check fro customReward

                request({
                    url: 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?sort=NEWEST&reward_id=' + streamer.wheelRewardId + '&broadcaster_id=' + streamer.id,// + myGuy.id,
                    headers: { 'Authorization': 'Bearer ' + streamer.token, 'Client-ID': APP.cid },
                    dataType: 'json',
                }, function (er, res, info) {
                    try {
                        info = JSON.parse(info);
                        if(info && info.data){
                            req.emit('any', key, { streamer, pointData: info.data });
                        }
                        
                    } catch (e) { }
                });

            }else if(streamer){
                req.emit('any', key, {streamer, pointData: []});
            }
        });
    }
};

e.SaveUser = function (req, dal, key, args, done) {
    var rd = {};

    dal.Get('streamer', { 'loginId': args[0] }, function (guys) {
        var member = guys[0];

        if (member) {
            var streamer = args[1];
            var adminRights = member.access == 'admin' || member.twitch == 'your_twitch';

            //don't allow editing member access.
            if (!adminRights && member.access != null) {
                var restrictedFields = ['access', 'trainPaid', 'wheelPaid', 'streambotPaid', 'trial'];
                restrictedFields._each(f => {
                    if(streamer[f] != null)
                        streamer[f] = member[f];
                });
            }

            if (member.twitch == streamer.twitch || adminRights) {
                dal.Save('streamer', streamer, function (data) {
                    req.emit('any', key, data ? data._id : null);
                });
            }
        }
    });
};

e.SaveWheel = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if (guy && args[1] != null && args[1]._id != null) {
        var wheelData = args[1];

        dal.Save('wheel', wheelData, function (data) {
            req.emit('any', key, data ? data : null);
        });
    }
    //new wheel, vs edit current wheel?
};

e.GetWheels = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args[0]);

    if(guy){
        dal.Get('wheel', { twitch: args[0] }, (wheels) => {

            if (wheels.length == 0){
                var wheel1 = {twitch: args[0], info: [{ pct:1, text:'wheel 1' }]}
                dal.Save('wheel', wheel1, function (data) {  
                    var wheel2 = { twitch: args[0], info: [{ pct: 1, text: 'wheel 2' }] }
                    dal.Save('wheel', wheel2, function (data) { 
                        dal.Get('wheel', { twitch: args[0] }, (wheels) => {
                            req.emit('any', key, wheels ? wheels : []);
                        });

                    });
                });
            }else{
                req.emit('any', key, wheels ? wheels : []);
            }
        });
    }

};

