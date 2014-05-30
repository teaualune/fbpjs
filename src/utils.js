/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

(function (FBP, _FBP) {

var objIterate = function (obj, iterate) {
        var O;
        for (O in obj) {
            if (obj.hasOwnProperty(O)) {
                iterate(O);
            }
        }
    },

    objLength = function (obj) {
        var n = 0;
        objIterate(obj, function () {
            n = n + 1;
        });
        return n;
    },

    portEncode = function (portObj) {
        var name, port;
        if (arguments.length === 1) {
            name = portObj.name;
            port = portObj.port;
        } else {
            name = arguments[0];
            port = arguments[1];
        }
        return name + '.' + port;
    },

    portDecode = function (name) {
        var v = name.split('.');
        return {
            name: v[0],
            port: v[1]
        }
    };

_FBP.objIterate = objIterate;
_FBP.objLength = objLength;
_FBP.portEncode = portEncode;
_FBP.portDecode = portDecode;

_FBP.async = (function () {
    var async;
    if (typeof process === 'undefined' && typeof setTimeout !== 'undefined') {
        async = function (fn) {
            setTimeout(fn, 0);
        };
    } else {
        async = process.nextTick;
    }
    return async;
}());

}(FBP, _FBP));
