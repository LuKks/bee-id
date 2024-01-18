const test = require('brittle')
const Hyperbee = require('hyperbee')
const Hypercore = require('hypercore')
const RAM = require('random-access-memory')
const beeTransaction = require('bee-transaction')
const { nextId, autoId, putWithId, idEncoding } = require('./index.js')

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

test('auto id', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  for (let count = 1; count <= 15; count++) {
    const id = await autoId(db, '/sensors')
    await db.put('/sensors/' + id, { data: Math.random() }, { keyEncoding: idEncoding })
    t.ok(await db.get('/sensors/' + count, { keyEncoding: idEncoding }))
  }
})

test.skip('benchmark', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  console.time('putWithId')
  for (let i = 0; i < 5000; i++) {
    await putWithId(db, '/a', { data: Math.random() })
  }
  console.timeEnd('putWithId')

  console.time('autoId')
  for (let i = 0; i < 5000; i++) {
    const id = await autoId(db, '/b')
    await db.put('/b/' + id, { data: Math.random() }, { keyEncoding: idEncoding })
  }
  console.timeEnd('autoId')
})

// It probably doesn't make sense to support it
/* test.skip('both are compatible with each other', async function (t) {
  const storage = new Hypercore(RAM)
  const db = new Hyperbee(storage, { keyEncoding: 'json', valueEncoding: 'json' })

  const id = await autoId(db, '/sensors')
  await db.put('/sensors/' + id, { data: Math.random() })

  const id2 = await autoId(db, '/sensors')
  await db.put('/sensors/' + id2, { data: Math.random() })

  console.log(await db.get('/sensors/0')) // => null
  console.log(await db.get('/sensors/1'))
  console.log(await db.get('/sensors/2'))
  console.log(await db.get('/sensors/3')) // => null

  await putWithId(db, '/sensors', async function (batch, id) {
    t.is(id, 3)
    await batch.put('/sensors/' + id, { data: Math.random() })
  })

  await putWithId(db, '/sensors', async function (batch, id) {
    t.is(id, 4)
    await batch.put('/sensors/' + id, { data: Math.random() })
  })

  await putWithId(db, '/sensors', async function (batch, id) {
    t.is(id, 5)
    await batch.put('/sensors/' + id, { data: Math.random() })
  })

  console.log(await db.get('/sensors/3'))
  console.log(await db.get('/sensors/4'))
  console.log(await db.get('/sensors/5')) // => null
}) */
