var IsServer = (typeof exports) !== 'undefined';

class API {
    constructor(port, ip, reconnect = true, serverLoc) {
        var t = this;
        t.reconnect = reconnect;
        t.Unique = 0;
        t.DoneFuncs = {};
        t.firstCall = true;
        
        if(serverLoc)
            t.ServerLoc = serverLoc;
        else{
            if (!IsServer && window.location.hostname == 'localhost')
                t.ServerLoc = 'http://localhost:' + port;
            else if (IsServer) {
                t.ServerLoc = 'http://localhost:' + port;
                if (ip)
                    t.ServerLoc = 'http://' + ip + ":" + port;
            }
            else {
                t.ServerLoc = ServerLoc + '?port=' + port;
                if (ip)
                    t.ServerLoc += "&ip=" + ip;
            }
        }
        t.Init();
    }

    Init() {
        var t = this;
        console.log('api con');
        t.Sock = io(t.ServerLoc, { reconnectionDelayMax: 10000, reconnection: t.reconnect, reconnectionDelay: 2000 });

        

        t.Sock.on('any', function (key, args) {
            var df = t.DoneFuncs[key];
            if (df && df.func) {
                t.DoneFuncs[key].func(args);
                delete t.DoneFuncs[key];
            }else{
                console.log(key);
                console.log(t.DoneFuncs);
                console.log('API Sock Failure?')
            }
        });
    }


    Call(method, args, done, fast=false) {
        var t = this;
        var key = t.Unique;
        var time = Date.now();
        t.Unique++;

        //restricts sending a ton of requests on reconnect
        if (!t.Sock.connected && t.Sock.sendBuffer.length > 5)
            t.Sock.sendBuffer = [];

        if (done)
            t.DoneFuncs[key] = { func: done, time, key, method };

        t.Sock.emit('any', method, key, args);

        var removals = [];
        t.DoneFuncs._each(df=> {
            if ((df.time+(1000*60*2)) < time){
                removals.push(df);
            }
        });
        removals._each(r=> { delete t.DoneFuncs[r.key] });
    }
};
if (IsServer) module.exports = API;//LINQ 1.3 : Fix inherit != null

