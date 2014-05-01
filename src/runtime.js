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
    that.tic = Date.now();
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
            dest;
        for (i; i < inPorts.length; i = i + 1) {
            args[i] = runtime.inputs[component.name][inPorts[i]];
        }
        for (i = 0; i < outPorts.length; i = i + 1) {
            fromCode = _FBP.portEncode(component.name, outPorts[i]);
            dest = runtime.arcs[fromCode];
            args[i + inPorts.length] = runtime.outPortSender(dest);
        }
        component.body.apply(runtime.states[component.name], args);
    },

    sendOutput: function (output, portCode, _err) {
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

    outPortSender: function (dest) {
        var runtime = this;
        return function (err, value) {
            if (err) {
                runtime.sendOutput(null, null, err);
            } else if (dest.end) {
                runtime.sendOutput(value, _FBP.portEncode(dest));
            } else {
                runtime.addInput(dest, value);
            }
        };
    }
};

}(FBP, _FBP));
