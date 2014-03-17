/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

FBP.utils = {
    objIterate: function (obj, iterate) {
        var O;
        for (O in obj) {
            if (obj.hasOwnProperty(O)) {
                iterate(O);
            }
        }
    },

    objLength: function (obj) {
        var n = 0;
        FBP.utils.objIterate(obj, function () {
            n = n + 1;
        });
        return n;
    },

    portEncode: function (portObj) {
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

    portDecode: function (name) {
        var v = name.split('.');
        return {
            name: v[0],
            port: v[1]
        }
    }
};
