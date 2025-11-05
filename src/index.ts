import { DurableObject } from "cloudflare:workers";

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */


/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject {
	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async sayHello(name: string): Promise<string> {
		return `Hello, ${name}!`;
	}
}

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Test endpoint
		if (url.pathname === '/api/test') {
			console.log('Test endpoint called from Pages!');
			return new Response(JSON.stringify({
				message: 'Hello from Worker!',
				timestamp: new Date().toISOString(),
				success: true
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Analyze endpoint
		if (url.pathname === '/api/analyze' && request.method === 'POST') {
			try {
				const body = await request.json() as {
					logs: unknown[];
					metadata: {
						fileCount: number;
						totalEntries: number;
						timestamp: string;
					};
				};
				const { logs, metadata } = body;

				console.log(`Analyzing ${metadata.totalEntries} log entries from ${metadata.fileCount} files`);

				// Perform analysis on the logs
				const analysis = {
					totalEntries: logs.length,
					fileCount: metadata.fileCount,
					timestamp: metadata.timestamp,
					summary: {
						// Add your analysis logic here
						processed: true,
						message: `Successfully analyzed ${logs.length} log entries`
					}
				};

				return new Response(JSON.stringify(analysis), {
					headers: { 'Content-Type': 'application/json' }
				});
			} catch (error) {
				console.error('Analysis error:', error);
				return new Response(JSON.stringify({
					error: 'Analysis failed',
					message: String(error)
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// Original Durable Object example
		const stub = env.MY_DURABLE_OBJECT.getByName("foo");
		const greeting = await stub.sayHello("world");
		return new Response(greeting);
	},
} satisfies ExportedHandler<Env>;
