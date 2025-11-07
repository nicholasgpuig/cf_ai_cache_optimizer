import { jsonResponse, errorResponse, successResponse } from '../response';

describe('response utilities', () => {
	describe('jsonResponse', () => {
		test('should create JSON response with default status 200', async () => {
			const data = { message: 'test' };
			const response = jsonResponse(data);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(await response.json()).toEqual(data);
		});

		test('should create JSON response with custom status', async () => {
			const data = { error: 'not found' };
			const response = jsonResponse(data, 404);

			expect(response.status).toBe(404);
			expect(await response.json()).toEqual(data);
		});

		test('should handle different data types', async () => {
			const arrayData = [1, 2, 3];
			const response = jsonResponse(arrayData);

			expect(await response.json()).toEqual(arrayData);
		});
	});

	describe('errorResponse', () => {
		test('should create error response with default 500 status', async () => {
			const message = 'Internal server error';
			const response = errorResponse(message);

			expect(response.status).toBe(500);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toEqual({
				error: true,
				message
			});
		});

		test('should create error response with custom status', async () => {
			const response = errorResponse('Bad request', 400);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe(true);
			expect(body.message).toBe('Bad request');
		});
	});

	describe('successResponse', () => {
		test('should create success response with 200 status', async () => {
			const data = { result: 'success', count: 42 };
			const response = successResponse(data);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(await response.json()).toEqual(data);
		});

		test('should handle null data', async () => {
			const nullResponse = successResponse(null);
			expect(await nullResponse.json()).toBeNull();
		});
	});
});
