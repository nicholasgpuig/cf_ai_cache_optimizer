// Pages Function to proxy requests to the Worker
interface Env {
  WORKER_API: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export async function onRequest(context: { env: Env }) {
  try {
    const { env } = context;

    // Call the Worker via service binding
    const workerRequest = new Request('https://fake-host/api/test', {
      method: 'GET',
    });

    const response = await env.WORKER_API.fetch(workerRequest);

    // Return the response with CORS headers for local dev
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error calling Worker:', error);
    return new Response(JSON.stringify({
      error: 'Failed to call Worker',
      message: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
