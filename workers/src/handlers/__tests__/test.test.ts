import { handleTest } from '../test';

describe('handleTest', () => {
	const mockRequest = new Request('http://localhost/api/test');
	const mockEnv = {} as Env;
	const mockCtx = {} as ExecutionContext;

	test('should return success response with correct structure', async () => {
		const response = await handleTest(mockRequest, mockEnv, mockCtx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');

		const body = await response.json();
		expect(body).toHaveProperty('message');
		expect(body).toHaveProperty('timestamp');
		expect(body).toHaveProperty('success');
		expect(body.success).toBe(true);
	});

	test('should return valid ISO timestamp', async () => {
		const response = await handleTest(mockRequest, mockEnv, mockCtx);
		const body = await response.json();

		const timestamp = new Date(body.timestamp);
		expect(timestamp.toISOString()).toBe(body.timestamp);
	});
});
