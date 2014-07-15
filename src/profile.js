/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

(function (FBP, _FBP) {

var root = this,
    encode,
    deserialize;

_FBP.profiler = {
    enabled: true
};

if ('undefined' === typeof root.localStorage) {
    if ('undefined' === typeof root.require) {
        // localStorage-unsupported browsers do not keep profiling data for now
        FBP.enableProfiler = function () {};
        _FBP.profiler.enabled = false;
        return;
    } else {
        // Node.js
        var fs = require('fs');
        _FBP.profiler._load = function (name) {
            return deserialize(fs.readFileSync('FBP-profile-' + name + '.txt', 'utf-8'));
        };
        _FBP.profiler._save = function (name, profile) {
            fs.writeFileSync('FBP-profile-' + name + '.txt', profile.interval + ',' + profile.counts);
        };
    }
} else {
    // localStorage
    _FBP.profiler._load = function (name) {
        return deserialize(localStorage.getItem(encode(name)));
    };
    _FBP.profiler._save = function (name, profile) {
        localStorage.setItem(encode(name), profile.interval + ',' + profile.counts);
    };
}

encode = function (name) {
    return 'FBP.profile.c.' + name;
};

deserialize = function (data) {
    var interval = 0,
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
    return {
        interval: interval,
        counts: counts
    };
};

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
    component.profile = [];
};

_FBP.profiler.save = function (component, interval) {
    var storedProfile = _FBP.profiler._load(component.name),
        interval = 0,
        length = component.profile.length;
    for (var i = 0; i < length; i += 1) {
        interval += component.profile.pop();
    }
    storedProfile.interval = (storedProfile.interval * storedProfile.counts + interval) / (storedProfile.counts + length);
    storedProfile.counts += length;
    _FBP.profiler._save(component.name, storedProfile);
};

_FBP.profiler.average = function (profile) {
    var interval = 0,
        length = profile.length;
    for (var i = 0; i < length; i += 1) {
        interval += profile[i];
    }
    return interval / length;
};

_FBP.profiler.collect = function (component, interval) {
    component.profile.push(interval);
};

FBP.enableProfiler = function (enable) {
    _FBP.profiler.enabled = enable;
};

}(FBP, _FBP));
