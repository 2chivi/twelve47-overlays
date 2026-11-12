
var ServerLoc = 'https://twelve47.com/';

$(function(){
    
    ioLogin = new API(loadData.PORT, loadData.IP);
    UT.Extensions();
    M.Init();
    M.Dad = ReactDOM.render(<Dad />, document.getElementById('root'));
});


var M = {

    Init: function(){
        setTimeout(function () {
            CG.Init();
        }, 200);
    },

}

