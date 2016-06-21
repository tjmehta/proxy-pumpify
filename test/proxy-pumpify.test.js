var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach

var expect = require('code').expect
var http = require('http')
var url = require('url')

var httpProxy = require('http-proxy');
var jsonStream = require('through-json')
var request = require('supertest')
var through2 = require('through2')

var pumpify = require('../index.js')

var reverseStream = function () {
  return through2(function (chunk, enc, cb) {
    cb(null, chunk.toString().split('').reverse().join(''))
  })
}

var incValsStream = function () {
  return through2.obj(function (json, enc, cb) {
    var key = Object.keys(json)[0]
    json[key]++
    cb(null, json)
  })
}

describe('proxy-pumpify', function () {

  describe('request transform', function () {
    beforeEach(function () {
      var self = this
      this.server = http.createServer(function (req, res) {
        // transform body and respond
        var stream = pumpify(req, reverseStream())
        // stream.url get's proxied to req..
        var parsedUrl = url.parse(stream.url, true)
        res.setHeader('key', parsedUrl.query.key)
        // finally pipe transformed req to res
        stream.pipe(res)
      })
    })

    it('should transform a request', function (done) {
      request(this.server)
        .post('/?key=val')
        .send('hello')
        .expect('key', 'val')
        .expect(200, 'olleh')
        .end(done)
    })
  })

  describe('response transform', function () {
    beforeEach(function (done) {
      // hello-world server
      this.helloServer = http.createServer(function (req, res) {
        res.end('hello world')
      })
      this.helloServer.port = 4040
      this.helloServer.listen(4040, done)
    })
    beforeEach(function () {
      var self = this
      var proxy = httpProxy.createProxyServer();
      this.server = http.createServer(function (req, res) {
        var transformRes = pumpify(reverseStream(), res, { inherits: 'dest' })
        proxy.web(req, transformRes, {
          target: 'http://localhost:' + self.helloServer.port
        })
      })
    })
    afterEach(function (done) {
      this.helloServer.close(done)
    })

    it('should transform a response', function (done) {
      request(this.server)
        .post('/')
        .expect(200, 'dlrow olleh')
        .end(done)
    })
  })

  describe('coverage', function() {
    describe('inherit from src (req transform)', function () {
      beforeEach(function () {
        var self = this
        this.server = http.createServer(function (req, res) {
          // transform body and respond
          var stream = pumpify(req, reverseStream(), { inherits: 'src' })
          // stream.url get's proxied to req..
          var parsedUrl = url.parse(stream.url, true)
          res.setHeader('key', parsedUrl.query.key)
          // finally pipe transformed req to res
          stream.pipe(res)
        })
      })

      it('should transform a request', function (done) {
        request(this.server)
          .post('/?key=val')
          .send('hello')
          .expect('key', 'val')
          .expect(200, 'olleh')
          .end(done)
      })
    })

    describe('object mode (req transform)', function () {
      beforeEach(function () {
        var self = this
        this.server = http.createServer(function (req, res) {
          // transform body and respond
          var stream = pumpify.obj(req, jsonStream.parse(), incValsStream())
          // stream.url get's proxied to req..
          var parsedUrl = url.parse(stream.url, true)
          res.setHeader('key', parsedUrl.query.key)
          // finally pipe transformed req to res
          stream.pipe(jsonStream.stringify()).pipe(res)
        })
      })

      it('should transform a request', function (done) {
        request(this.server)
          .post('/?key=val')
          .send('{"foo":1}')
          .expect('key', 'val')
          .expect(200, '{"foo":2}')
          .end(done)
      })
    })

    describe('invalid inherits', function () {
      it('should throw an error', function () {
        expect(function () {
          pumpify(jsonStream.parse(), jsonStream.parse(), { inherits: 'blah'})
        }).to.throw(/opts.inherits/)
      })
    })
  })
})
