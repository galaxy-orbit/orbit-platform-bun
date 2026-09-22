import { describe, test, expect, afterAll } from 'bun:test';
import { BunHttpAdapter } from './bun-adapter';

const adapter = new BunHttpAdapter({ port: 0, hostname: '127.0.0.1' });

adapter.addRoute('GET', '/', async () => new Response(JSON.stringify({ hello: 'orbit' }), { headers: { 'content-type': 'application/json' } }));
adapter.addRoute('GET', '/users/:id', (_req, params) => new Response(JSON.stringify({ id: params.id })));
adapter.addRoute('POST', '/echo', async (req) => new Response(JSON.stringify({ echoed: await req.json() })));
adapter.addRoute('GET', '/error', () => { throw new Error('boom'); });
adapter.addRoute('GET', '/timeout', () => { throw Object.assign(new Error('Request timeout'), { name: 'TimeoutError' }); });
adapter.use(async (req, next) => {
  if (new URL(req.url).pathname === '/middleware') {
    return new Response('middleware says hi');
  }
  return next();
});
adapter.addRoute('GET', '/middleware', () => new Response('direct'));

let baseUrl = '';

afterAll(async () => {
  await adapter.close();
});

describe('BunHttpAdapter', () => {
  test('listens on ephemeral port and routes GET /', async () => {
    const server = await adapter.listen();
    baseUrl = `http://${server.hostname}:${server.port}`;
    const res = await fetch(baseUrl + '/');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: 'orbit' });
  });

  test('extracts path params', async () => {
    const res = await fetch(baseUrl + '/users/42');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: '42' });
  });

  test('parses JSON body on POST', async () => {
    const res = await fetch(baseUrl + '/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ echoed: { a: 1 } });
  });

  test('returns 404 JSON for unknown routes', async () => {
    const res = await fetch(baseUrl + '/missing');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ statusCode: 404, message: 'Not Found' });
  });

  test('handles thrown errors as 500', async () => {
    const res = await fetch(baseUrl + '/error');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('boom');
  });

  test('maps TimeoutError to 408', async () => {
    const res = await fetch(baseUrl + '/timeout');
    expect(res.status).toBe(408);
  });

  test('middleware runs before routing and can short-circuit', async () => {
    const res = await fetch(baseUrl + '/middleware');
    expect(await res.text()).toBe('middleware says hi');
  });

  test('server instance accessible', () => {
    expect(adapter.getServer()).not.toBeNull();
  });

  test('close stops the server', async () => {
    await adapter.close();
    expect(adapter.getServer()).toBeNull();
    // reopen for subsequent tests / teardown consistency
    await adapter.listen();
  });
});
