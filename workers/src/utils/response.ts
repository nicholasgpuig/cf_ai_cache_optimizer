// Helper functions for creating responses

export function jsonResponse(data: unknown, status: number = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export function errorResponse(message: string, status: number = 500): Response {
	return jsonResponse({
		error: true,
		message
	}, status);
}

export function successResponse(data: unknown): Response {
	return jsonResponse(data, 200);
}
