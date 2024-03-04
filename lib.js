const { readFile, writeFileSync } = require('fs')
const isFunction = (fn) => typeof fn === 'function'
async function defaultLoader() {
  return new Promise((resolve) => {
    readFile('./caches', (err, cachedData) => {
      if (err) return resolve({})
      try {
        cachedData = JSON.parse(cachedData.toString())
      } catch (error) {
        cachedData = {}
      }
      resolve(cachedData)
    })
  })
}
let onExitDumper, caches;
function defaultDumper(signal, data) {
  try {
    writeFileSync('./caches', JSON.stringify(data || caches))
  } catch (error) {
    console.log(error);  process.exit(1);
  }
  signal = isNaN(+signal) ? 0 : signal
  if (signal) process.exit(signal)
}
class EmCache {
  key
  expiries = {}
  watcher
  loaded = false
  syncOnSet
  init
  queue = []
  /**
   * EmCache - A simple in-memory cache backed by a simpler JSON backed disk backup.
   * @param {String} params.name Name to use for cache access and identification.
   * @param {Function} params.inSink Function to pull cache data in. Defaults to local disk JSON read.
   * @param {Function} params.outSink Function to push cache data on exit/failure. Defaults to disk JSON write.
   * @param {Boolean} params.syncOnSet Boolean to indicate if cache should be synced on every set state.
   */
  constructor({name, inSink, outSink, syncOnSet}) {
    if (!name) throw new Error('Invalid invocation. Cache name is mandatory')
    this.key = name
    this.syncOnSet = syncOnSet
    this.init = new Date().getTime()
    if (!isFunction(inSink)) inSink = defaultLoader;
    inSink().then((results) => { this.loaded = true;  caches = results; })
    onExitDumper = isFunction(outSink) ? outSink : defaultDumper
    process.on('beforeExit', () => { onExitDumper('processExit', caches) });
    const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT']  // SIGKILL doesn't work on 14.x
    signals.map((signal) => {
      process.on(`${signal}`, () => {
        onExitDumper(signal, caches);
        process.exit(signal === 'SIGINT' ? 0 : 1)
      });
    });
    if (process.env.DEBUG) { this.watcher = setInterval(() => { console.log(JSON.stringify(caches, null, 1)) }, 1000) }
    let queueWatcher = setInterval(() => {
      if (this.loaded) {
        clearInterval(queueWatcher)
        while (this.queue.length) {
          const [fn, [key, value, expiryInMS]] = this.queue.shift(); fn.bind(this)(key, value, expiryInMS);
        }
        this.queue = []
      }
    }, 100)
  }
  /**
   * 
   * @param {String} key Key to set on the cache.
   * @param {Object} value Value to set on the cache.
   * @param {Number} expiryInMS Key expiry timing in milliseconds. Keys are automatically booted off after timeout.
   * @returns EmCache
   */
  set(key, value, expiryInMS) {
    if (!this.loaded) {
      this.queue = this.queue || []; this.queue.push([this.set, [key, value, expiryInMS]]); return this
    }
    const values = this.values
    if (value === null || value === undefined) {
      delete values[key]
    } else {
      Object.assign(values, {[key]: value})
    }
    caches[this.key] = values
    this.expiries[key] = isNaN(+expiryInMS) || !expiryInMS ? 0 : +expiryInMS
    if (this.expiries[key]) {
      setTimeout(() => {
        delete caches[this.key][key]
        this.watcher && clearInterval(this.watcher)
        onExitDumper(null, caches)
      }, this.expiries[key])
    }
    if (this.syncOnSet) onExitDumper(null, caches)
    return this
  }
  get(key) { return (this.values || {})[key] }
  get values() { return caches[this.key] || {} }
  get stats() {
    const { values = {}} = this
    const keys = Object.keys(values)
    const { length: count } = keys
    const expiries =
      Object.fromEntries(
        Object.entries(this.expiries)
          .filter(([_, expiry]) => !!expiry)
          .map(([key, expiryInMS]) => {
            const expiresAt = this.init + expiryInMS
            return [key, [{ expiryInMS, expiresAt}]]
          })
      )
    return {
      keys: {
        count,
        keys
      },
      expiries
    }
  }
}
module.exports = EmCache;