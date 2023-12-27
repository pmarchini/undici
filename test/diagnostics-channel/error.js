'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

let diagnosticsChannel

try {
  diagnosticsChannel = require('diagnostics_channel')
} catch {
  // t.skip('missing diagnostics_channel') define how to signal a skipped test
  process.exit(0)
}

const { Client } = require('../..')
const { createServer } = require('http')

test('connect error', async (t) => {
  const server = createServer((req, res) => {
    res.destroy()
  })
  t.after(() => server.close.bind(server))

  const reqHeaders = {
    foo: undefined,
    bar: 'bar'
  }

  let _req
  diagnosticsChannel.channel('undici:request:create').subscribe(({ request }) => {
    _req = request
  })

  diagnosticsChannel.channel('undici:request:error').subscribe(({ request, error }) => {
    assert.equal(_req, request)
    assert.equal(error.code, 'UND_ERR_SOCKET')
    server.close() // TODO: is this the right place to close the server?
  })

  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`, {
      keepAliveTimeout: 300e3
    })
    t.after(client.close.bind(client))

    client.request({
      path: '/',
      method: 'GET',
      headers: reqHeaders
    }, (err, data) => {
      assert.equal(err.code, 'UND_ERR_SOCKET')
    })
  })
})
