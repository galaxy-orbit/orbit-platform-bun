import type { Server } from 'bun';

export interface BunAdapterOptions {
  port?: number;
  hostname?: string;
  development?: boolean;
  reusePort?: boolean;
  maxRequestBodySize?: number;
}

export interface RouteHandler {
  method: string;
  path: string;
  handler: (request: Request, params: Record<string, string>) => Response | Promise<Response>;
}

export class BunHttpAdapter {
  private server: Server<any> | null = null;
  private routes: RouteHandler[] = [];
  private middlewares: ((request: Request, next: () => Promise<Response>) => Promise<Response>)[] = [];

  constructor(private options: BunAdapterOptions = {}) {
    this.options = {
      port: 3000,
      hostname: '0.0.0.0',
      development: process.env.NODE_ENV !== 'production',
      ...options,
    };
  }

  addRoute(method: string, path: string, handler: RouteHandler['handler']): void {
    this.routes.push({ method: method.toUpperCase(), path, handler });
  }

  use(middleware: (request: Request, next: () => Promise<Response>) => Promise<Response>): void {
    this.middlewares.push(middleware);
  }

  async listen(): Promise<Server<any>> {
    this.server = Bun.serve({
      port: this.options.port,
      hostname: this.options.hostname,
      development: this.options.development,
      reusePort: this.options.reusePort,
      maxRequestBodySize: this.options.maxRequestBodySize,
      fetch: async (request: Request) => {
        return this.handleRequest(request);
      },
    });

    console.log(`🚀 Orbit server running at http://${this.options.hostname}:${this.options.port}`);
    return this.server;
  }

  async close(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  getServer(): Server<any> | null {
    return this.server;
  }

  private async handleRequest(request: Request): Promise<Response> {
    const executeMiddlewares = async (index: number): Promise<Response> => {
      if (index < this.middlewares.length) {
        return this.middlewares[index](request, () => executeMiddlewares(index + 1));
      }
      return this.routeRequest(request);
    };

    try {
      return await executeMiddlewares(0);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async routeRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method !== method && route.method !== 'ALL') continue;

      const params = this.matchRoute(route.path, pathname);
      if (params !== null) {
        return route.handler(request, params);
      }
    }

    return new Response(JSON.stringify({ statusCode: 404, message: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private matchRoute(pattern: string, pathname: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      if (!pattern.endsWith('*')) return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart === '*') {
        return params;
      }

      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
        continue;
      }

      if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  private handleError(error: unknown): Response {
    console.error('Request error:', error);

    if (error instanceof Error && (error.name === 'TimeoutError' || error.message === 'Request timeout')) {
      return new Response(
        JSON.stringify({ statusCode: 408, message: 'Request Timeout', error: 'Request Timeout' }),
        { status: 408, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof Error) {
      const statusCode = (error as any).status || (error as any).statusCode || 500;
      return new Response(
        JSON.stringify({
          statusCode,
          message: error.message,
          error: error.name,
        }),
        {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        statusCode: 500,
        message: 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
