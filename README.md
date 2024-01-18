# bee-id

Incremental ID for Hyperbee

```
npm i bee-id
```

## Usage

```js
const { idEncoding, nextId, putWithId } = require('bee-id')
const beeTransaction = require('bee-transaction')

const db = new Hyperbee(...)

// Single put
const id = await putWithId(db, '/users', { email, password })

// Single callback put
const id2 = await putWithId(db, '/users', async function (b, userId) {
  await b.put('/users/' + userId, { email, password }, { keyEncoding: idEncoding })
})

// Multiple puts
const ids = await beeTransaction(db, async function (b) {
  const userId = await nextId(b, '/users')
  const profileId = await nextId(b, '/profiles')

  await b.put('/users/' + userId, { email, password }, { keyEncoding: idEncoding })
  await b.put('/profiles/' + profileId, { name, age }, { keyEncoding: idEncoding })

  return { userId, profileId }
})
```

## API

#### `idEncoding`

Helper for encoding and decoding lexicographical id keys for ordering.

#### `const id = await putWithId(db, sub, dataOrCallback)`

Insert a new entry with an incremental ID.

Single put with value:

```js
const { putWithId, idEncoding } = require('bee-id')

const id = await putWithId(db, '/users', { username: 'abc' })

console.log(await db.get('/users/1', { keyEncoding: idEncoding }))
```

Single put with callback:

```js
const { putWithId, idEncoding } = require('bee-id')

const id = await putWithId(db, '/users', async function (b, userId) {
  if (await b.get('/index/email/' + email)) throw new Error('Already exists')

  await b.put('/users/' + userId, { email, password }, { keyEncoding: idEncoding })
  await b.put('/index/email/' + email, userId)
})

console.log(await db.get('/users/2', { keyEncoding: idEncoding }))
```

Note: Returning in any callback is optional.

#### `const id = await nextId(batch, sub)`

Finds the last entry to calculate and return the incremented ID.

Multiple puts:

```js
const { nextId, idEncoding } = require('bee-id')
const beeTransaction = require('bee-transaction')

const ids = await beeTransaction(db, async function (b) {
  if (await b.get('/index/email/' + email)) throw new Error('Already exists')

  const userId = await nextId(b, '/users')
  const profileId = await nextId(b, '/profiles')

  await b.put('/users/' + userId, { email, password }, { keyEncoding: idEncoding })
  await b.put('/profiles/' + profileId, { name, age }, { keyEncoding: idEncoding })
  await b.put('/index/email/' + email, userId)

  return { userId, profileId }
})

console.log(await db.get('/users/3', { keyEncoding: idEncoding }))
console.log(await db.get('/profiles/1', { keyEncoding: idEncoding }))
```

## Notes

Don't reuse the sub like `/users/...` for other purposes because it will mess up the internals.

## License

MIT
