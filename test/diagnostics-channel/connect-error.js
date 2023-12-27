'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

let diagnosticsChannel

try {
  diagnosticsChannel = require('diagnostics_channel')
} catch {
  process.exit(0)
}

const { Client } = require('../..')

const connectError = new Error('custom error')

test('connect error', (t) => {
  let _connector
  diagnosticsChannel.channel('undici:client:beforeConnect').subscribe(({ connectParams, connector }) => {
    _connector = connector

    assert.equal(typeof _connector, 'function')
    assert.equal(Object.keys(connectParams).length, 6)

    const { host, hostname, protocol, port, servername } = connectParams

    assert.equal(host, 'localhost:1234')
    assert.equal(hostname, 'localhost')
    assert.equal(port, '1234')
    assert.equal(protocol, 'http:')
    assert.equal(servername, null)
  })

  diagnosticsChannel.channel('undici:client:connectError').subscribe(({ error, connectParams, connector }) => {
    assert.equal(Object.keys(connectParams).length, 6)
    assert.equal(_connector, connector)

    const { host, hostname, protocol, port, servername } = connectParams

    assert.equal(error, connectError)
    assert.equal(host, 'localhost:1234')
    assert.equal(hostname, 'localhost')
    assert.equal(port, '1234')
    assert.equal(protocol, 'http:')
    assert.equal(servername, null)
  })

  const client = new Client('http://localhost:1234', {
    connect: (_, cb) => { cb(connectError, null) }
  })

  t.after(() => client.close.bind(client))

  client.request({
    path: '/',
    method: 'GET'
  }, (err, data) => {
    assert.equal(err, connectError)
  })
})
