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
                    var names;
                    if ('string' === typeof arguments[0]) {
                        names = [ arguments[0] ];
                    } else {
                        names = arguments[0];
                    }
                    for (var i = 0; i < names.length; i = i + 1) {
                        _c[names[i]] = {
                            name: names[i],
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
                var F = {
                        name: name,
                        components: [],
                        inPorts: [],
                        inN: 0,
                        outPorts: [],
                        outN: 0,
                        outputs: [],
                        callback: null,
                        arcs: {},
                        start: function (name, order) {
                            var component = FBP.component(name);
                            component.graph = this.name;
                            this.components.push(name);
                            this.inPorts.push({
                                component: name,
                                order: order
                            });
                            this.inN = this.inN + 1;
                        },
                        arc: function (inPort, inOrder, outPort, outOrder) {
                            var outComponent = FBP.component(outPort);
                            if (!outComponent.graph || outComponent.graph !== this.name) {
                                outComponent.graph = this.name;
                                this.components.push(name);
                            }
                            this.arcs[inPort + inOrder] = {
                                component: outPort,
                                order: outOrder
                            };
                        },
                        end: function (name, order) {
                            this.outPorts.push({
                                component: name,
                                order: order
                            });
                            this.outN = this.outN + 1;
                        },
                        invoke: function () {
                            var i = 0;
                            this.callback = arguments[arguments.length - 1];
                            for (i; i < arguments.length - 1; i = i + 1) {
                                FBP.component(this.inPorts[i].component).addInput(arguments[i], this.inPorts[i].order);
                            }
                        },
                        getNext: function (prev, prevOrder) {
                            return this.arcs[prev + prevOrder] || 'end';
                        },
                        sendOutput: function (output, outOrder) {
                            this.outputs[outOrder] = output;
                            if (this.outputs.length === this.outN) {
                                // end execution!
                                this.callback.apply(FBP.graph(this.name), [ null ].concat(this.outputs));
                                FBP.cleanup(this.name);
                            }
                        }
                    };
                constructor(F);
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
