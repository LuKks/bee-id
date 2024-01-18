const beeTransaction = require('bee-transaction')
const lexint = require('lexicographic-integer')
const b4a = require('b4a')

const utf8 = string('utf-8') // c.raw.string

function putWithId (db, sub, callback) {
  return beeTransaction(db, async function (batch) {
    const id = await nextId(batch, sub)

    if (typeof callback === 'function') {
      await callback(batch, id)
    } else {
      const value = callback
      await batch.put(sub + '/' + id, value, { keyEncoding: idEncoding })
    }

    return id
  })
}

async function nextId (instance, sub) {
  let id = 1

  for await (const entry of instance.createReadStream({ gt: sub + '/', lt: sub + '0', keyEncoding: idEncoding, reverse: true, limit: 1 })) { // eslint-disable-line no-unreachable-loop
    const k = entry.key.split('/')
    const lastId = k.pop()

    id = parseInt(lastId, 10) + 1

    break
  }

  return id
}

// TODO: Assumes utf-8, and `/` as separator
// TODO: Could provide a helper for Hyperbee constructor to avoid repeating the `keyEncoding` option
const idEncoding = {
  preencode (state, key) {
    const k = key.split('/')

    if (k.length === 3) {
      const id = k.pop()
      k.push(lexint.pack(id, 'hex'))
    }

    utf8.preencode(state, k.join('/'))
  },
  encode (state, key) {
    const k = key.split('/')

    if (k.length === 3) {
      const id = k.pop()
      k.push(lexint.pack(id, 'hex'))
    }

    utf8.encode(state, k.join('/'))
  },
  decode (state) {
    const key = utf8.decode(state)

    const k = key.split('/')
    const id = k.pop()

    k.push(lexint.unpack(id))

    return k.join('/')
  }
}

function string (encoding) {
  return {
    preencode (state, s) {
      state.end += b4a.byteLength(s, encoding)
    },
    encode (state, s) {
      state.start += b4a.write(state.buffer, s, state.start, encoding)
    },
    decode (state) {
      const s = b4a.toString(state.buffer, encoding, state.start)
      state.start = state.end
      return s
    }
  }
}

module.exports = {
  idEncoding,
  nextId,
  putWithId
}
