/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

(function (FBP, _FBP) {

_FBP.profiler = {};

if ('undefined' === typeof localStorage) {
    // node.js and DOM storage unsupported browsers do not keep profiling data for now
    return;
}

var encode = function (name) {
    return 'FBP.profile.c.' + name;
}

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
    component.profile.interval = interval;
    component.profile.counts = counts;
    return component;
};

_FBP.profiler.save = function (component) {
    localStorage.setItem(encode(component.name), component.profile.interval + ',' + component.profile.counts);
};

_FBP.profiler.collect = function (component, interval) {
    component.profile.counts = component.profile.counts + 1;
    component.profile.interval = (component.profile.interval + interval) / component.profile.counts;
};

}(FBP, _FBP));
