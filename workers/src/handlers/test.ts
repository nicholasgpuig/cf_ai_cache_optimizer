import { HandlerFunction, TestResponse } from '../types';
import { successResponse } from '../utils/response';

/**
 * Test endpoint handler
 * Returns a simple JSON response to verify Worker connectivity
 */
export const handleTest: HandlerFunction = async (request, env, ctx) => {
	console.log('Test endpoint called from Pages!');

	const response: TestResponse = {
		message: 'Hello from Worker!',
		timestamp: new Date().toISOString(),
		success: true
	};

	return successResponse(response);
};
