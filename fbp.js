(function () {

    var FBP = (function () {
        var _c = {},
            _g = {};
        return {
            component: function () {
                if (arguments.length === 1) {
                    // getter
                    return _c[arguments[0]];
                } else {
                    // setter i.e. constructor
                    // if 1st argument is an array, we construct several instances
                    var name;
                    if ('string' === typeof arguments[0]) {
                        name = arguments[0];
                    } else {
                        name = arguments[0].name;
                    }
                    if (_c[name]) {
                        throw 'component has already defined';
                    } else {
                        _c[name] = {
                            name: name,
                            addInput: function (input, order) {
                                var that = this;
                                this.inputs[order] = input;
                                this.inN = this.inN + 1;
                                if (this.inN === this._inN) {
                                    FBP.invokeComponent(this);
                                }
                            },
                            inputs: [],
                            inN: 0,
                            _inN: arguments[1],
                            _outN: arguments[2],
                            task: arguments[3]
                        };
                    }
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
                    outPorts = [],
                    outN = 0,
                    arcs = {},
                    F = {
                        init: function (name, order) {
                            var component = FBP.component(name);
                            component.graph = graphName;
                            components.push(name);
                            inPorts.push({
                                component: name,
                                order: order
                            });
                            inN = inN + 1;
                        },
                        connect: function (inPort, inOrder, outPort, outOrder) {
                            var outComponent = FBP.component(outPort);
                            if (!outComponent.graph || outComponent.graph !== graphName) {
                                outComponent.graph = graphName;
                                components.push(outPort);
                            }
                            arcs[inPort + inOrder] = {
                                component: outPort,
                                order: outOrder
                            };
                        },
                        end: function (name, order) {
                            outPorts.push({
                                component: name,
                                order: order
                            });
                            outN = outN + 1;
                        }
                    };
                constructor(F);
                F.name = graphName;
                F.components = components;
                F.inPorts = inPorts;
                F.inN = inN;
                F.outPorts = outPorts;
                F.outN = outN;
                F.outputs = [];
                F.arcs = arcs;
                F.go = function () {
                    var i = 0;
                    this.callback = arguments[arguments.length - 1];
                    this.interval = Date.now();
                    for (i; i < arguments.length - 1; i = i + 1) {
                        FBP.component(this.inPorts[i].component).addInput(arguments[i], this.inPorts[i].order);
                    }
                };
                F.getNext = function (prev, prevOrder) {
                    return this.arcs[prev + prevOrder] || 'end';
                };
                F.sendOutput = function (output, outOrder) {
                    this.outputs[outOrder] = output;
                    if (this.outputs.length === this.outN) {
                        // end execution!
                        this.interval = Date.now() - this.interval;
                        this.callback.apply(FBP.graph(this.name), [ null, {
                            outputs: this.outputs,
                            interval: this.interval
                        }]);
                        FBP.cleanup(this.name);
                    }
                };
                _g[arguments[0]] = F;
            },
            invokeComponent: function (component) {
                component.inputs.push(function (outOrder, output) {
                    // catch outputs and send to next component
                    var graph = FBP.graph(component.graph),
                        next = graph.getNext(component.name, outOrder);
                    if (next === 'end') {
                        graph.sendOutput(output, outOrder);
                    } else {
                        FBP.component(next.component).addInput(output, next.order);
                    }
                });
                component.task.apply(component, component.inputs);
            },
            cleanup: function (name) {
                var graph = FBP.graph(name),
                    i = 0;
                for (i; i < graph.components.length; i = i + 1) {
                    FBP.component(graph.components[i]).inputs = [];
                    FBP.component(graph.components[i]).inN = 0;
                }
                graph.outputs = [];
            }
        }
    }());

    if ('undefined' !== typeof exports) {
        if ('undefined' !== typeof module && module.exports) {
            exports = module.exports = FBP;
        }
        exports.FBP = FBP;
    } else {
        window.FBP = FBP;
    }

}());
