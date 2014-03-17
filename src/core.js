/*jslint sloppy:true, nomen:true*/
/*global FBP:true */

var _c = {},
    _n = {},

    addInput,
    outPortSender,
    invokeComponent,

    defaultCallback = function (err) {
        if (err) {
            throw err;
        }
    },

    Runtime = function (network, callback) {
        var that = this;
        that.nname = network.name;
        that.addInput = addInput;
        that.invokeComponent = invokeComponent;
        that.sendOutput = _sendOutput;
        that.arcs = network.arcs;
        that.states = {};
        that.inputs = {};
        that.callback = callback || defaultCallback;
        that.tic = Date.now();
        FBP.utils.objIterate(network.components, function (c) {
            that.states[c] = FBP.component(c).state || {};
            that.inputs[c] = {};
        });
        that.inputs[network.name] = {};
    },

    _go = function (inputs, callback) {
        var runtime = new Runtime(this, callback);
        FBP.utils.objIterate(inputs, function (input) {
            runtime.addInput(runtime.arcs[input], inputs[input]);
        });
    },

    _sendOutput = function (output, portCode, _err) {
        var runtime = this,
            err = _err || null,
            results = {
                interval: Date.now() - runtime.tic
            };
        if (!err) {
            runtime.inputs[runtime.nname][portCode] = output;
            results.output = output;
            results.port = portCode;
        }
        runtime.callback.apply(runtime, [ err, results ]);
    },

    imperativeDefine = function (name, constructor) {
        var components = {},
            arcs = {}, // sparse matrix of all connections, including inputs and outputs
            F = {
                init: function (name, port) {
                    components[name] = true;
                    arcs[FBP.utils.portEncode(name, port)] = {
                        name: name,
                        port: port
                    };
                },
                connect: function (fromName, fromPort, toName, toPort) {
                    var fromCode = FBP.utils.portEncode(fromName, fromPort);
                    components[toName] = true;
                    arcs[fromCode] = {
                        name: toName,
                        port: toPort
                    };
                },
                end: function (name, port) {
                    arcs[FBP.utils.portEncode(name, port)] = {
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
            network.arcs[init[i]] = FBP.utils.portDecode(init[i]);
            network.components[network.arcs[init[i]].name] = true;
        }
        FBP.utils.objIterate(config.connections, function (conn) {
            network.arcs[conn] = FBP.utils.portDecode(config.connections[conn]);
            network.components[network.arcs[conn].name] = true;
        });
        for (i = 0; i < end.length; i = i + 1) {
            network.arcs[end[i]] = FBP.utils.portDecode(end[i]);
            network.arcs[end[i]].end = true;
        }
        network.go = _go.bind(network);
        _n[network.name] = network;
        return network;
    };

addInput = function (portObj, value) {
    var runtime = this,
        component = FBP.component(portObj.name);
    runtime.inputs[portObj.name][portObj.port] = value;
    if (FBP.utils.objLength(runtime.inputs[portObj.name]) === component.inPorts.length) {
        runtime.invokeComponent(component);
    }
};

outPortSender = function (dest) {
    return function (err, value) {
        var runtime = this;
        if (err) {
            runtime.sendOutput(null, null, err);
        } else if (dest.end) {
            runtime.sendOutput(value, FBP.utils.portEncode(dest));
        } else {
            runtime.addInput(dest, value);
        }
    };
};

invokeComponent = function (component) {
    var runtime = this,
        inPorts = component.inPorts,
        outPorts = component.outPorts,
        args = [],
        i = 0,
        fromCode,
        dest;
    for (i; i < inPorts.length; i = i + 1) {
        args[i] = runtime.inputs[component.name][inPorts[i]];
    }
    for (i = 0; i < outPorts.length; i = i + 1) {
        fromCode = FBP.utils.portEncode(component.name, outPorts[i]);
        dest = runtime.arcs[fromCode];
        args[i + inPorts.length] = outPortSender(dest).bind(runtime);
    }
    component.body.apply(runtime.states[component.name], args);
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
            throw 'component has already defined';
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
        _c[name] = {
            name: name,
            inPorts: inPorts, // an array of in ports names
            outPorts: outPorts, // an array of out ports names
            body: body, // the component body
            state: state // internal state of the component
        };
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
