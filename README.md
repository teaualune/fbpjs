FBP.js
======

A minified and simple implementation of flow-based programming for generic-purpose JavaScript
---------------------------------------------------------------------------------------

### Introduction

The purpose of the project is to implement a minified, easy-to-configure library for flow-based programming \(FBP\) paradigm.

It is not designed for completed features like the original FBP idea, fault tolerance, and complicated flow control.

Feel free to modify and redistribute the project if you like.

### Usage

See `examples/test.html` for usage and documentations in the comments.

### Instructions

FBP requires 3 phases of implementations:

1. Component creation
2. Network definition
3. Network invocation

The APIs for each phase are explained as below.

#### Create Components

`FBP.component(config);`

Defines a component.
The `config` argument is a plain object containing the following properties:

* `name` \(Required\)
  * The name of the component.
* `inPorts` \(Required\)
  * An array of in port names.
  * If there is only one in port, a string indicating port name is accepted as well.
* `outPorts` \(Required\)
  * An array of out port names.
  * If there is only one out port, a string indicating port name is accepted as well.
* `body` \(Required\)
  * The component body.
  * Note that the function arguments should align with in ports and out ports. For instance a component with in ports `['x', 'y']` and out ports `['output']` should have a body that looks like `function (x, y, out) { ... }`.
  * Upon invoked, the out port arguments are sent with callback functions. The callback function signiture is `function (err, value)`.
    * If a non-null value is sent to `err` the network execution terminates immediately.
    * `value` will be sent to where the port is connected to.
* `state` \(Optional\)
  * A plain object to store component states.
  * To access the `state` object in the component body, call `this` keyword.
  * If not specified, the `state` object will be an empty object by default.
  * Feel free to store any JSON-safe variables into the `state` object.

#### Define a Network: the Imperative Way

`network = FBP.define(name, constructor);`

Defines a network and return it.

The `name` argument defines the name of the network, and can be used as the key to retrieve the network.

The `constructor` argument is a function with single argument `F`; it contains necessary methods to construct a network:

* `F.init(component, port);`
  * Setup an initial port of the network.
  * `component` is the component name.
  * `port` specifies one of the in ports of `component`.
  * Every network should have at least one initial port since it is the invocation point of the network.
* `F.connect(fromName, fromPort, toName, toPort);`
  * Setup a connection between components.
  * As the argument name refers, the `fromPort` of the `fromName` component will be connected to the `toPort` of the `toName` component.
* `F.end(component, port);`
  * Setup a end port of the network.
  * Arguments usage is similar to `F.init()` where `port` specifies one of the out ports.
  * Note that end ports are not necessary for a network. It depends on your design.

The `FBP.define()` function will return the network object containing its definitions and an invocation method, thus can be chained.

#### Define a Network: the Declarative Way

`network = FBP.define(config);`

Defines a network and return it.
The `config` argument is a plain object containing the following properties: \(all of them are required\)

* `name`: the name of the network.
* `init`
  * An array of initial port names.
  * If there is only one inital port, a string indicating port name is accepted as well.
  * To specify an initial port, connect the component name and port name with a `.` character.
  For example, the `x` port of `add` component should be referred as `add.x`.
* `connections`
  * A plain object containing connections. Each connection connects two components.
  * The keys and values are port names \(written in the same format as above\) where key port is connected to value port.
  For example, to connect the `output` port of `add` component to the `x` port of `mul` component, add a key-value pair to `connections`: `'add.output': 'mul.x'`.
* `end`
  * An array of end port names.
  * If there is only one end port, a string indicating port name is accepted as well.
  * They should be written in the same format as above.

#### Invoke a Network

`network = FBP.network(name);`

Get the network object by specifying its `name`.

`network.go(inputs, callback);`

Invoke the network.

The `inputs` argument is a plain object containing input values to the network.

For each key-value pair in `inputs`, the key is the initial port name and the value is the input value for it.

Initial port name can be specified by connecting `.` character, like what we have done in [declarative network definition](#define-a-network-the-declarative-way).

The `callback` argument is a function with signiture `function (err, result)`.

If any error occurs while execution, the `callback` function will be invoked where `err` argument is sent with the error.

Note that if the network contains multiple end ports, they will invoke the callback function individually with corresponding output value.

The `results` argument contains several properties:
* `output`: the output value sent to the end port.
* `port`: the name of the end port that invokes callback function.
* `interval`: the execution time of the network \(in milliseconds\).

### Build from Source

#### Prerequisite

* Install [Node.js](http://nodejs.org) and make sure that `npm` is installed as well.
* Install Grunt command line interface via `npm install -g grunt-cli`; `sudo` might be needed for this command.

#### Bulid

1. Run `npm install` to grab build dependencies.
2. Run `grunt` to build both plain JavaScript file and minified version.

### Reference

* [Flow-based programming](http://en.wikipedia.org/wiki/Flow-based_programming)
* [NoFlo](http://noflojs.org), the most famous FBP implementation for JavaScript \(written in CoffeeScript\)

### License

[MIT License](http://opensource.org/licenses/MIT)
