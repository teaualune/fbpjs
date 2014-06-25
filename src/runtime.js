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
    that.tic = _FBP.profiler.timestamp();
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
            if (portObj.map && component.inPorts.length === 1 && component.outPorts.length === 1)
                // TODO support more complicated networks
                runtime.mapInvoke(component);
            else
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
        start = _FBP.profiler.timestamp();
        component.body.apply(runtime.states[component.name], args);
        _FBP.profiler.collect(component, _FBP.profiler.timestamp() - start);
    },

    sendOutput: function (output, portCode, _err) {
        var runtime = this,
            err = _err || null,
            results = {
                interval: _FBP.profiler.timestamp() - runtime.tic
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
    },

    mapInvoke: function (component) {
        var runtime = this,
            inPorts = component.inPorts,
            outPorts = component.outPorts,
            i = 0,
            dest = runtime.arcs[_FBP.portEncode(component.name, outPorts[0])],
            inputs = runtime.inputs[component.name][inPorts[0]],
            outputs = [],
            outputCounter = 0;
        if (inputs.length && inputs.length <= 1) {
            runtime.invokeComponent(component);
            return;
        }
        for (i = 0; i < inputs.length; i = i + 1) {
            (function (ii) {
                var input = inputs[ii],
                    output = function (err, value) {
                        if (!err) {
                            outputs[ii] = value;
                        }
                        outputCounter += 1;
                        if (outputCounter === inputs.length) {
                            if (dest.end) {
                                runtime.sendOutput(outputs, _FBP.portEncode(dest));
                            } else {
                                runtime.addInput(dest, outputs);
                            }
                        }
                    };
                _FBP.async(function () {
                    var start = _FBP.profiler.timestamp();
                    component.body.apply(runtime.states[component.name], [ input, output ]);
                    _FBP.profiler.collect(component, _FBP.profiler.timestamp() - start);
                });
            }(i));
        }
    }
};

}(FBP, _FBP));
