const { randomBytes } = require('crypto')
const { readFileSync } = require('fs')

const EmCache = require('./lib')

/**
 * outSink - Provider function to dump the current cache state to an out sink.
 * @param {String} event Event name that triggered sync out to out sink.
 * @param {Object} data Current cache state to sync out.
 */
async function outSink(event, data) {
  if (event && data) { console.log(JSON.stringify(data, null, 2)) }
}

/**
 * inSink - Provider function to load an existing cache or a default cache state.
 * @returns {Object} An object that represents an existing cache or a default cache.
 */
async function inSink() {
  try {
    return JSON.parse(readFileSync('./caches').toString())
  } catch (err) {
    return {}
  }
}

const cache = new EmCache({ name: 'products', inSink: null, outSink: null })
cache
  .set('AMZ-001', { name: 'Amazon', description: `Amazon test - Ref: ${randomBytes(20).toString('hex')}` }, 1000)
  .set('FK-002',  { name: 'Flipkart', description: `Flipkart shopping voucher - Ref: ${randomBytes(20).toString('hex')}` })
  .set('TE-003', { name: `Random test product ${randomBytes(20).toString('hex')}`})
const to = setTimeout(() => {
  console.log(cache.get('FK-002'))
  console.log(cache.set('FK-002').get('FK-002'))
  console.log(JSON.stringify(cache.stats, null, 1))
  clearTimeout(to)
}, 3000)

let i = 0
setInterval(() => {
  if (i === 1) {
    cache.flush()
  } else {
    console.log(JSON.stringify(cache.stats, null, 0))
  }
  i++
}, 1000)
