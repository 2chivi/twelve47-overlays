
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

        ioLogin.Sock.on('UpdateSettings', function(sdata){
            var data = sdata.streamer;

            GU.settings = Object.assign(defaults.poll, data);
            
            console.log('update settings', sdata);
            if(!sdata.firstLoad){
                return top.location.reload(true);
            }

            console.log(TWITCH, 'connecting to tmi client')

            CG.tc = new tmi.Client({
                connection: { secure: true, reconnect: true },
                channels: [TWITCH],
            });
            CG.tc.on('cheer', function (channel, userstate, message) {
                var words = message.split(' ');
                var word = null;
                console.log(channel, userstate, message);
                console.log(words);


                words._each(w=>{
                    if(!w.toLowerCase().includes('cheer'))
                        word = w;
                });
                console.log(word);


                if(words && word){
                    console.log('call contribute', word, Number(userstate.bits), userstate.username);
                    GU.Contribute(word, Number(userstate.bits), userstate.username.toLowerCase());
                }
            });


            CG.tc.connect();


            ioLogin.Call('InitEmoteData', TWITCH, function () {
                
                if(!GU.settings.pollRunners || GU.settings.pollRunners.length == 0){
                    return Notify.alert('No Poll Options.  Create Poll at Twelve47.com', 9999);
                }


                var emotes = GU.settings.pollRunners._select(x=> x.emote);

                console.log('got emote data.. asking for emotes', emotes.length)

                var dc = new UT.DoneCollector(emotes.length);
                dc.allDone(function(){
                    console.log('cg init')
                    CG.Init();
                })

                //emotes.push('CHEATING');

                emotes._each(em=>{
                    EM.FetchEmote(em, TWITCH, function(success){
                        console.log('done fetch emote', success)
                        dc.done()();

                        console.log(dc);

                        if(!success){
                            if(em)
                                Notify.alert('Emote Not Found (no animated emotes) (should be added to your twitch/7tv/bttv acct): ' + em)
                        }
                    });
                })
            });
        });

        setTimeout(function(){
            //GU.Contribute('Dogs', 100, 'Batman');
        },15000)

    },

}

