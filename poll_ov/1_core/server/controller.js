var e = exports;

e.First = function (req, dal, key, args, done) {
    var guy = APP.guys.get(args);
    if(guy)
        guy.sock = req;

    req.emit('any', key, {});
};