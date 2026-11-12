//Game Util & Game State

var GU = {

    colors: ['#0abab5', '#7a93ff', '#b569ff', '#ff7ad5', '#ff8668', '#ffcb6a', '#a7ff78'],
    isBottom: true,

    Init: function () {
        //create background-box
        //create guy

        /* 
            make a color-picker tool?

            Font-Color
            Bar-Color, name, emote, 
            Title

            defaults
            save scores


            - add options
            - change score
            - latest: user + what they voted
        */

        console.log('gu init???');

        setTimeout(function(){
            //G.InitLoad('guy1', 'g_guy', { spx: G.bounds.max.x - 200, spy: G.bounds.max.y - 200 });

            //bottom left
            GU.CreateGuy();
        },1500)
    },

    CreateGuy: function(){
        var x = G.bounds.min.x + 20;
        var y = G.bounds.max.y - 40;
        GU.isBottom = true;

        if (GU.settings.pollPosition != null) {
            if (GU.settings.pollPosition == 'BottomRight') {
                GU.isBottom = true;
                x = G.bounds.max.x - 740;
                y = G.bounds.max.y - 40;
            }
            if (GU.settings.pollPosition == 'TopRight') {
                GU.isBottom = false;
                x = G.bounds.max.x - 740;
                y = G.bounds.min.y + 90;
            }
            if (GU.settings.pollPosition == 'TopLeft') {
                GU.isBottom = false;
                x = G.bounds.min.x + 20;
                y = G.bounds.min.y + 90;
            }
        }

        G.guy = G.InitLoad('guy1', 'g_guy', {
            spx: x, spy: y,
        });
    },

    Contribute: function(vote, amount, twitch){
        var r = GU.settings.pollRunners._first(x=> x.name.toLowerCase() == vote.toLowerCase());
        if(r){
            r.score = Number(Number(r.score) + Number(amount));
            GU.settings.pollLastVote = vote.toLowerCase();
            GU.settings.pollLastVoteTwitch = twitch;

            ioLogin.Call('PollSave', {TWITCH, 
                pollRunners: GU.settings.pollRunners,
                pollLastVote: GU.settings.pollLastVote,
                pollLastVoteTwitch: GU.settings.pollLastVoteTwitch
            }, function(){
            });

            GU.Update(vote.toLowerCase());
        }
    },

    Update: function(vote){
        if(G.guy){
            G.RemoveObject_(G.guy);
            GU.CreateGuy();

            setTimeout(function(){
                if(vote)
                    G.guy.ToggleAnimation('score'+vote, true);
            },200)
            
        }
    }

};
if (typeof exports !== 'undefined')
    module.exports = GU;
