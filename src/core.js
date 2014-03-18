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

}(FBP, _FBP));
