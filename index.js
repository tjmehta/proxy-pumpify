var assert = require('assert')
var EventEmitter = require('events').EventEmitter
var isFunction = require('101/is-function')
var last = require('101/last')
var pumpify = require('pumpify')
var stream = require('stream')

var assertArgs = require('assert-args')

var ReadableStream = stream.Readable
var WritableStream = stream.Writable

var assertStream = function (val) {
  return assert(isFunction(val.pipe), '"...streams" must be streams')
}
var isObject = function (val) {
  return typeof val === 'object'
}
var isString = function (val, allowed) {
  return typeof val === 'string' && ~allowed.indexOf(val)
}
var streamKeys = Object.keys(ReadableStream.prototype)
  .concat(
    Object.keys(WritableStream.prototype)
  )
  .concat(
    Object.keys(EventEmitter.prototype)
  )

module.exports = createProxyPumpify()

module.exports.obj = createProxyPumpify(true)

function createProxyPumpify (objectMode) {
  /**
   * create a transform, that also proxies properties and methods to the original
   * @param  {Stream} ...streams
   * @param  {Object} opts
   * @param  {*} opts.inherits methods to inherit
   * @param  {Function|Object} opts
   * @return {Stream} dest-like stream w/ methods proxied to specified option
   */
  return function proxyPumpify (/* ...streams, opts */) {
    var args = assertArgs(arguments, {
      '...streams': assertStream,
      '[opts]': 'object'
    })
    var streams = args.streams
    var opts = args.opts || {}
    assert(streams.length, '`streams` must be atleast two streams')
    var inherits = opts.inherits || streams[0]
    assert(isObject(inherits) || isString(inherits, ['src', 'dest']),
      '`opts.inherits` must be "src", "dest", or an object')
    if (inherits === 'src') {
      inherits = streams[0]
    } else if (inherits === 'dest') {
      inherits = last(streams)
    }

    var pipelineStream = opts.objectMode || objectMode
      ? pumpify.obj.apply(pumpify, streams)
      : pumpify.apply(pumpify, streams)
    var streamMethods = getBoundMethods(pipelineStream, streamKeys)
    var proxyPipelineStream = Object.create(inherits, streamMethods)

    return proxyPipelineStream
  }
}

function getBoundMethods (obj, methodNames) {
  return methodNames.reduce(function (memo, methodName) {
    var method = obj[methodName]
    /* istanbul ignore next */
    if (typeof method === 'function') {
      memo[methodName] = {
        configurable: true,
        enumerable: true,
        writable: true,
        value: method.bind(obj)
      }
    }
    return memo
  }, {})
}
