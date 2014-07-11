/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

(function (FBP, _FBP) {

_FBP.profiler = {
    enabled: true
};

if ('undefined' === typeof localStorage) {
    // node.js and DOM storage unsupported browsers do not keep profiling data for now
    return;
}

var encode = function (name) {
    return 'FBP.profile.c.' + name;
}

_FBP.profiler.timestamp = (function () {
    if ('object' === typeof process && 'function' === typeof process.hrtime) {
        // node.js hrtime
        return function () {
            var hrtime = process.hrtime();
            return hrtime[0] * 1000 + hrtime[1] / 1000000;
        };
    } else if ('object' === typeof performance && 'function' === typeof performance.now) {
        // IE10, Chrome24, Gecko15, Opera15
        return function () {
            return performance.now();
        };
    } else {
        return function () {
            return Date.now();
        };
    }
}());

_FBP.profiler.load = function (component) {
    var data = localStorage.getItem(encode(component.name)),
        interval = 0,
        counts = 0;
    if (data) {
        data = data.split(',');
        interval = parseFloat(data[0]);
        counts = parseInt(data[1], 10);
        if (isNaN(interval)) {
            interval = 0;
        }
        if (isNaN(counts)) {
            counts = 0;
        }
    }
    component.profile = {
        interval: interval,
        counts: counts
    };
};

_FBP.profiler.save = function (component) {
    localStorage.setItem(encode(component.name), component.profile.interval + ',' + component.profile.counts);
};

_FBP.profiler.collect = function (component, interval) {
    var counts = component.profile.counts;
    component.profile.interval = (component.profile.interval * counts + interval) / (counts + 1);
    component.profile.counts = counts + 1;
};

FBP.enableProfiler = function (enable) {
    _FBP.profiler.enabled = enable;
};

}(FBP, _FBP));
