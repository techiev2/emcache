# emcache

A minimal in-memory cache backed by a datastore of your choice.

## Rationale

 - Why another in-memory cache now? 
    
    Fair question that. After all, there's nothing new under the sun. The primary push, is to have the developer in me not die, amidst all the JIRAs that move me away from comfort zones.

- So, is that all? No valid reasons?

  Won't quite jump that direction, yet. I had a specific use case of our applications using [`node-cache`](https://github.com/node-cache/node-cache) but not handling some parts that come home often.

- Are there no alternatives?

  To be honest, there is nothing new under the sun, again. But, what's a developer who doesn't want their own implementation? Jokes aside, while `node-cache` provides a good set of APIs to access the in-memory cache, it is not backed. Not to mention, some concerns we have specific to our stack.

- Well, what are they? 
  
  Considering some cases where our processes reboot, this becomes an awkward space to be in. A good choice then, would be to have the existing in-memory cache work with `process.on` and `SIGINT`/`SIGTERM`, but no side-cars here, apparently.

  Add to it, the flexibility such a cache would provide in becoming a terminator, shouting **I'm back** .

- So, does it cover the rest of the APIs that `node-cache` or alternatives provide?

  No, not yet. It is as basic as it gets, at the moment. A setter with a fluent API that doubles as a delete, a getter, and an entire cache retrieval is what it supports at the top level API. `flush`, `stats`, and QoL APIs, are things I'd like over time.


## API

- `get(key)`
- `set(key, value, expiryInMS)`
- `values`
- `stats`

## Examples

### Initialisation
  ```javascript
  const cacheName = 'emcache'
  let cache = new EmCache({
    name: cacheName,
    inSink: null,
    outSink: null,
    syncOnSet: false
  })
```

### Set a key with an expiry.
```javascript
cache.set('AMZ-1001', { name: 'Amazon', description: `Amazon test` }, 1000)
```

### Set a key and chain another set operation.
```javascript
cache
  .set('AMZ-1001', { name: 'Amazon', description: `Amazon test` }, 1000)
  .set('FK-1002', { name: 'Flipkart', description: 'Flipkart shopping' })
```

### Delete a key. Setting a null/undefined deletes the key.
```javascript
const timer = setTimeout(() => {
  cache.set('AMZ-1001', null)  // DELETE operator
  clearTimeout(timer)
}, 3000)
```

### Get the stats of a particular cache.
```javascript
console.log(JSON.stringify(cache.stats, null, 1))
{
 "keys": {
  "count": 1,
  "keys": [
   "TE-003"
  ]
 },
 "expiries": {}
}
```

## Parameters

### syncOnSet

  The syncOnSet boolean parameter provides a way to continuously sync/flush the cache to a store.

  `Note: Use this parameter with caution since it introduces write time overheads.`

### inSink

The inSink parameter to the constructor provides a datasource to initialise the cache. This is a function that returns a data object that initialises the cache, like a redis hash.
  
If not provided, EmCache uses a `caches` file at the local path as a JSON serialised source.
```javascript
  const { createClient } = require('redis');
  const client = createClient()
  client.connect()
  async function inSink() {
    const data = await client.HGETALL(cacheName)
    // const data = JSON.parse(await client.GET(cacheName || '{}'))
    return data || {}
  }
  let cache = new EmCache({
    name: cacheName,
    inSink,
    outSink: null
  })
```

### outSink

  The outSink parameter to the constructor provides a datasource to flush the cache into, when the process exits, terminates, or is terminated. This is a function that pushes data to your backing store.
  
If not provided, EmCache uses a `caches` file at the local path as a JSON serialised source.
```javascript
  const { createClient } = require('redis');
  const client = createClient()
  client.connect()
  async function inSink() {
    const data = await client.HGETALL(cacheName)
    // const data = JSON.parse(await client.GET(cacheName || '{}'))
    return data || {}
  }
  async function outSink(data) {
    await client.HMSET(cacheName, Object.entries(data))
    // await client.SET(cacheName, JSON.stringify(data))
  }
  let cache = new EmCache({
    name: cacheName,
    inSink,
    outSink
  })
```