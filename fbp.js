/*jslint sloppy:true, nomen:true*/
/*global module:true, exports:true */

(function () {

    var root = this,
        FBP = (function () {
            var _c = {},
                _g = {},
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
                addInput = function (graph, component, inPort, value) {
                    component.inputs[inPort] = value;
                    if (objLength(component.inputs) === component.args.length) {
                        invokeComponent(graph, component);
                    }
                },
                invokeComponent = function (graph, component) {
                    var input = [],
                        i = 0;
                    for (i; i < component.args.length; i = i + 1) {
                        input[i] = component.inputs[component.args[i]];
                    }
                    input[i] = function (outPort, value) {
                        var destName = component.name + '.' + outPort,
                            dest = graph.arcs[destName];
                        if (dest.end) {
                            graph.sendOutput(value, destName);
                        } else {
                            addInput(graph, FBP.component(dest.name), dest.port, value);
                        }
                    };
                    component.task.bind(component.state).apply(component, input);
                };
            return {
                component: function (config, taskConfig) {
                    if (arguments.length === 1) {
                        // getter
                        return _c[config];
                    } else {
                        // setter i.e. constructor
                        // if 1st argument is an array, we construct several instances
                        var name = null,
                            task = null,
                            state = null;
                        if ('string' === typeof config) {
                            name = config;
                        } else {
                            name = config.name;
                            state = config.state || {};
                        }
                        if (_c[name]) {
                            throw 'component has already defined';
                        }
                        task = taskConfig[taskConfig.length - 1];
                        // task.length refers to number of task function inputs
                        if (taskConfig.length !== task.length) {
                            throw 'in port numbers do not match';
                        }
                        taskConfig.splice(taskConfig.length - 1, 1);
                        _c[name] = {
                            name: name,
                            inputs: {}, // pool for waiting inputs from in ports
                            args: taskConfig, // an array of in ports names
                            task: task, // the task function
                            state: state // internal state of the component
                        };
                    }
                },
                graph: function (name) {
                    // graph getter
                    return _g[name];
                },
                setup: function (name, constructor) {
                    // graph constructor
                    var graphName = name,
                        components = [],
                        inN = 0,
                        outN = 0,
                        arcs = {}, // sparse matrix of all connections, including inputs and outputs
                        F = {
                            init: function (name, port) {
                                var component = FBP.component(name);
                                component.graph = graphName;
                                components.push(name);
                                arcs[name + '.' + port] = {
                                    name: name,
                                    port: port
                                };
                                inN = inN + 1;
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
                                outN = outN + 1;
                            }
                        };
                    constructor(F);
                    F.name = graphName;
                    F.components = components;
                    F.inN = inN;
                    F.outN = outN;
                    F.outputs = {};
                    F.arcs = arcs;
                    F.go = function (inputs, callback) {
                        this.callback = callback;
                        this.tic = Date.now();
                        objIterate(inputs, function (input) {
                            var component = FBP.component(this.arcs[input].name),
                                inPort = this.arcs[input].port;
                            addInput(this, component, inPort, inputs[input]);
                        }.bind(this));
                    };
                    F.sendOutput = function (output, outPort) {
                        var interval = Date.now() - this.tic;
                        this.outputs[outPort] = output;
                        this.callback.apply(this, [ null, {
                            outputs: this.outputs,
                            interval: interval
                        }]);
                    };
                    _g[graphName] = F;
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
