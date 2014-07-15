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
    if (_FBP.profiler.enabled) that.tic = _FBP.profiler.timestamp();
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
            if (portObj.map)
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
        if (_FBP.profiler.enabled) start = _FBP.profiler.timestamp();
        component.body.apply(runtime.states[component.name], args);
        if (_FBP.profiler.enabled) _FBP.profiler.collect(component, _FBP.profiler.timestamp() - start);
    },

    sendOutput: function (output, portCode, _err) {
        var runtime = this,
            err = _err || null,
            results = {};
            if (_FBP.profiler.enabled) results.interval = _FBP.profiler.timestamp() - runtime.tic;
        if (!err) {
            runtime.inputs[runtime.nname][portCode] = output;
            results.output = output;
            results.port = portCode;
            if (_FBP.profiler.enabled) {
                results.profile = {};
                _FBP.objIterate(_FBP._n[runtime.nname].components, function (cname) {
                    var component = _FBP._c[cname];
                    results.profile[cname] = _FBP.profiler.average(component.profile);
                    _FBP.profiler.save(component);
                });
            }
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
            j = 0,
            dest,// = runtime.arcs[_FBP.portEncode(component.name, outPorts[0])],
            inputs = runtime.inputs[component.name],
            inputLength = _FBP.objMax(inputs),
            args = Array(inputLength),
            tempArg,
            outputs = Array(outPorts.length),
            outputsCounter = Array(outPorts.length);
        for (i = 0; i < inputLength; i = i + 1) {
            tempArg = Array(inPorts.length + outPorts.length);
            for (j = 0; j < inPorts.length; j = j + 1) {
                tempArg[j] = inputs[inPorts[j]][i];
            }
            args[i] = tempArg;
        }
        for (i = 0; i < outPorts.length; i = i + 1) {
            outputs[i] = Array(inputLength);
            outputsCounter[i] = 0;
        }
        for (i = 0; i < inputLength; i = i + 1) {
            (function (ii) {
                var j = 0,
                    input = args[ii];
                for (j; j < outPorts.length; j = j + 1) {
                    input[j + inPorts.length] = (function (jj, fromCode) {
                        var dest = runtime.arcs[fromCode];
                        return function (err, value) {
                            outputs[jj][ii] = err ? null : value;
                            outputsCounter[jj] += 1;
                            if (outputsCounter[jj] === inputLength) {
                                if (dest.end) {
                                    runtime.sendOutput(outputs[jj], fromCode);
                                } else {
                                    runtime.addInput(dest, outputs[jj]);
                                }
                            }
                        };
                    }(j, _FBP.portEncode(component.name, outPorts[j])));
                }
                _FBP.async(function () {
                    if (_FBP.profiler.enabled) var start = _FBP.profiler.timestamp();
                    component.body.apply(runtime.states[component.name], input);
                    if (_FBP.profiler.enabled) _FBP.profiler.collect(component, _FBP.profiler.timestamp() - start);
                });
            }(i));
        }
    }
};

}(FBP, _FBP));
