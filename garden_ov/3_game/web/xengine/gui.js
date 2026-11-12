
var GUI = {

    Init: function(){
        return;
        document.querySelector('#other').innerHTML += `
            <div class='gui'>test</div>
        `;

        var divs = ``;

        G.Objs._each(ob => {

            if(!ob.parentObj){
                divs += `<div class='div-ob'>
                    ${ob.oid}
                    <div class='div-con'>
                        <div class='btn' onclick="GUI.dx(-15,'${ob.oid}')">-</div>
                        <div class='btn' onclick="GUI.dx(15,'${ob.oid}')">+</div>
                        <div class='btn' onclick="GUI.da(-0.1,'${ob.oid}')">-</div>
                        <div class='btn' onclick="GUI.da(0.1,'${ob.oid}')">+</div>
                    </div>
                </div>`;
            }
        });

        document.querySelector('.gui').innerHTML = `
            ${divs}
        `;
    },

    da: function (da, oid) {
        var ob = G.Objs.get(oid);
        ob.SetPos(null, null, ob.con.getAngle()+da);
    },

    dx: function(dx, oid){
        var ob = G.Objs.get(oid);
        ob.SetPos(ob.pos.x + dx, null);
    }

}