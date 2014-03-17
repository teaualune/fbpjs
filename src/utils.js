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
    }
};
