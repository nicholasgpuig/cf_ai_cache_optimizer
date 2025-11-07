import { handleAnalyze } from '../analyze';
import { LogEntry } from '../../types';

describe('handleAnalyze', () => {
	const mockEnv = {} as Env;
	const mockCtx = {} as ExecutionContext;

	const createLogEntry = (overrides?: Partial<LogEntry>): LogEntry => ({
		EdgeStartTimestamp: '2024-01-01T00:00:00Z',
		EdgeEndTimestamp: '2024-01-01T00:00:01Z',
		ClientRequestQuery: '',
		EdgeResponseStatus: 200,
		CacheStatus: 'HIT',
		OriginIP: '1.2.3.4',
		OriginTLSVersion: 'TLSv1.3',
		OriginResponseDurationMs: 50,
		WAFAction: 'ALLOW',
		BotScore: 10,
		ThreatScore: 0,
		ASN: 13335,
		ClientSSLProtocol: 'TLSv1.3',
		ClientCipher: 'AEAD-AES128-GCM-SHA256',
		Method: 'GET',
		URL: '/api/test',
		ResponseTimeMs: 100,
		Bytes: 1024,
		...overrides
	});

	test('should return error for invalid JSON', async () => {
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: 'invalid json'
		});

		const response = await handleAnalyze(request, mockEnv, mockCtx);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBe(true);
	});

	test('should successfully analyze single log entry', async () => {
		const logs = [createLogEntry()];
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({
				logs,
				metadata: {
					fileCount: 1,
					totalEntries: 1,
					timestamp: new Date().toISOString()
				}
			})
		});

		const response = await handleAnalyze(request, mockEnv, mockCtx);

		expect(response.status).toBe(200);
		const metrics = await response.json();
		expect(Array.isArray(metrics)).toBe(true);
		expect(metrics.length).toBe(1);
		expect(metrics[0]).toMatchObject({
			EndpointURL: '/api/test',
			TotalRequests: 1,
			CacheHits: 1,
			CacheMisses: 0
		});
	});

	test('should correctly aggregate cache statistics', async () => {
		const logs = [
			createLogEntry({ CacheStatus: 'HIT', URL: '/api/endpoint' }),
			createLogEntry({ CacheStatus: 'MISS', URL: '/api/endpoint' }),
			createLogEntry({ CacheStatus: 'HIT', URL: '/api/endpoint' }),
			createLogEntry({ CacheStatus: 'EXPIRED', URL: '/api/endpoint' }),
			createLogEntry({ CacheStatus: 'BYPASS', URL: '/api/endpoint' })
		];

		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({
				logs,
				metadata: { fileCount: 1, totalEntries: 5, timestamp: new Date().toISOString() }
			})
		});

		const response = await handleAnalyze(request, mockEnv, mockCtx);
		const metrics = await response.json();

		expect(metrics[0]).toMatchObject({
			EndpointURL: '/api/endpoint',
			TotalRequests: 5,
			CacheHits: 2,
			CacheMisses: 1,
			CacheExpires: 1,
			CacheBypasses: 1
		});
	});

	test('should calculate statistics for metrics', async () => {
		const logs = [
			createLogEntry({ Bytes: 1000, OriginResponseDurationMs: 10 }),
			createLogEntry({ Bytes: 2000, OriginResponseDurationMs: 20 }),
			createLogEntry({ Bytes: 3000, OriginResponseDurationMs: 30 })
		];

		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({
				logs,
				metadata: { fileCount: 1, totalEntries: 3, timestamp: new Date().toISOString() }
			})
		});

		const response = await handleAnalyze(request, mockEnv, mockCtx);
		const metrics = await response.json();

		expect(metrics[0].ByteAmounts).toHaveProperty('Mean', 2000);
		expect(metrics[0].ByteAmounts).toHaveProperty('Median', 2000);
		expect(metrics[0].OriginResponseTimes).toHaveProperty('Mean', 20);
	});

	test('should track multiple endpoints separately', async () => {
		const logs = [
			createLogEntry({ URL: '/api/endpoint1' }),
			createLogEntry({ URL: '/api/endpoint2' }),
			createLogEntry({ URL: '/api/endpoint1' })
		];

		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({
				logs,
				metadata: { fileCount: 1, totalEntries: 3, timestamp: new Date().toISOString() }
			})
		});

		const response = await handleAnalyze(request, mockEnv, mockCtx);
		const metrics = await response.json();

		expect(metrics.length).toBe(2);
		const endpoint1 = metrics.find((m: any) => m.EndpointURL === '/api/endpoint1');
		const endpoint2 = metrics.find((m: any) => m.EndpointURL === '/api/endpoint2');

		expect(endpoint1.TotalRequests).toBe(2);
		expect(endpoint2.TotalRequests).toBe(1);
	});

	test('should track WAF actions and status codes', async () => {
		const logs = [
			createLogEntry({ WAFAction: 'ALLOW', EdgeResponseStatus: 200 }),
			createLogEntry({ WAFAction: 'ALLOW', EdgeResponseStatus: 200 }),
			createLogEntry({ WAFAction: 'BLOCK', EdgeResponseStatus: 403 })
		];

		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({
				logs,
				metadata: { fileCount: 1, totalEntries: 3, timestamp: new Date().toISOString() }
			})
		});

		const response = await handleAnalyze(request, mockEnv, mockCtx);
		const metrics = await response.json();

		expect(metrics[0].WAFActions).toEqual({ ALLOW: 2, BLOCK: 1 });
		expect(metrics[0].StatusCodeDistribution).toEqual({ 200: 2, 403: 1 });
	});
});
