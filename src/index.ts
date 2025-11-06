import { handleTest } from './handlers/test';
import { handleAnalyze } from './handlers/analyze';
import { handleChat } from './handlers/chat';
import { errorResponse } from './utils/response';

/**
 * Cloudflare AI Cache Optimizer Worker
 *
 * This Worker provides API endpoints for log analysis and caching optimization.
 * It uses a router pattern to delegate requests to specific handlers.
 */

/**
 * Route map for API endpoints
 * Maps pathname patterns to their handler functions
 */
const routes: Record<string, (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>> = {
	'/api/test': handleTest,
	'/api/analyze': handleAnalyze,
	'/api/chat': handleChat,
};

export default {
	/**
	 * Main fetch handler - routes requests to appropriate handlers
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Check if we have a handler for this route
		const handler = routes[path];
		if (handler) {
			return handler(request, env, ctx);
		}

		// Fallback: Durable Object example
		if (path === '/') {
			return new Response("Default");
		}

		// Route not found
		return errorResponse(`Route not found: ${path}`, 404);
	},
} satisfies ExportedHandler<Env>;
