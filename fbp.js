window.FBP = {
    _c: {},
    _g: {}
};

// component getter & setter
FBP.component = function () {
    if (arguments.length === 1) {
        // getter
        return this._c[arguments[0]];
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
            this._c[names[i]] = {
                name: names[i],
                addInput: function (input, order) {
                    var that = this;
                    that.inputs[order] = input;
                    that.inN = that.inN + 1;
                    if (that.inN === that._inN) {
                        that.inputs.push(function (outOrder, output) {
                            // catch outputs and send to next component
                            var next = FBP.graph(that.graph).getNext(that.name, outOrder);
                            if (next === 'end') {
                                FBP.graph(that.graph).sendOutput(output, outOrder);
                            } else {
                                FBP.component(next.component).addInput(output, next.order);
                            }
                        });
                        this.task.apply(this, this.inputs);
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
}

// graph getter
FBP.graph = function (name) {
    return this._g[name];
}

// graph constructor
FBP.setup = function (name, constructor) {
    var F = {
            name: name,
            inPorts: [],
            inN: 0,
            start: function (component, order) {
                FBP.component(component).graph = this.name;
                this.inPorts.push({
                    component: FBP.component(component).name,
                    order: order
                });
                this.inN = this.inN + 1;
            },
            arc: function (inPort, inOrder, out, outOrder) {
                this.arcs[inPort + inOrder] = {
                    component: out,
                    order: outOrder
                };
            },
            end: function (component, order) {
                FBP.component(component).graph = this.name;
                this.out.push({
                    component: FBP.component(component).name,
                    order: order
                });
                this.outN = this.outN + 1;
            },
            invoke: function () {
                var i = 0;
                this.callback = arguments[arguments.length - 1];
                for (i; i < arguments.length - 1; i = i + 1) {
                    console.log(this.inPorts[i]);
                    FBP.component(this.inPorts[i].component).addInput(arguments[i], this.inPorts[i].order);
                }
            },
            callback: null,
            arcs: {},
            out: [],
            outputs: [],
            outN: 0,
            getNext: function (prev, prevOrder) {
                return this.arcs[prev + prevOrder] || 'end';
            },
            sendOutput: function (output, outOrder) {
                this.outputs[outOrder] = output;
                if (this.outputs.length === this.outN) {
                    // end execution!
                    this.callback.apply(FBP.graph(this.name), [ null ].concat(this.outputs));
                }
            }
        };
    constructor(F);
    this._g[arguments[0]] = F;
}
