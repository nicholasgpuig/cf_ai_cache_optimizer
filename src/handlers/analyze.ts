import { HandlerFunction, AnalyzeRequest, AnalyzeResponse, EndpointMetric, WAFAction, HTTPMethod } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { calculateStatistics } from '../utils/statistics';

/**
 * Analyze endpoint handler
 * Receives log data and performs analysis
 */
const TOP_K_ASN = 10
export const handleAnalyze: HandlerFunction = async (request, env, ctx) => {
	try {
		// Parse request body
		const body = await request.json() as AnalyzeRequest;
		const { logs, metadata } = body;

		console.log(`Analyzing ${metadata.totalEntries} log entries from ${metadata.fileCount} files`);

		// Aggregate data structure - collect raw data during iteration
		const aggregate = new Map<string, {
			requests: number;
			cacheHits: number;
			cacheMisses: number;
			cacheExpires: number;
			cacheBypasses: number;
			cacheStale: number;
			bytes: number[];
			originMs: number[];
			wafActions: Map<WAFAction, number>;
			botScores: number[];
			threatScores: number[];
			asnCounts: Map<number, number>;
			originIPs: Map<string, {
				requests: number;
				responseTimes: number[];
				clientErrors: number; // 4xx
				serverErrors: number; // 5xx
			}>;
			queryParams: Map<string, {
				requests: number;
				cacheHits: number;
				responseTimes: number[];
			}>;
			statusCodes: Map<number, number>;
			methods: Map<HTTPMethod, number>;
		}>();

		// STEP 1: Iterate through logs and collect data
		for (const entry of logs) {
			const url = entry.URL;
			const existing = aggregate.get(url) ?? {
				requests: 0,
				cacheHits: 0,
				cacheMisses: 0,
				cacheExpires: 0,
				cacheBypasses: 0,
				cacheStale: 0,
				bytes: [],
				originMs: [],
				wafActions: new Map<WAFAction, number>(),
				botScores: [],
				threatScores: [],
				asnCounts: new Map<number, number>(),
				originIPs: new Map<string, {
					requests: number;
					responseTimes: number[];
					clientErrors: number;
					serverErrors: number;
				}>(),
				queryParams: new Map<string, {
					requests: number;
					cacheHits: number;
					responseTimes: number[];
				}>(),
				statusCodes: new Map<number, number>(),
				methods: new Map<HTTPMethod, number>()
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
			const wafCount = existing.wafActions.get(entry.WAFAction) ?? 0;
			existing.wafActions.set(entry.WAFAction, wafCount + 1);

			// Collect bot and threat scores
			existing.botScores.push(entry.BotScore);
			existing.threatScores.push(entry.ThreatScore);

			// Track ASN distribution
			const asnCount = existing.asnCounts.get(entry.ASN) ?? 0;
			existing.asnCounts.set(entry.ASN, asnCount + 1);

			// Track origin IP distribution
			if (entry.OriginIP) {
				const ipData = existing.originIPs.get(entry.OriginIP) ?? {
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
				existing.originIPs.set(entry.OriginIP, ipData);
			}

			// Track query parameter impact
			const queryParam = entry.ClientRequestQuery || '(none)';
			const queryData = existing.queryParams.get(queryParam) ?? {
				requests: 0,
				cacheHits: 0,
				responseTimes: []
			};
			queryData.requests += 1;
			if (entry.CacheStatus === 'HIT') queryData.cacheHits += 1;
			queryData.responseTimes.push(entry.ResponseTimeMs);
			existing.queryParams.set(queryParam, queryData);

			// Track status codes
			const statusCount = existing.statusCodes.get(entry.EdgeResponseStatus) ?? 0;
			existing.statusCodes.set(entry.EdgeResponseStatus, statusCount + 1);

			// Track HTTP methods
			const methodCount = existing.methods.get(entry.Method) ?? 0;
			existing.methods.set(entry.Method, methodCount + 1);

			aggregate.set(url, existing);
		}

		// STEP 2: Calculate aggregate statistics for each endpoint
		const endpointMetrics: EndpointMetric[] = Array.from(aggregate.entries()).map(([url, data]) => {
			// Calculate origin IP distribution metrics
			const originIPDistribution = new Map<string, {
				requests: number;
				avgResponseMs: number;
				clientErrorRate: number;
				serverErrorRate: number;
			}>();

			for (const [ip, ipData] of data.originIPs.entries()) {
				const avgResponseMs = ipData.responseTimes.length > 0
					? ipData.responseTimes.reduce((a, b) => a + b, 0) / ipData.responseTimes.length
					: 0;
				const clientErrorRate = ipData.requests > 0 ? ipData.clientErrors / ipData.requests : 0;
				const serverErrorRate = ipData.requests > 0 ? ipData.serverErrors / ipData.requests : 0;

				originIPDistribution.set(ip, {
					requests: ipData.requests,
					avgResponseMs,
					clientErrorRate,
					serverErrorRate
				});
			}

			// Calculate query parameter impact metrics
			const queryParamImpact = new Map<string, {
				requests: number;
				cacheHitRate: number;
				avgResponseMs: number;
			}>();

			for (const [param, paramData] of data.queryParams.entries()) {
				const cacheHitRate = paramData.requests > 0 ? paramData.cacheHits / paramData.requests : 0;
				const avgResponseMs = paramData.responseTimes.length > 0
					? paramData.responseTimes.reduce((a, b) => a + b, 0) / paramData.responseTimes.length
					: 0;

				queryParamImpact.set(param, {
					requests: paramData.requests,
					cacheHitRate,
					avgResponseMs
				});
			}

			// Sort ASNs by request count and take top TOP_K_ASN
			const topASNs = new Map<number, number>(
				Array.from(data.asnCounts.entries())
					.sort((a, b) => b[1] - a[1])
					.slice(0, TOP_K_ASN)
			);

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
