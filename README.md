# @galaxy-stack/orbit-platform-bun

[![npm version](https://img.shields.io/npm/v/@galaxy-stack/orbit-platform-bun.svg)](https://www.npmjs.com/package/@galaxy-stack/orbit-platform-bun)
[![docs](https://img.shields.io/badge/docs-galaxy--orbit--framework.vercel.app-blue)](https://galaxy-orbit-framework.vercel.app)

Part of the [Orbit framework](https://github.com/galaxy-orbit/orbit) — a NestJS-style backend framework for [Bun](https://bun.sh).

## Installation

```bash
bun add @galaxy-stack/orbit-platform-bun
```

# @galaxy-stack/orbit-platform-bun

Bun-native HTTP platform for the Orbit framework — request handling, timeout middleware, CORS, static assets and error mapping on top of `Bun.serve`.

## Installation

```bash
bun add @galaxy-stack/orbit-platform-bun
```

## Notes

- `TimeoutError` maps to HTTP 408 (Request Timeout)
- Route decorators read Orbit core metadata keys (`orbit:route:path`, `orbit:route:method`)
- Designed to be consumed by `OrbitFactory` — you rarely import this package directly
