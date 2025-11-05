// Pages Function to analyze logs
interface Env {
  WORKER_API: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;

    // Forward to Worker's /api/analyze endpoint
    const workerRequest = new Request('https://fake-host/api/analyze', {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const response = await env.WORKER_API.fetch(workerRequest);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error calling Worker analyze endpoint:', error);
    return new Response(JSON.stringify({
      error: 'Failed to analyze',
      message: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
