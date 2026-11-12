//Game Util & Game State

var GU = {

    peeps: new Map(),
    subs: [],

    TestTrain() {
        if (CG.ready) {
            GU.StartTrain(true);
            CG.activeTrain = true;
            CG.testing = true;

            for (var i = 0; i < 6; i++) {//6
                G.TickFunc(G.Tick + 30 + 80 * i, i, function (it) {//200
                    var query = new URLSearchParams(window.location.search);
                    var TWITCH = query.get('twitch');
                    if (!TWITCH)
                        TWITCH = 'your_twitch';

                    var type = UT.ran(['sub', 'bit', 'gift']);
                    var name = it == 1 ? TWITCH.toLowerCase() : 'test_user' + it;

                    GU.NewContribution(name, 123, type, 500, true);
                });
            }

            setTimeout(function () {

                EM.FetchEmote('BibleThump', TWITCH, function (success) {
                    GU.peeps.get('test_user0').emoteName = 'BibleThump';
                });
            }, 10000);

            clearTimeout(GU.ttStop);
            GU.ttStop = setTimeout(function () {
                if (CG.testing) {
                    GU.EndTrain(function () { });
                    CG.activeTrain = false;
                    CG.testing = false;
                }
            }, 40000);//40000
        }
    },

    StartTrain(test) {
        console.log('try to remove???');
        G.Objs.forEach(ob => { G.RemoveObject_(ob); });
        GU.peeps.clear();
        GU.cart = null;
        GU.train = null;
        CG.testing = test;

        setTimeout(function () {
            G.InitAndLoad('train', "g_dude", {});

            G.TickFunc(G.Tick + 60, function () {
                CG.sxTrain.play();
            })

            G.TickFunc(G.Tick + 7, function () {
                GU.train = G.Objs.get('train');

                G.TickFunc(G.Tick + 2, function () {
                    if (!GU.cart) {
                        GU.addingCart = true;
                        GU.AddCart(function () {
                            GU.addingCart = false;
                        });
                    }

                    GU.subs._each(s => {

                        if (Date.now() < (s.time + (5 * 60 * 1000))) {
                            GU.NewContribution(s.name, s.id, s.subType, s.amount, true);
                            console.log('older donation success ');
                            console.log(GU.train.pos);
                        }
                    });
                });
            })

        }, 500);
    },

    EndTrain(done) {
        if (GU.train)
            GU.train.targetX = 26000;
        setTimeout(function () {
            GU.peeps.clear();
            G.Objs.forEach(ob => { G.RemoveObject_(ob); });
            GU.cart = null;
            GU.train = null;
            //GU.subs = [];
            done();
        }, 25000);
    },

    NewContribution(name, id, subType, amount = 100, queued = false) {
        var cont = { name, id, subType, amount, time: Date.now() };
        if (!queued)
            GU.subs._queue(cont, 150);


        if (GU.train && GU.train.pos) {

            var peep = GU.peeps.get(name);
            var newGuy = peep == null;
            var needNewCart = newGuy && GU.cart != null && GU.cart.peep1 && GU.cart.peep2;

            if (needNewCart && !GU.addingCart) {
                GU.addingCart = true;
                GU.AddCart(function () {
                    GU.addingCart = false;
                });
            }

            if (needNewCart || (!needNewCart && GU.addingCart)) {
                G.TickFunc(G.Tick + 2, function () {
                    console.log('recrusive', name);
                    GU.NewContribution(name, id, subType, amount, true);
                });
            } else if (!needNewCart) {

                if (newGuy)
                    GU.peeps.set(name, { name, id, amount: 0 });

                peep = GU.peeps.get(name);
                peep.amount += amount;

                if (!peep.car) {
                    peep.car = G.InitAndLoad(G.UID_(), "g_sub",
                        { spx: GU.train.pos.x, spy: GU.train.pos.y - 200, subType: subType, amount: amount });
                    G.TickFunc(G.Tick + 1, function () { G.SortGraphics(); })

                    if (newGuy && GU.cart) {
                        if (!GU.cart.peep1)
                            GU.cart.peep1 = peep;
                        else if (!GU.cart.peep2)
                            GU.cart.peep2 = peep;
                    }
                }
            }
        }
    },

    AddCart(done) {
        var newCart = G.InitAndLoad('cartt' + G.UID_(), "g_cart", {});

        G.TickFunc(G.Tick + 1, newCart, function (cart) {
            if (GU.train)
                GU.train.targetX = Math.min(G.bounds.max.x - 100, GU.train.targetX + 50);
            cart.leader = GU.train;
            if (GU.cart)
                GU.cart.leader = cart;
            GU.cart = cart;
            done();
        })
    }

};
if (typeof exports !== 'undefined')
    module.exports = GU;