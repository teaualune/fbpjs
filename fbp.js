/*jslint sloppy:true, nomen:true*/
/*global module:true, exports:true */

(function () {

    var root = this,
        FBP = (function () {
            var _c = {},
                _n = {},

                objIterate = function (obj, iterate) {
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

                portEncode = function (component, port) {
                    return component + '.' + port;
                },

                portDecode = function (name) {
                    var v = name.split('.');
                    return {
                        name: v[0],
                        port: v[1]
                    }
                },

                addInput,
                outPortSender,
                invokeComponent,

                defaultCallback = function (err) {
                    if (err) {
                        throw err;
                    }
                },

                _go = function (inputs, callback) {
                    var that = this;
                    if (!that.callback) {
                        that.callback = callback || defaultCallback;
                    }
                    that.tic = Date.now();
                    objIterate(inputs, function (input) {
                        var component = FBP.component(that.arcs[input].name),
                            inPort = that.arcs[input].port;
                        addInput(that, component, inPort, inputs[input]);
                    });
                },

                _sendOutput = function (output, outPort, _err) {
                    var that = this,
                        err = _err || null,
                        results = {
                            interval: Date.now() - that.tic
                        };
                    if (!err) {
                        that.outputs[outPort] = output;
                        results.outputs = that.outputs;
                    }
                    that.callback.apply(that, [ err, results ]);
                },

                imperativeDefine = function (name, constructor) {
                    var components = [],
                        arcs = {}, // sparse matrix of all connections, including inputs and outputs
                        F = {
                            init: function (name, port) {
                                components.push(name);
                                arcs[name + '.' + port] = {
                                    name: name,
                                    port: port
                                };
                            },
                            connect: function (fromName, fromPort, toName, toPort) {
                                components.push(toName);
                                arcs[fromName + '.' + fromPort] = {
                                    name: toName,
                                    port: toPort
                                };
                            },
                            end: function (name, port) {
                                arcs[name + '.' + port] = {
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
                    network.sendOutput = _sendOutput.bind(network);
                    _n[name] = network;
                    return network;
                },

                declarativeDefine = function (config) {
                    var network = {
                            name: config.name,
                            outputs: {},
                            components: config.components,
                            arcs: {}
                        },
                        init = ('string' === typeof config.init) ? [config.init] : config.init,
                        end = ('string' === typeof config.end) ? [config.end] : config.end,
                        i;
                    for (i = 0; i < init.length; i = i + 1) {
                        network.arcs[init[i]] = portDecode(init[i]);
                    }
                    objIterate(config.connections, function (conn) {
                        network.arcs[conn] = portDecode(config.connections[conn]);
                    });
                    for (i = 0; i < end.length; i = i + 1) {
                        network.arcs[end[i]] = portDecode(end[i]);
                        network.arcs[end[i]].end = true;
                    }
                    network.go = _go.bind(network);
                    network.sendOutput = _sendOutput.bind(network);
                    _n[network.name] = network;
                    return network;
                };

            addInput = function (network, component, inPort, value) {
                component.inputs[inPort] = value;
                if (objLength(component.inputs) === component.inPorts.length) {
                    invokeComponent(network, component);
                }
            };

            outPortSender = function (network, destName, dest) {
                return function (err, value) {
                    if (err) {
                        _sendOutput.apply(network, [ null, null, err ]);
                    } else if (dest.end) {
                        network.sendOutput(value, destName);
                    } else {
                        addInput(network, FBP.component(dest.name), dest.port, value);
                    }
                };
            };

            invokeComponent = function (network, component) {
                var inN = component.inPorts.length,
                    outN = component.outPorts.length,
                    args = [],
                    i = 0,
                    destName,
                    dest;
                for (i; i < inN; i = i + 1) {
                    args[i] = component.inputs[component.inPorts[i]];
                }
                for (i = 0; i < outN; i = i + 1) {
                    destName = component.name + '.' + component.outPorts[i];
                    dest = network.arcs[destName];
                    args[i + inN] = outPortSender(network, destName, dest);
                }
                component.body.apply(component.state, args);
            };

            return {
                component: function (config) {
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
                            inputs: {}, // pool for waiting inputs from in ports
                            inPorts: inPorts, // an array of in ports names
                            outPorts: outPorts, // an array of out ports names
                            body: body, // the component body
                            state: state // internal state of the component
                        };
                    }
                },
                network: function (name) {
                    return _n[name];
                },
                define: function () {
                    var network;
                    if (arguments.length === 2 && 'string' === typeof arguments[0]) {
                        network = imperativeDefine(arguments[0], arguments[1]);
                    } else {
                        network = declarativeDefine(arguments[0]);
                    }
                    return network;
                }
            };
        }());

    if ('undefined' !== typeof exports) {
        if ('undefined' !== typeof module && module.exports) {
            exports = module.exports = FBP;
        }
        exports.FBP = FBP;
    } else {
        root.FBP = FBP;
    }

}());
