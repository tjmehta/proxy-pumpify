# proxy-pumpify
pipeline streams (combine) and also proxy non-stream methods. useful for advanced stream transforms like req and res.

# Installation
```bash
npm i --save proxy-pumpify
```

# Usage
Example: transform a request
```js
require('http').createServer(function (req, res) {
  // reverseStream reverses a stream
  var reqTransform = pumpify(req, reverseStream())
  // all methods and properties of request should work on reqTransform
  var url = reqTransform.url
  var headers = reqTransform.headers
  // ...
  // this will pipe the reversed req body to res
  reqTransform.pipe(res)
})
```

Example: transform a response
```js
var httpProxy = require('http-proxy')
var proxy = httpProxy.createProxyServer();

require('http').createServer(function (req, res) {
  // reverseStream reverses a stream
  // resTransform inherits from res: inherits takes 'src', 'dest', or any object to inherit from
  const resTransform = pumpify(reverseStream(), res, { inherits: 'dest' })
  // resTransform can be used in place of `res` w/ http-proxy, bc it inherits from `res`
  // resTransform will reverse google's response body before piping it to res
  proxy.web(req, resTransform, {
    target: 'http://google.com'
  })
})
```

# License
MIT