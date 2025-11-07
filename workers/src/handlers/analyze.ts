import { HandlerFunction, AnalyzeRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { calculateStatistics } from '../utils/statistics';

/**
 * Analyze endpoint handler
 * Receives log data and performs analysis
 */
const TOP_K_ASN = 10;
const MIN_REQUESTS_THRESHOLD = 5;
const TOP_K_QUERY_PARAMS = 10;
const TOP_K_ORIGIN_IPS = 5;

export const handleAnalyze: HandlerFunction = async (request, env, ctx) => {
	try {
		// Parse request body
		const body = await request.json() as AnalyzeRequest;
		const { logs, metadata } = body;

		console.log(`Analyzing ${metadata.totalEntries} log entries from ${metadata.fileCount} files`);

		// Aggregate data structure - collect raw data during iteration
		const aggregate: Record<string, {
			requests: number;
			cacheHits: number;
			cacheMisses: number;
			cacheExpires: number;
			cacheBypasses: number;
			cacheStale: number;
			bytes: number[];
			originMs: number[];
			wafActions: Record<string, number>;
			botScores: number[];
			threatScores: number[];
			asnCounts: Record<number, number>;
			originIPs: Record<string, {
				requests: number;
				responseTimes: number[];
				clientErrors: number; // 4xx
				serverErrors: number; // 5xx
			}>;
			queryParams: Record<string, {
				requests: number;
				cacheHits: number;
				responseTimes: number[];
			}>;
			statusCodes: Record<number, number>;
			methods: Record<string, number>;
		}> = {};

		// STEP 1: Iterate through logs and collect data
		for (const entry of logs) {
			const url = entry.URL;
			const existing = aggregate[url] ?? {
				requests: 0,
				cacheHits: 0,
				cacheMisses: 0,
				cacheExpires: 0,
				cacheBypasses: 0,
				cacheStale: 0,
				bytes: [],
				originMs: [],
				wafActions: {},
				botScores: [],
				threatScores: [],
				asnCounts: {},
				originIPs: {},
				queryParams: {},
				statusCodes: {},
				methods: {}
			};

			// Increment request count
			existing.requests += 1;

			// Track cache status
			if (entry.CacheStatus === 'HIT') existing.cacheHits += 1;
			else if (entry.CacheStatus === 'MISS') existing.cacheMisses += 1;
			else if (entry.CacheStatus === 'EXPIRED') existing.cacheExpires += 1;
			else if (entry.CacheStatus === 'BYPASS') existing.cacheBypasses += 1;
			else if (entry.CacheStatus === 'STALE') existing.cacheStale += 1;

			// Collect bytes and origin response times
			existing.bytes.push(entry.Bytes);
			existing.originMs.push(entry.OriginResponseDurationMs);

			// Track WAF actions
			existing.wafActions[entry.WAFAction] = (existing.wafActions[entry.WAFAction] ?? 0) + 1;

			// Collect bot and threat scores
			existing.botScores.push(entry.BotScore);
			existing.threatScores.push(entry.ThreatScore);

			// Track ASN distribution
			existing.asnCounts[entry.ASN] = (existing.asnCounts[entry.ASN] ?? 0) + 1;

			// Track origin IP distribution
			if (entry.OriginIP) {
				const ipData = existing.originIPs[entry.OriginIP] ?? {
					requests: 0,
					responseTimes: [],
					clientErrors: 0,
					serverErrors: 0
				};
				ipData.requests += 1;
				ipData.responseTimes.push(entry.OriginResponseDurationMs);
				if (entry.EdgeResponseStatus >= 400 && entry.EdgeResponseStatus < 500) {
					ipData.clientErrors += 1;
				}
				if (entry.EdgeResponseStatus >= 500) {
					ipData.serverErrors += 1;
				}
				existing.originIPs[entry.OriginIP] = ipData;
			}

			// Track query parameter impact
			const queryParam = entry.ClientRequestQuery || '(none)';
			const queryData = existing.queryParams[queryParam] ?? {
				requests: 0,
				cacheHits: 0,
				responseTimes: []
			};
			queryData.requests += 1;
			if (entry.CacheStatus === 'HIT') queryData.cacheHits += 1;
			queryData.responseTimes.push(entry.ResponseTimeMs);
			existing.queryParams[queryParam] = queryData;

			// Track status codes
			existing.statusCodes[entry.EdgeResponseStatus] = (existing.statusCodes[entry.EdgeResponseStatus] ?? 0) + 1;

			// Track HTTP methods
			existing.methods[entry.Method] = (existing.methods[entry.Method] ?? 0) + 1;

			aggregate[url] = existing;
		}

		// STEP 2: Calculate aggregate statistics for each endpoint
		const endpointMetrics = Object.entries(aggregate).map(([url, data]) => {
			// Calculate origin IP distribution metrics
			const originIPDistribution: Record<string, {
				requests: number;
				avgResponseMs: number;
				clientErrorRate: number;
				serverErrorRate: number;
			}> = {};

			Object.entries(data.originIPs)
				.filter(([_, ipData]) => ipData.requests >= MIN_REQUESTS_THRESHOLD)
				.sort((a, b) => b[1].requests - a[1].requests)
				.slice(0, TOP_K_ORIGIN_IPS)
				.forEach(([ip, ipData]) => {
					const avgResponseMs = ipData.responseTimes.length > 0
						? ipData.responseTimes.reduce((a, b) => a + b, 0) / ipData.responseTimes.length
						: 0;
					const clientErrorRate = ipData.requests > 0 ? ipData.clientErrors / ipData.requests : 0;
					const serverErrorRate = ipData.requests > 0 ? ipData.serverErrors / ipData.requests : 0;

					originIPDistribution[ip] = {
						requests: ipData.requests,
						avgResponseMs,
						clientErrorRate,
						serverErrorRate
					};
				});

			// Calculate query parameter impact metrics
			const queryParamImpact: Record<string, {
				requests: number;
				cacheHitRate: number;
				avgResponseMs: number;
			}> = {};

			Object.entries(data.queryParams)
				.filter(([_, paramData]) => paramData.requests >= MIN_REQUESTS_THRESHOLD)
				.sort((a, b) => b[1].requests - a[1].requests)
				.slice(0, TOP_K_QUERY_PARAMS)
				.forEach(([param, paramData]) => {
					const cacheHitRate = paramData.requests > 0 ? paramData.cacheHits / paramData.requests : 0;
					const avgResponseMs = paramData.responseTimes.length > 0
						? paramData.responseTimes.reduce((a, b) => a + b, 0) / paramData.responseTimes.length
						: 0;

					queryParamImpact[param] = {
						requests: paramData.requests,
						cacheHitRate,
						avgResponseMs
					};
				});

			// Sort ASNs by request count and take top TOP_K_ASN
			const topASNs: Record<number, number> = {};
			Object.entries(data.asnCounts)
				.sort((a, b) => b[1] - a[1])
				.slice(0, TOP_K_ASN)
				.forEach(([asn, count]) => {
					topASNs[Number(asn)] = count;
				});

			return {
				EndpointURL: url,
				TotalRequests: data.requests,
				CacheHits: data.cacheHits,
				CacheMisses: data.cacheMisses,
				CacheExpires: data.cacheExpires,
				CacheBypasses: data.cacheBypasses,
				OriginResponseTimes: calculateStatistics(data.originMs),
				ByteAmounts: calculateStatistics(data.bytes),
				WAFActions: data.wafActions,
				BotScores: calculateStatistics(data.botScores),
				ThreatScores: calculateStatistics(data.threatScores),
				TopASNs: topASNs,
				OriginIPDistribution: originIPDistribution,
				QueryParamImpact: queryParamImpact,
				StatusCodeDistribution: data.statusCodes,
				MethodDistribution: data.methods
			};
		});

		return successResponse(endpointMetrics);
		
	} catch (error) {
		console.error('Analysis error:', error);
		return errorResponse(`Analysis failed: ${String(error)}`);
	}
};
