// Pages Function to handle file uploads
interface Env {
  WORKER_API: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export async function onRequest(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;

    // Forward the request to the Worker's /api/upload endpoint
    const workerRequest = new Request('https://fake-host/api/upload', {
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
    console.error('Error calling Worker upload endpoint:', error);
    return new Response(JSON.stringify({
      error: 'Failed to upload',
      message: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
