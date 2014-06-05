/*
    FBP.js
    http://github.com/teaualune/fbpjs
    MIT License
*/
(function () {
var FBP = {},
    _FBP = {};
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

/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

(function (FBP, _FBP) {

_FBP.Runtime = function (network, callback) {
    var that = this;
    that.nname = network.name;
    that.arcs = network.arcs;
    that.states = {};
    that.inputs = {};
    that.callback = callback || function (err) {
        if (err) {
            throw err;
        }
    };
    that.tic = Date.now();
    _FBP.objIterate(network.components, function (c) {
        that.states[c] = FBP.component(c).state || {};
        that.inputs[c] = {};
    });
    that.inputs[network.name] = {};
};

_FBP.Runtime.prototype = {

    addInput: function (portObj, value) {
        var runtime = this,
            component = FBP.component(portObj.name);
        runtime.inputs[portObj.name][portObj.port] = value;
        if (_FBP.objLength(runtime.inputs[portObj.name]) === component.inPorts.length) {
            runtime.invokeComponent(component);
        }
    },

    invokeComponent: function (component) {
        var runtime = this,
            inPorts = component.inPorts,
            outPorts = component.outPorts,
            args = [],
            i = 0,
            fromCode,
            dest,
            start;
        for (i; i < inPorts.length; i = i + 1) {
            args[i] = runtime.inputs[component.name][inPorts[i]];
        }
        for (i = 0; i < outPorts.length; i = i + 1) {
            fromCode = _FBP.portEncode(component.name, outPorts[i]);
            dest = runtime.arcs[fromCode];
            args[i + inPorts.length] = runtime.outPortSender(dest);
        }
        start = Date.now();
        component.body.apply(runtime.states[component.name], args);
        _FBP.profiler.collect(component, Date.now() - start);
    },

    sendOutput: function (output, portCode, _err) {
        var runtime = this,
            err = _err || null,
            results = {
                interval: Date.now() - runtime.tic
            };
        if (!err) {
            runtime.inputs[runtime.nname][portCode] = output;
            results.output = output;
            results.port = portCode;
            _FBP.objIterate(_FBP._n[runtime.nname].components, function (cname) {
                _FBP.profiler.save(_FBP._c[cname]);
            });
        }
        runtime.callback.apply(runtime, [ err, results ]);
    },

    outPortSender: function (dest) {
        var runtime = this;
        return function (err, value) {
            _FBP.async(function () {
                if (err) {
                    runtime.sendOutput(null, null, err);
                } else if (dest.end) {
                    runtime.sendOutput(value, _FBP.portEncode(dest));
                } else {
                    runtime.addInput(dest, value);
                }
            });
        };
    }
};

}(FBP, _FBP));

/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

(function (FBP, _FBP) {

var _c = {},
    _n = {},

    _go = function (inputs, callback) {
        var runtime = new _FBP.Runtime(this, callback);
        _FBP.objIterate(inputs, function (input) {
            runtime.addInput(runtime.arcs[input], inputs[input]);
        });
    },

    imperativeDefine = function (name, constructor) {
        var components = {},
            arcs = {}, // sparse matrix of all connections, including inputs and outputs
            F = {
                init: function (name, port) {
                    components[name] = true;
                    arcs[_FBP.portEncode(name, port)] = {
                        name: name,
                        port: port
                    };
                },
                connect: function (fromName, fromPort, toName, toPort) {
                    var fromCode = _FBP.portEncode(fromName, fromPort);
                    components[toName] = true;
                    arcs[fromCode] = {
                        name: toName,
                        port: toPort
                    };
                },
                end: function (name, port) {
                    arcs[_FBP.portEncode(name, port)] = {
                        name: name,
                        port: port,
                        end: true
                    };
                }
            },
            network = {
                name: name,
                outputs: {}
            };
        constructor(F);
        network.components = components;
        network.arcs = arcs;
        network.go = _go.bind(network);
        _n[name] = network;
        return network;
    },

    declarativeDefine = function (config) {
        var network = {
                name: config.name,
                outputs: {},
                components: {},
                arcs: {}
            },
            init = ('string' === typeof config.init) ? [config.init] : config.init,
            end = ('string' === typeof config.end) ? [config.end] : config.end,
            i;
        for (i = 0; i < init.length; i = i + 1) {
            network.arcs[init[i]] = _FBP.portDecode(init[i]);
            network.components[network.arcs[init[i]].name] = true;
        }
        _FBP.objIterate(config.connections, function (conn) {
            network.arcs[conn] = _FBP.portDecode(config.connections[conn]);
            network.components[network.arcs[conn].name] = true;
        });
        for (i = 0; i < end.length; i = i + 1) {
            network.arcs[end[i]] = _FBP.portDecode(end[i]);
            network.arcs[end[i]].end = true;
        }
        network.go = _go.bind(network);
        _n[network.name] = network;
        return network;
    };

FBP.component = function (config) {
    if ('string' === typeof config) {
        return _c[config];
    } else {
        var name = config.name,
            body = config.body,
            state = config.state || {},
            inPorts = null,
            outPorts = null;
        if (_c[name]) {
            // disable redefinition of components
            return _c[config];
        }
        if ('string' === typeof config.inPorts) {
            inPorts = [config.inPorts];
        } else {
            inPorts = config.inPorts;
        }
        if ('string' === typeof config.outPorts) {
            outPorts = [config.outPorts];
        } else {
            outPorts = config.outPorts;
        }
        if (body.length !== inPorts.length + outPorts.length) {
            throw 'number of ports do not match between definition and function arguments';
        }
        _c[name] = _FBP.profiler.load({
            name: name,
            inPorts: inPorts, // an array of in ports names
            outPorts: outPorts, // an array of out ports names
            body: body, // the component body
            state: state, // internal state of the component
            profile: {}
        });
    }
};

FBP.network = function (name) {
    return _n[name];
};

FBP.define = function () {
    var network;
    if (arguments.length === 2 && 'string' === typeof arguments[0]) {
        network = imperativeDefine(arguments[0], arguments[1]);
    } else {
        network = declarativeDefine(arguments[0]);
    }
    return network;
};

_FBP._n = _n;
_FBP._c = _c;

}(FBP, _FBP));

var root = this;
if ('undefined' !== typeof exports) {
    if ('undefined' !== typeof module && module.exports) {
        exports = module.exports = FBP;
    }
    exports.FBP = FBP;
} else {
    root.FBP = FBP;
}

}());