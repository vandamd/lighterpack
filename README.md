LighterPack
===========
LighterPack helps you track the gear you bring on adventures.

How to run Lighterpack
-----------

1. Install Bun
2. ```$ git clone https://github.com/galenmaly/lighterpack.git```
3. Install dependencies ```$ bun install```
4. Start the app ```$ bun run dev```
5. go to http://localhost:8080

This fork serves the local Vue app, but proxies sign in, saving, account, sharing and CSV requests to https://lighterpack.com. To point at a different compatible API, set `LIGHTERPACK_API_BASE_URL`, for example:

```$ LIGHTERPACK_API_BASE_URL=https://lighterpack.com bun run dev```

Proxied responses include `x-lighterpack-proxy: live`, so you can confirm a request went to the live API with:

```$ curl -I http://localhost:8080/r/uwixcu```
