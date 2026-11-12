var EN = {

    Curves: new Map([
        ['linear',0],['sin',1],['quad',2],['cubic',3]
    ]),
    Shapes: new Map([
        ['edge',0],['circle',1],['rect',2],['poly',3]
    ]),
    Btns: new Map([
        [1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],
        ['right',9],['left',10],['down',11],['up',12]
    ]),
    BodyTypes: new Map([
        ['static', 0], ['dynamic', 1]
    ]),

    ItemTypes: new Map([
        ['i_punch', 0], ['i_arrow', 1], ['i_arrow', 2]
    ]),

    DudeTypes: new Map([
        ['Platform', 0], ['TopDown', 1], ['Tank', 2]
    ]),
    
    Parts: new Map(),
    Objs: new Map(),

    //maxes out at 21.  122(end alphabet) - 100(#s)
    // "x" denotes a possible action on YOU from server
    KeyCodes: new Map([
        [1, 'KeyRight'], [2, 'KeyLeft'], [3, 'KeyUp'], [4, 'KeyDown'],
        [5, 'KeySpace'], [6, 'Mouse1'], [7, 'Mouse2'], [8, 'KeyE'],
        [9, 'KeyQ'], [11, 'x1'], [12, 'x2'], [14, 'x3'],
        [15, 'x4'], [16, 'x5'], [17, 'x6'], [18, 'x7'],
        [19, 'x8'], [20, 'x9'], [21, 'x10'],
    ]),
    KeyMap: new Map([//needed for o(1) time lookup
        ['KeyRight',1], ['KeyLeft',2], ['KeyUp',3], ['KeyDown',4],
        ['KeySpace',5], ['Mouse1',6], ['Mouse2',7], ['KeyE',8],
        ['KeyQ',9], ['x1',11], ['x2',12], ['x3',14],
        ['x4',15], ['x5',16], ['x6',17], ['x7',18],
        ['x8',19], ['x9',20], ['x10',21],
    ]),

    G: function(obj, key){
        return EN[obj].get(key)
    },
    /*
        KeyRight: 1, KeyLeft: 2, KeyUp: 3, KeyDown: 4,
        KeySpace: 5, Mouse1: 6, Mouse2: 7, KeyE: 8, KeyQ: 9,
        x1: 10, x2: 11, x3: 12, x4: 13, x5: 14, x6: 15,  x7: 16,
        x8: 17, x9: 18, x10: 19, x11: 20, x12: 21 
    }),*/
};
if (typeof exports !== 'undefined')
    module.exports = EN;