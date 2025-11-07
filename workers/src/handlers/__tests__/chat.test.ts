import { handleChat } from '../chat';

describe('handleChat', () => {
	const mockCtx = {} as ExecutionContext;

	const createMockEnv = (aiResponse?: any): Env => ({
		AI: {
			run: jest.fn().mockResolvedValue(aiResponse || {
				output: [
					{},
					{
						type: 'message',
						content: [
							{
								type: 'output_text',
								text: 'AI generated response'
							}
						]
					}
				]
			})
		}
	} as any);

	test('should return error for invalid request body', async () => {
		const mockEnv = createMockEnv();
		const request = new Request('http://localhost/api/chat', {
			method: 'POST',
			body: JSON.stringify({})
		});

		const response = await handleChat(request, mockEnv, mockCtx);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe(true);
	});

	test('should return error if last message is not from user', async () => {
		const mockEnv = createMockEnv();
		const request = new Request('http://localhost/api/chat', {
			method: 'POST',
			body: JSON.stringify({
				messages: [
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi' }
				]
			})
		});

		const response = await handleChat(request, mockEnv, mockCtx);

		expect(response.status).toBe(400);
	});

	test('should successfully process valid chat request', async () => {
		const mockEnv = createMockEnv();
		const messages = [
			{ role: 'user' as const, content: 'What is cache hit rate?' }
		];

		const request = new Request('http://localhost/api/chat', {
			method: 'POST',
			body: JSON.stringify({ messages })
		});

		const response = await handleChat(request, mockEnv, mockCtx);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.response).toBe('AI generated response');
		expect(mockEnv.AI.run).toHaveBeenCalledWith(
			'@cf/openai/gpt-oss-120b',
			expect.objectContaining({
				instructions: expect.stringContaining('CDN cache optimization'),
				input: expect.stringContaining('User: What is cache hit rate?')
			})
		);
	});

	test('should handle malformed AI response', async () => {
		const mockEnv = createMockEnv({ output: [] });
		const request = new Request('http://localhost/api/chat', {
			method: 'POST',
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'test' }]
			})
		});

		const response = await handleChat(request, mockEnv, mockCtx);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.response).toBe('Sorry, I could not generate a response.');
	});

	test('should handle AI errors gracefully', async () => {
		const mockEnv = {
			AI: {
				run: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
			}
		} as any;

		const request = new Request('http://localhost/api/chat', {
			method: 'POST',
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'test' }]
			})
		});

		const response = await handleChat(request, mockEnv, mockCtx);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBe(true);
	});
});
