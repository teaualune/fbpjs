(function () {

    var root = this,
        objIterate = function (obj, iterate) {
            for (var O in obj) {
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
        FBP = (function () {
        var _c = {},
            _g = {};
        return {
            component: function (config, taskConfig) {
                if (arguments.length === 1) {
                    // getter
                    return _c[config];
                } else {
                    // setter i.e. constructor
                    // if 1st argument is an array, we construct several instances
                    var name = null,
                        _inN = 0,
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
                        addInput: function (value, inPort) {
                            this.inputs[inPort] = value;
                            if (objLength(this.inputs) === this.args.length) {
                                FBP.graph(this.graph).invokeComponent(this);
                            }
                        },
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
                    inPorts = [],
                    inN = 0,
                    outN = 0,
                    dests = {},
                    F = {
                        init: function (name, port) {
                            var component = FBP.component(name);
                            component.graph = graphName;
                            components.push(name);
                            inPorts[name + '.' + port] = {
                                name: name,
                                port: port
                            };
                            inN = inN + 1;
                        },
                        connect: function (fromName, fromPort, toName, toPort) {
                            var toComponent = FBP.component(toName);
                            if (!toComponent.graph || toComponent.graph !== graphName) {
                                toComponent.graph = graphName;
                                components.push(toName);
                            }
                            dests[fromName + '.' + fromPort] = {
                                name: toName,
                                port: toPort
                            };
                        },
                        end: function (name, port) {
                            dests[name + '.' + port] = 'end';
                            outN = outN + 1;
                        }
                    };
                constructor(F);
                F.name = graphName;
                F.components = components;
                F.inPorts = inPorts;
                F.inN = inN;
                F.outN = outN;
                F.outputs = {};
                F.dests = dests;
                F.go = function (inputs, callback) {
                    this.callback = callback;
                    this.tic = Date.now();
                    var component, inPort;
                    objIterate(inputs, function (input) {
                        component = FBP.component(this.inPorts[input].name);
                        inPort = this.inPorts[input].port;
                        component.addInput(inputs[input], inPort);
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
                F.invokeComponent = function (component) {
                    var that = this,
                        input = [],
                        i = 0;
                    for (i; i < component.args.length; i = i + 1) {
                        input[i] = component.inputs[component.args[i]];
                    }
                    input[i] = function (outPort, value) {
                        var destName = component.name + '.' + outPort;
                            dest = that.dests[destName];
                        if (dest === 'end') {
                            that.sendOutput(value, destName);
                        } else {
                            FBP.component(dest.name).addInput(value, dest.port);
                        }
                    };
                    component.task.bind(component.state).apply(component, input);
                };
                _g[arguments[0]] = F;
            }
        }
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
