var e = exports;

e.Update = function (req, dal, key, args, done) {
    if (PublishMode && (Date.now() - APP.LastUpdateCall > 1200))
        APP.Update(dal);
    req.emit('any', key, {});

    var guy = APP.guys.get(args[0]);

    if(guy){
        dal.Get('streamer', { 'twitch': args[0] }, function (guys) {
            var streamer = guys[0];

            if (streamer) {
                guy.streamer = streamer;
                if(guy.sock)
                    guy.sock.emit('UpdateSettings', { streamer, firstLoad: false });
            }
        });
    }
};

e.Setup = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args);
    if(guy){
        guy.sock = req;

        dal.Get('streamer', { 'twitch': args }, function (guys) {
            var streamer = guys[0];

            if(streamer){
                guy.streamer = streamer;
                req.emit('UpdateSettings', {streamer, firstLoad: true});
            }
        });
    }
}

