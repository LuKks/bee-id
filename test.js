const test = require('brittle')
const Hyperbee = require('hyperbee')
const Hypercore = require('hypercore')
const RAM = require('random-access-memory')
const beeTransaction = require('bee-transaction')
const { putWithId, nextId, idEncoding } = require('./index.js')

test('put with id - value', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  for (let count = 1; count <= 15; count++) {
    const id = await putWithId(db, '/sensors', { data: Math.random() })

    t.is(id, count)

    t.ok(await db.get('/sensors/' + count, { keyEncoding: idEncoding }))
  }
})

test('put with id - callback', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  for (let count = 1; count <= 15; count++) {
    await putWithId(db, '/sensors', async function (batch, id) {
      t.is(id, count)
      await batch.put('/sensors/' + id, { data: Math.random() }, { keyEncoding: idEncoding })
    })

    t.ok(await db.get('/sensors/' + count, { keyEncoding: idEncoding }))
  }
})

test('bee transaction and next id', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  for (let count = 1; count <= 15; count++) {
    const id = await beeTransaction(db, async function (b) {
      const id = await nextId(b, '/sensors')

      t.is(id, count)

      await b.put('/sensors/' + id, { data: Math.random() }, { keyEncoding: idEncoding })

      return id
    })

    t.is(id, count)

    t.ok(await db.get('/sensors/' + count, { keyEncoding: idEncoding }))
  }
})

test('read stream by order of insertion', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  for (let count = 1; count <= 15; count++) {
    await putWithId(db, '/sensors', { data: Math.random() })
  }

  let count = 0

  for await (const entry of db.createReadStream({ keyEncoding: idEncoding })) {
    t.is(entry.key, '/sensors/' + (++count))
  }

  t.is(count, 15)
})

test.skip('benchmark', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  console.time('putWithId')
  for (let i = 0; i < 5000; i++) {
    await putWithId(db, '/a', { data: Math.random() })
  }
  console.timeEnd('putWithId')
})
