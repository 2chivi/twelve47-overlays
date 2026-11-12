
var ServerLoc = 'https://twelve47.com/';

$(function(){
    ioLogin = new API(loadData.PORT, loadData.IP);
    UT.Extensions();
    MAIN.Init();
    MAIN.Dad = ReactDOM.render(<Dad />, document.getElementById('root'));
});


var MAIN = {

    Init: function(){
        setTimeout(function () {
            CG.Init();
        }, 200);
    },
}