var UT = {};
(function (exp) {
    var t = exp;
    t.Events = {};

    t.ran = function (arr) {
        return arr[Math.floor(arr.length * Math.random())];
    };

    //type = ai..  /core defaults.js
    t.DefaultObject = function(type){
        var newObj = {};
        Object.keys(defaults[type])._each(key=>{
            newObj[key] = defaults[type][key] != null ? defaults[type][key] : null;
        });
        return newObj;
    };

    t.Median = function (arro, order = true) {
        var arr = arro.slice();
        if (order)
            arr = arr._orderBy(x => x);
        var half = Math.floor(arr.length / 2);
        return arr[half];
    }

    t.DoneCollector = class DoneCollector{
        constructor(length, done){
            this.length = length;
            if(done)
                this.done = done;
            this.allData = new Array(length);
        }

        done(index){
            var t = this;
            return function(data){
                t.length--;
                t.allData[index] = data;

                if(t.length <= 0)
                    t.done(t.allData);
            }
        }

        allDone(done){ this.done = done; }
    }

    t.Queue = class Queue {
        constructor() {
            this.data = {};
            this.head = 0;
            this.tail = 0;
            this.length = 0;
        }

        enQ(item, max) {
            this.data[this.tail] = item;
            this.tail++;
            if (this.tail > max)
                this.deQ();

            this.length = this.tail - this.head;
        };

        deQ() {
            let item = this.data[this.head];
            delete this.data[this.head];
            this.head++;

            this.length = this.tail - this.head;
            return item;
        };

        array() {
            return Object.values(this.data);
        }
    }

    t.IQR = function (arro) { //outlier resistance way of telling variance
        if (arro.length == 1) return 0;
        var arr = arro.slice()._orderBy(x => x);
        var half = Math.floor(arr.length / 2);
        var arrTop = arr.splice(0, half);
        var arrBot = arr.splice(-half);

        return t.Median(arrBot, false) - t.Median(arrTop, false);
    };

    //obsolete now, cause of Map
    t.List = function (obj) {
        if (!obj) return [];
        var nlist = [];

        if ('next' in obj) {
            for (var jn = obj; jn; jn = jn.next) nlist.push(jn);
            return nlist;
        }
        if ('m_next' in obj) {
            for (var jn = obj; jn; jn = jn.m_next) nlist.push(jn);
            return nlist;
        }

        return Object.keys(obj).map(function (key) {
            return obj[key];
        });
    };

    t.Extensions = function () {
        //LINQ pseudo.. pick == select
        Array.prototype._select = function (func) {
            return t.Select(this, func);
        };
        Array.prototype._each = function (func) {
            return t.Select(this, func);
        };
        Array.prototype._orderBy = function () {
            return t.OrderBy(this, arguments);
        };
        Array.prototype._max = function (func) {
            return t.Max(this, func, true);
        };
        Array.prototype._min = function (func) {
            return t.Max(this, func, false);
        };
        Array.prototype._avg = function () {
            var sum = 0;
            this._each(x => { sum += x });
            return sum / this.length;
        };
        Array.prototype._where = function (func) {
            return t.Where(this, func);
        };
        Array.prototype._any = function (func) {
            return t.Where(this, func).length > 0;
        };
        Array.prototype._first = function (func) {
            return t.First(this, func);
        };

        Map.prototype._where = function (func) { return t.WhereMap(this, func); };
        Map.prototype._each = function (func) { return t.WhereMap(this, func); };
        Map.prototype._any = function (func) { return (t.WhereMap(this, func).length > 0); };
        Map.prototype._first = function (func) { return t.WhereMap(this, func)[0]; };

        Object.defineProperty(Object.prototype, "_each", {
            value: function (func) { return t.SelectObj(t.List(this), func); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_where", {
            value: function (func) { return t.Where(t.List(this), func); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_any", {
            value: function (func) { return (t.Where(t.List(this), func).length > 0); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_first", {
            value: function (func) { return t.First(t.List(this), func); },
            enumerable: false, writable: true
        });
        Object.defineProperty(Object.prototype, "_orderBy", {
            value: function (func) { return t.OrderBy(t.List(this), arguments); },
            enumerable: false, writable: true
        });
        Object.defineProperty(String.prototype, 'hashCode', {
            value: function () {
                var hash = 0, i, chr;
                for (i = 0; i < this.length; i++) {
                    chr = this.charCodeAt(i);
                    hash = ((hash << 5) - hash) + chr;
                    hash |= 0; // Convert to 32bit integer
                }
                return hash;
            }
        });
    };

    if (typeof $ != 'undefined') {
        $.prototype._select = function (func) {
            return t.Select(this, func);
        };
        $.prototype._onoff = function (e1, e2, e3) {
            if (e3)
                $(this).off(e1, e2).on(e1, e2, e3);
            else
                $(this).off(e1).on(e1, e2);
            return $(this);
        };
    }

    t.Iterate = function (iterable) {

    };

    t.SelectObj = function (objs, func) {
        var filtered = [];
        var index = 0;
        var vals = Object.values(objs);
        vals.forEach(val => {
            filtered.push(func(val, index, vals.length));
        });
        return filtered;
    };

    t.Select = function (objs, func) {
        var filtered = [];
        for (var i = 0; i < objs.length; i++)
            filtered.push(func(objs[i], i, objs.length));
        return filtered;
    };

    t.SelectMap = function (objs, func) {
        var filtered = [];
        objs.forEach((ta, key) => { filtered.push(func(ta, key)); });
        return filtered;
    };

    t.Where = function (objs, func) {
        var filtered = [];
        for (var i = 0; i < objs.length; i++) {
            if (!func || func(objs[i]))
                filtered.push(objs[i]);
        }
        return filtered;
    };

    t.WhereMap = function (objs, func) {
        var filtered = [];
        objs.forEach((ta, key) => {
            if (!func || func(ta))
                filtered.push(ta);
        });
        return filtered;
    };

    t.First = function (objs, func) {
        if (func)
            objs = t.Where(objs, func);
        if (objs.length > 0)
            return objs[0];
        return null;
    };

    t.Max = function (objs, func, isMax) {
        var max = null;
        var maxObj = null;
        for (var i = 0; i < objs.length; i++) {
            if (max == null || (isMax ? (func(objs[i]) > max) : (func(objs[i]) < max))) {
                max = func(objs[i]);
                maxObj = objs[i];
            }
        }
        return maxObj;
    };

    t.OrderBy = function (objs, args) {
        var orderedList = objs;
        orderedList.sort(function (a, b) {
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                var a1 = (arg(a) ? arg(a) : null);
                var a2 = (arg(b) ? arg(b) : null);

                if (typeof a1 == 'string')
                    return a1.localeCompare(a2);
                if (a1 != a2)
                    return a1 - a2;
            }
        });
        return orderedList;
    };

    t.on = function (ev, uid, done) {
        var evt = t.Events[ev] ? t.Events[ev] : { ev, subevents: {} };
        evt.subevents[uid] = done;
        t.Events[ev] = evt;
    };

    t.off = function (ev, uid) {
        var evt = t.Events[ev] ? t.Events[ev] : { ev, subevents: {} };
        if (evt.subevents[uid])
            delete evt.subevents[uid];
    };

    t.trigger = function (ev, stuff) {
        if (t.Events[ev]) {
            Object.keys(t.Events[ev].subevents)._each(key => {
                t.Events[ev].subevents[key](stuff);
            });
        }
    };

}(typeof exports === 'undefined' ? UT : exports));

/* ======== Twelev47 support@example.com ======== */ 
/* ======== Twelev47 support@example.com ======== */ 
var ServerLoc = 'https://twelve47.com/';

var M = {
    TESTING: true,


    microphone: {},
    desktop: {},
    resultText: '',
    resultQueue: new UT.Queue(),
    lastHighVolume: Date.now() - 5000,
    lastText: Date.now() - 1000,
    latestVideoTitle: 'null2',
    lastGetResponse: Date.now() - 5000,
    lastSendInfo: Date.now() - 5000,
    listening: false,
    lastPartial: '',
    chrome: true,


    init: function () {
        UT.Extensions();

        var query = new URLSearchParams(window.location.search);
        M.TWITCH = query.get('twitch');
        M.StreamId = query.get('sid');
        VueInit();

        if (!M.TWITCH)
            M.TWITCH = 'your_twitch'; //your_twitch
        if(!M.StreamId)
            M.StreamId = 'j2l1sqbPSSLRsQt4Fem';

        M.ioTwelve47 = new API(3001, null, true, 'https://twelve47.com/');

        M.chrome = M.V.$data.chrome = M.IsChrome();
        if (!M.chrome) {
            return M.V.showAlert('Chrome Browser Required for Speech Recognition', 15000, 'bad')
        }


        setTimeout(function(){
            if(M.TESTING){
                M.ioAI = new API(3100, null, true, "http://localhost:3100");

                M.ioAI.Call('GetUserByStreamKey', M.StreamId, (data) => {
                    var member = data;
                    M.V.IntroCheck(member);
                });
            }else{
                M.ioTwelve47.Call('ToggleApp', { streamId: M.StreamId, appType: 'streambot', active: true }, (data) => {
                    var member = data ? data.member : null;
                    var apps = data ? data.apps : null;

                    if (!member)
                        return;

                    var app = apps._first(x => x.type == 'streambot');

                    M.ioAI = new API(app.port, app.ip);
                    M.V.IntroCheck(member);
                });
            }
        },500);
    },

    Ready: function () {
        console.log('READY----------');



        M.ioAI.Sock.on('requestLimit', function () {
            M.V.showAlert('Daily Usage Limit Reached!', 3000, 'bad')
        });


        var worker = new Worker('./time-worker.js');
        M.tick = 0;
        //every 350ms
        worker.addEventListener('message', function(){
            if(M.tick % 4 == 0){
                M.V.updateConnection(M.ioAI.Sock.connected, M.ioTwelve47.Sock.connected);
                M.checkListening();
            }

            if (M.tick % 15 == 5){
                M.ioAI.Call('CheckStatusApplication', M.TWITCH, function (latestVersion) {
                })
            }


            M.processText();

            M.tick++;
            //console.log('yooo', Date.now())
        });


        //todo
        /*
        
        */

        M.ioAI.Sock.on('playingAudio', function () {
            M.pauseListening = true;

            clearTimeout(M.ttClearPause);
            M.ttClearPause = setTimeout(function () {
                if (M.pauseListening == true) {
                    M.pauseListening = false;
                    M.lastText = Date.now();
                }
            }, 31000);
        });

        M.ioAI.Sock.on('doneAudio', function (data) {
            if (M.pauseListening) {
                M.pauseListening = false;
                M.lastText = Date.now();
            }
        });

        /*
        M.ioAI.Sock.on('doneAudio', function (data) {
            if (M.pauseListening) {
                M.pauseListening = false;


                M.record('microphone');
                M.record('desktop');
                
                M.lastText = Date.now();
                
            }
        });

        M.ioAI.Sock.on('playingAudio', function () {
            M.pauseListening = true;
            clearTimeout(M.ttClearPause);
            M.ttClearPause = setTimeout(function () {

                if (M.pauseListening == true) {
                    console.log('failed to reset pause---');
                    M.record('microphone');
                    M.record('desktop');

                    M.pauseListening = false;
                    M.lastText = Date.now();
                }
            }, 31000);
        });*/

        M.ResetModel();
    },



    ResetModel: function () {
        //setup voice + start recording
        var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
        M.rec = new SpeechRecognition();
        M.rec.continuous = true;
        M.rec.interimResults = true;

        M.rec.onstart = function () {
            console.log("listening start??");
        };

        M.rec.onerror = function (er) { 
            if(er && er.error == 'not-allowed'){
                M.V.showAlert('Microphone Access Disabled.  Allow Microphone Access. (Lock Icon near URL)', 1500, 'bad')
            }

            console.log('speech error', er);
        }
        M.rec.onspeechstart = function(){
            M.lastSpeech = Date.now();
        }
        M.rec.onspeechend = function () {
            M.lastSpeech = Date.now();
        }

        M.rec.onend = function(){
            console.log('on end speech');
            var beenAwhile = !M.lastSpeechRestart || (Date.now() - M.lastSpeechRestart) < 700;

            if (beenAwhile){
                M.lastSpeechRestart = Date.now();
                M.rec.start();
            }else{
                setTimeout(function(){ 
                    M.rec.start(); 
                    M.lastSpeechRestart = Date.now();
                }, 700)
            }
        }

        M.rec.onresult = function (event) {
            var result = event.results[event.resultIndex][0];
            var transcript = result.transcript;
            var confidence = result.confidence;
            M.lastText = Date.now();
            M.lastSpeech = Date.now();
            
            if (!M.pauseListening && confidence > 0.4) {
                //check result text -> remove old - not relevant stuff
                if (transcript.length > 0 && event.results[event.resultIndex].isFinal == true) {
                    console.log('enq text');
                    M.V.$data.transcription = transcript;
                    M.resultQueue.enQ({ time: Date.now(), text: transcript }, 5);
                }
            }
        };

        M.rec.start();

        /*
        if (M.rec)
            M.rec.remove();

        Vosk.createModel('http://127.0.0.1:9060/vosk_model.tar.gz').then(model => {
            M.model = model;
            console.log('setup recognzier');
            M.rec = new M.model.KaldiRecognizer(16000);

            M.rec.on('partialresult', (msg, t2, t3) => {
                if (msg.result.partial.length > 1) {
                    M.lastText = Date.now();
                    if (M.firstPartialTime == null)
                        M.firstPartialTime = Date.now();
                    console.log('partialresult ', msg.result.partial);
                    M.lastPartial = msg.result.partial;
                    //M.rec.retrieveFinalResult();
                }
            });

            M.rec.on('result', (msg) => {
                console.log('real-result: ', M.waitingType, M.pauseListening);
                console.log('pre-text: ', msg.result.text);
                M.lastPartial = msg.result.text;

                console.log(msg);
                if (M.firstPartialTime == null)
                    M.firstPartialTime = Date.now();


                if (msg.result.text.length > 1)
                    M.lastText = Date.now();

                if (!M.pauseListening) {
                    //check result text -> remove old - not relevant stuff

                    if (msg.result.text.length > 0) {
                        M.resultQueue.enQ({ time: Date.now(), text: msg.result.text }, 5);
                    }
                }

                M.firstPartialTime = null;
            });


            M.setupRecord('microphone');
            M.setupRecord('desktop');
        }).catch(er => {
            console.log(er);
        })*/
    },


    showOBS: function () {
        var url = 'https://twelve47.com/?stream=' + M.streamer.streamId + '&app=streambot';
        navigator.clipboard.writeText(url);
        M.V.showAlert('Copied!', 500)
        setTimeout(function () {
            M.V.showAlert(url, 5000)
        }, 500)
    },

    checkListening: function () {
        var activeListen = (Date.now() - M.lastSpeech) < 1600;

        //check listenign status -> send to animate
        if (!M.listening && activeListen) {
            M.listening = true;
            M.V.$data.microphoneOn = M.listening;
            M.ioAI.Call('Listening', { TWITCH: M.TWITCH, listening: true }, function () { });
        } else if (M.listening && !activeListen) {
            M.listening = false;
            M.V.$data.microphoneOn = M.listening;
            M.ioAI.Call('Listening', { TWITCH: M.TWITCH, listening: false }, function () { });
        }
    },

    processText: function () {
        var timeSinceLastText = (Date.now() - M.lastText);
        var text = '';

        //remoev old data
        if (M.resultQueue.length > 0 && (Date.now() - M.resultQueue.data[M.resultQueue.head].time) > 15000){
            M.resultQueue.deQ();
            console.log('dq old text');
        }

        M.resultQueue.array()._each(rq => { text += '..' + rq.text; });

        var sendText = (text.length > 20);
        var sendUpdate = timeSinceLastText > 1500;
        //bot needs the opportunity to respond -> even if there is no new text
        //like if they have summary.. and havent responded.

        //alow sendUpdate if sentTextWithoutUpdate
        if (!M.sentTextWithoutUpdate || (Date.now() - M.lastSendInfo) < 2500)
            sendUpdate = false;


        if (M.sentTextWithoutUpdate && sendUpdate)
            M.sentTextWithoutUpdate = false;

        console.log('-----------', M.resultQueue.data, text)

        if (!sendText)
            text = '';
        //sendUpdate happens over and over again, every time...??



        if (sendUpdate || sendText) {
            console.log('sendUpdate: ', sendUpdate, 'sendText', sendText)

            if (sendUpdate)
                M.lastSendInfo = Date.now();
            M.sendInfo(text, timeSinceLastText);

            if (sendText) {
                //reset
                M.sentTextWithoutUpdate = true;
                M.resultQueue = new UT.Queue();
            }
        }
    },

    pauseVideo: function () {
        M.ioAI.Call('PauseVideo', [M.TWITCH], function () {
            M.V.showAlert('Video Toggled.', 2000)
        });
    },

    cancelVideo: function () {
        M.ioAI.Call('CancelVideo', [M.TWITCH], function () {
            M.V.showAlert('Video Stopped.', 2000)
        });
    },

    getVideo: function () {
        var divUrl = document.querySelector('#inp-url');

        console.log('get video', M.V.$data.canPlayVid);

        clearTimeout(M.ttvid)
        M.ttvid = setTimeout(function(){
            M.V.$data.canPlayVid = true;
        },30000)

        if (!M.V.$data.canPlayVid)
            return;

        if (!M.ioAI.Sock.connected)
            return M.V.showAlert('Connection Failed', 1000, 'bad');

        if(!divUrl.value.includes('youtube'))
            return M.V.showAlert('Youtube Videos Only', 1400, 'bad');

        M.V.showAlert('attempting to download video..', 5000);

        M.ioAI.Call('HandleYoutube', { twitch: M.TWITCH, url: divUrl.value }, function(res){
            console.log('handleyoutube', res)
            if(!res)
                M.V.showAlert('Failed to Display Video. Make sure: < 10 min videos', 5000, 'bad');
            else
                M.V.showAlert('Video Ready', 1000);
        });

        M.V.$data.canPlayVid = false;
        //todo video stuff
        return;

        var divUrl = document.querySelector('#inp-url');

        if (M.V.$data.streamer.aiListenDesktop == 'off')
            return M.V.showAlert('"Desktop Audio React" is currently turned off', 1500, 'bad')

        if (!M.ioAI.Sock.connected) {
            return M.V.showAlert('No OBS Browser Instance Available', 1000, 'bad');
        }

        M.V.showAlert('downloading (long video may take awhile)..');

        `${main.getVideo(divUrl.value).then(function (data) {

            if (!data.downloaded) {
                divUrl.value = '';
                M.V.showAlert('Failed to Get Video. Video too large, too few views, or couldnt be found.', 4000, 'bad')
                return;
            }

            console.log('getVideoData', data);
            console.log(data.test);

            //if(data === false)
            //return confirm('video not found - or too large');

            M.V.showAlert('prepping to show video..');

            setTimeout(function () {

                //reset reverythig - clear out active data ?
                M.resultQueue = new UT.Queue();

                var videoData = {
                    index: data.index,
                    url: divUrl.value,
                    title: data.title,
                    duration: data.duration
                };

                M.ioAI.Call('VideoReady', [M.TWITCH, videoData], function () {
                    M.V.showAlert('Video Loaded', 2000)
                })
            }, 5000);
        })}`;

        `${main.getComments(divUrl.value).then(function (data) {
            console.log('got comments', data);

            M.ioAI.Call('VideoComments', [M.TWITCH, data.comments, data.title]);
        })}`;

    },

    sendInfo: function (text, timeSinceText) {
        var time = Date.now();
        console.log('sending INFO');

        var sendInfo = {
            time: time,
            text: text,
            type: 'microphone', //microphone or desktop
            twitch: M.TWITCH,
            timeSinceText: timeSinceText,
            //eventually add a key here for sec
        };

        console.log(sendInfo);

        M.ioAI.Call('SubmitText', sendInfo, function (res) {
        });
    },

    //consolidate these functionf or desktop / microphone
    //stop recording when stopped.  -> restart the recording when done

    /*
    "electron": "^23.1.1",
    "electron-context-menu": "^3.6.1",
    "electron-wix-msi": "^5.0.0",
    */
   /*
    record: function (type) {
        M[type].chunks = [];

        if (M.V.$data.streamer) {
            if (M.V.$data.streamer.aiListenDesktop == 'off' && M.V.$data.streamer.aiListenMic == 'off') {
                if (M.rec) {
                    M.rec.remove();
                    M.rec = null;
                    M.model = null;
                }
            } else if (!M.rec) {
                M.ResetModel();
            }

            if (type == 'desktop' && M.V.$data.streamer.aiListenDesktop == 'off')
                return false;
            if (type == 'microphone' && M.V.$data.streamer.aiListenMic == 'off')
                return false;
        }

        if (!M[type].mediaRecorder)
            M.setupRecord(type);
        else if (M[type].mediaRecorder.state != 'recording')
            M[type].mediaRecorder.start();

        clearTimeout(M[type].ttStop);
        M[type].ttStop = setTimeout(() => {
            M[type].mediaRecorder.stop();
        }, 1000);
    },*/

    /*
    setupRecord: function (type) {

        //var devices = data;

        var settings = { audio: true };
        if (type == 'desktop') {

            settings = {
                //audio: { exact: did2  },
                audio: { mandatory: { chromeMediaSource: "desktop" } },
                video: { mandatory: { chromeMediaSource: "desktop" } },
            }
        }

        try {
            navigator.mediaDevices.getUserMedia(settings).then((stream) => {

                M[type].mediaRecorder = new MediaRecorder(stream, {});
                M.record(type);

                M[type].recordError = false;

                M[type].chunks = [];
                var volCutoff = type == 'microphone' ? 0.016 : 0.010; //0.010

                M[type].mediaRecorder.addEventListener("dataavailable", event => {
                    M[type].chunks.push(event.data);
                });

                M[type].mediaRecorder.addEventListener("stop", () => {
                    if (M.pauseListening) {
                        M.checkListening();
                        return;
                    }

                    const audioBlob = new Blob(M[type].chunks, { type: M[type].mediaRecorder.mimeType });
                    var audioContext = new AudioContext({ sampleRate: 16000 });

                    M.record(type);

                    var reader = new FileReader();

                    reader.onload = function () {
                        var arrayBuffer = this.result;

                        audioContext.decodeAudioData(arrayBuffer, function (buffer) {
                            var f32PCM = buffer.getChannelData(0);

                            var sum = 0;
                            for (var amplitude of f32PCM)
                                sum += amplitude * amplitude;

                            var volume = Math.sqrt(sum / f32PCM.length)
                            //console.log('volume ',type, volume)
                            M[type].lastVolume = volume;

                            //allow microphone to override desktop audio
                            if (volume > volCutoff && M.waitingType != type && type == 'microphone' && volume > (M.lastHighVolume * 1.5)) {
                                M.resultQueue = new UT.Queue();
                                M.waitingType = type;
                                M.lastWaitingType = type;
                            }

                            if (volume > volCutoff)
                                M.lastHighVolume = Date.now();

                            if ((volume > volCutoff && M.waitingType == null) || (volume > (volCutoff - 0.05) && M.waitingType == type)) {

                                //console.log('acceptwaveform ',type, M.pauseListening)
                                M.waitingType = type;
                                M.lastWaitingType = type;

                                if (!M.pauseListening)
                                    M.rec.acceptWaveform(buffer);
                            } else if (volume <= (volCutoff - 0.05) && M.waitingType == type) {
                                M.rec.retrieveFinalResult();
                            }

                            M.checkListening();
                        });
                    }

                    reader.readAsArrayBuffer(audioBlob);
                });

            });
        } catch (er) {
            if (!M[type].recordError)
                M.V.showAlert('Error getting ' + type + ' Audio Capture', 4000, 'bad')

            M[type].recordError = true;

            if (M.V.$data.streamer.aiListenDesktop != 'off')
                M.V.$data.streamer.aiListenDesktop = 'off';
            console.log(er);
        }

    },*/

    IsChrome: function () {
        var isChromium = window.chrome;
        var winNav = window.navigator;
        var vendorName = winNav.vendor;
        var isOpera = typeof window.opr !== "undefined";
        var isIEedge = winNav.userAgent.indexOf("Edg") > -1;
        var isIOSChrome = winNav.userAgent.match("CriOS");
        var isActuallyChrome = false;

        if (isIOSChrome) {
            isActuallyChrome = true;
        } else if (
            isChromium !== null &&
            typeof isChromium !== "undefined" &&
            vendorName === "Google Inc." &&
            isOpera === false &&
            isIEedge === false
        ) {
            isActuallyChrome = true;
        } else {
            isActuallyChrome = false;
        }
        return isActuallyChrome;
    },

};

setTimeout(function () {
    M.init();
}, 50);



VueInit = function(){
M.V = Vue.createApp({
    data() {
        return {
            transcription: 'test',
            microphoneOn: false,
            conn: false,
            alertOpacity: 0,
            alert: 'test',
            badAlert: false,
            showTerms: false,
            acceptedTerms: false,
            chrome:true,
            canPlayVid: true,

            colors: ['#0abab5', '#7a93ff', '#b569ff', '#ff7ad5', '#ff8668', '#ffcb6a', '#a7ff78'],
            standardOptions: ['on', 'off', 'text-only'],
            sizeOptions: [0.6, 0.8, 1, 1.2, 1.4, 1.6],
            frequencies: [
                { val: 1, txt: 'ASAP (~30s)' },
                { val: 2, txt: '~1 minute' },
                { val: 4, txt: '~2 minute' },
                { val: 10, txt: '~5 minute' },
                { val: 20, txt: '~10 minute' },
                { val: 40, txt: '~20 minute' },
            ],
            characters: [],
            voices: [],
            charDescription: '',
            canCreateChar: false,
            canTestVoice: true,
            setupComplete: false,

            lastCheckCharInfo: Date.now(),
            customStatus: 'Processing..',
            custom: {
                voice: 'Ivy',
                characterDescription: '',
                visualDescription: '',
            },

            streamer: UT.DefaultObject('ai'),
        }
    },
    mixins: [vPosition],

    watch: {
        streamer: {
            handler(data, old) {
                if (!M.streamer || !M.streamer.streamId) return;
                var update = JSON.parse(JSON.stringify(data));
                M.streamer = Object.assign({}, M.streamer, update);

                M.V.handleSave(update, M.streamer);
            },
            deep: true,
        },
        aiPosPct: {
            handler(data, old) {
                if (!M.streamer || !M.streamer.streamId) return;
                var update = JSON.parse(JSON.stringify(data));
                M.streamer.aiPos = update;
                update = { aiPos: update };

                M.V.handleSave(update, M.streamer);
            },
            deep: true
        }
    },

    methods: {

        IntroCheck: function (member) {
            console.log('inro check', this.showTerms)

            if ((M.TESTING && !M.ioAI.Sock.connected) || (!M.TESTING && !M.ioTwelve47.Sock.connected))
                return setTimeout(function () { M.V.IntroCheck(member); }, 2000);

            //apply object over defaults
            Object.keys(this.streamer)._each(key => {
                if (member[key] != null)
                    this.streamer[key] = member[key];
            })
            M.streamer = member;

            //Hide Terms
            if (this.streamer.aiAcceptedTerms)
                this.showTerms = false;
            else
                return this.showTerms = true;

            this.setupComplete = true;
            M.Ready();

            setTimeout(()=> {
                this.InitPos(member);
            }, 60)
        },

        handleSave: function (update, streamer) {
            clearTimeout(this.ttSave);
            this.ttSave = setTimeout(function () {

                update.loginId = streamer.loginId;
                update.twitch = streamer.twitch;
                update._id = streamer._id;

                console.log('saving', update);
                var saveLoc = M.TESTING ? M.ioAI : M.ioTwelve47;

                saveLoc.Call('SaveUser', [streamer.loginId, update], function () {
                    M.V.showAlert('Saved', 1000);

                    M.ioAI.Call('UpdateSettings', M.TWITCH, function () { });

                    //reset record incase you change settings for desktop/microphone
                    if(this.setupComplete){
                        M.resultQueue = new UT.Queue();
                        M.record('microphone');
                        M.record('desktop');
                    }
                });
            }, 1500);
        },

        openSite: function () {
            `${main.openSite("https://Twelve47.com")}`;
        },

        createChar: function () {
            if (this.conn && M.streamer) {
                if (!M.streamer.streambotPaid) {
                    return this.showAlert('Feature Not Available in Free Trial', 2000, 'bad');
                }

                var gender = 'Male';
                var voiceData = this.voices._first(x => x.Name == this.custom.voice);
                if (voiceData)
                    gender = voiceData.Gender;

                if (this.custom.characterDescription.length <= 0 || this.custom.visualDescription.length <= 0)
                    return this.showAlert('Missing Fields', 1000)

                var newChar = {
                    type: M.streamer.twitch + '_custom',
                    characterDescription: this.custom.characterDescription,
                    visualDescription: gender + " " + this.custom.visualDescription,
                    voice: this.custom.voice,
                    pitch: '+0%',
                    tract_length: '-0%',
                    creationTime: Date.now(),
                    twitch: M.streamer.twitch,
                };
                console.log('trying to save new char', newChar);


                M.ioAI.Call('SaveCharacter', { char: newChar }, (chars) => {
                    this.waitingOnNewChar = true;
                    this.canCreateChar = false;
                    this.streamer.aiChar = 'default';
                })
            }
        },

        updateConnection: function (connected, t47Connected) {
            var justConnected = this.conn != connected;
            this.conn = connected && t47Connected;

            if (connected) {
                if (justConnected) {
                    M.ioAI.Call('PollyVoices', [], (data) => {
                        this.voices = data._orderBy(x => !x.LanguageCode.includes('en'));
                    });
                }

                //should only be getting char info if waiting for new char info
                if (justConnected || ((Date.now() - this.lastCheckCharInfo) > 30000 && !this.canCreateChar)) {
                    M.ioAI.Call('GetCharInfo', [M.streamer.twitch], (data) => {
                        this.lastCheckCharInfo = Date.now();
                        var chars = data.characters;

                        this.characters = data.characters._where(x => x.primary == true || x.faceError === false);
                        this.characters = [{ type: 'default' }, ...this.characters];

                        var waitTime = 60000 * 30;
                        var cchar = chars._first(x => x.type == M.streamer.twitch + "_custom");
                        this.canCreateChar = !cchar || (Date.now() - cchar.creationTime) > waitTime;//15


                        if (!this.canCreateChar) {

                            var status = 'Creating Images.. could take ~5 minutes';
                            if (cchar && cchar.faceError === false) {
                                status = 'Character Created! Recreate available after 30m';

                                this.streamer.aiChar = cchar.type;
                                console.log('2 setting ai char: ', this.streamer.aiChar, this.canCreateChar);
                            }
                            if (cchar && cchar.faceError === true)
                                status = 'Facial Idenfication Failed.  Human-like characters only. Retry available after 30m.'
                            this.customStatus = status;
                        }
                        console.log('getcharinfo', data);
                    });
                } else {

                }
            }
        },

        testVoice: function () {
            var voice = this.custom.voice;
            //call polly -> 
            this.canTestVoice = false;

            M.ioAI.Call('TestVoice', voice, (data) => {
                console.log('testing voice', data);
                var audio = new Audio();
                audio.src = URL.createObjectURL(new Blob([data.voice]));
                audio.addEventListener('canplaythrough', () => {
                    audio.play();
                });

            });
            setTimeout(() => {
                this.canTestVoice = true;
            }, 2000);
        },

        showAlert: function (text, time = 4000, type = 'good') {
            this.alert = text;
            this.alertOpacity = 1;
            this.badAlert = type != 'good';
            clearTimeout(this.ttAlert);
            this.ttAlert = setTimeout(function () {
                M.V.hideAlert();
            }, time);
        },
        hideAlert: function () {
            this.alertOpacity = 0;
        },

    }
}).mount('#divApp');
}


var vPosition = {
    data: {
        grabbed: null,
        offset: { x: 0, y: 0 },

        aiPos: {},

        aiPosPct: {
            dudeLeft: 0.89,
            dudeTop: 0.82,
            videoLeft: 0.63,
            videoTop: 0.06,
            captionLeft: 0.77,
            captionTop: 0.68
        }
    },

    methods: {

        InitPos: function (sdata) {
            var box = document.querySelector('.div-screen').getBoundingClientRect();
            this.boxWidth = box.width;
            this.boxHeight = box.height;
            this.offset = { x: box.left, y: box.top };


            console.log(sdata.aiPos);
            //if (sdata.aiPos != null) {
            this.aiPosPct = sdata.aiPos != null ? sdata.aiPos : this.aiPosPct;

            Object.keys(this.aiPosPct)._each(key => {
                var thing = this.aiPosPct[key];
                var ang = key.includes('Left') ? this.boxWidth : this.boxHeight;
                this.aiPos[key] = (thing * ang) + 'px';

                console.log(key, thing, ang);
            });

            //}
        },

        grab: function (ev) {
            this.grabbed = ev.target.parentElement.classList.item(1);
            this.eWidth = ev.target.parentElement.getBoundingClientRect().width;
            this.eHeight = ev.target.parentElement.getBoundingClientRect().height;
            //console.log(this.grabbed, 'o');
        },

        mouseUp: function (ev) {
            this.grabbed = false;
        },

        mouseMove: function (ev) {
            if (this.grabbed) {
                var w = this.eWidth;
                var h = this.eHeight;

                var px = Math.max(0, Math.min((1920 / 4.5) - w, (ev.x - this.offset.x)));
                var py = Math.max(0, Math.min((1080 / 4.5) - h, (ev.y - this.offset.y)));

                this.aiPos[this.grabbed + 'Left'] = Math.ceil(px / 2) * 2 + 'px';
                this.aiPos[this.grabbed + 'Top'] = Math.ceil(py / 2) * 2 + 'px';

                this.aiPosPct[this.grabbed + 'Left'] = +((Math.ceil(px / 2) * 2) / this.boxWidth).toFixed(2);
                this.aiPosPct[this.grabbed + 'Top'] = +((Math.ceil(py / 2) * 2) / this.boxHeight).toFixed(2);

                this.$forceUpdate();
            }
        }
    }
};

