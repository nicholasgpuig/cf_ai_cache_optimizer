/**
 * Pages Function for /api/chat
 * Proxies chat requests to the Worker API
 */

interface Env {
  WORKER_API: Fetcher;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;

    // Forward the request to the Worker
    const response = await env.WORKER_API.fetch(request);

    return response;
  } catch (error) {
    console.error('Chat proxy error:', error);
    return new Response(JSON.stringify({
      error: true,
      message: `Chat request failed: ${String(error)}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
