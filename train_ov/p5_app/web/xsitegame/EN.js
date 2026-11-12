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

    Parts: new Map(),
    Objs: new Map(),

    //maxes out at 21.  122(end alphabet) - 100(#s)
    // "x" denotes a possible action on YOU from server
    KeyCodes: new Map([
        [1, 'KeyRight'], [2, 'KeyLeft'], [3, 'KeyUp'], [4, 'KeyDown'],
        [5, 'KeySpace'], [6, 'Mouse1'], [7, 'Mouse2'], [8, 'KeyE'],
        [9, 'KeyQ'], [10, 'x1'], [11, 'x2'], [12, 'x3'],
        [13, 'x4'], [14, 'x5'], [15, 'x6'], [16, 'x7'],
        [17, 'x8'], [18, 'x9'], [19, 'x10'], [20, 'x11'],
        [21, 'x12'],
    ]),
    KeyMap: new Map([//needed for o(1) time lookup
        ['KeyRight',1], ['KeyLeft',2], ['KeyUp',3], ['KeyDown',4],
        ['KeySpace',5], ['Mouse1',6], ['Mouse2',7], ['KeyE',8],
        ['KeyQ',9], ['x1',10], ['x2',11], ['x3',12],
        ['x4',13], ['x5',14], ['x6',15], ['x7',16],
        ['x8',17], ['x9',18], ['x10',19], ['x11',20],
        ['x12',21],
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