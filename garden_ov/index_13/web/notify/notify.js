
var Notify = {

    alert: function(msg, time){
        var newDiv = document.createElement("div");

        newDiv.className = 'con-alert';
        newDiv.innerHTML = msg;

        document.body.appendChild(newDiv);

        setTimeout(function(){
            document.body.removeChild(newDiv);
        }, (time != null ? time : 2500))
    }

}