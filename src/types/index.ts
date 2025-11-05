// Request/Response types for the Worker

// Cloudflare CDN Log Entry types
export type CacheStatus = "HIT" | "MISS" | "EXPIRED" | "BYPASS" | "STALE" | "UPDATING" | "REVALIDATED";
export type WAFAction = "ALLOW" | "BLOCK" | "CHALLENGE" | "LOG";
export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type TLSVersion = "TLSv1.1" | "TLSv1.2" | "TLSv1.3";

export type LogEntry = {
	EdgeStartTimestamp: string;
	EdgeEndTimestamp: string;
	ClientRequestQuery: string;
	EdgeResponseStatus: number;
	CacheStatus: CacheStatus;
	OriginIP: string | null;
	OriginTLSVersion: TLSVersion | null;
	OriginResponseDurationMs: number;
	WAFAction: WAFAction;
	BotScore: number;
	ThreatScore: number;
	ASN: number;
	ClientSSLProtocol: TLSVersion;
	ClientCipher: string;
	Method: HTTPMethod;
	URL: string;
	ResponseTimeMs: number;
	Bytes: number;
};

export type EndpointMetric = {
	EndpointURL: string;
	TotalRequests: number;
	CacheHits: number;
	CacheMisses: number;
	CacheExpires: number;
	CacheBypasses: number;
	OriginResponseTimes: Statistics;
	ByteAmounts: Statistics;
	WAFActions: Map<WAFAction, number>;
	BotScores: Statistics;
	ThreatScores: Statistics;
	TopASNs: Map<number, number>;
	OriginIPDistribution: Map<string, {
		requests: number;
		avgResponseMs: number;
		clientErrorRate: number;  // 4xx errors / total requests to this IP
		serverErrorRate: number; // 5xx errors / total
	}>;
	QueryParamImpact: Map<string, {  // Query param → cache performance
		requests: number;
		cacheHitRate: number;
		avgResponseMs: number;
	}>;
	StatusCodeDistribution: Map<number, number>;  // Helps detect error patterns
	MethodDistribution: Map<HTTPMethod, number>;

}

export type Statistics = {
	Median: number;
	Mean: number;
	NinetyFifthPercentile: number;
	NinetyNinthPercentile: number;
}

export interface AnalyzeRequest {
	logs: LogEntry[];
	metadata: {
		fileCount: number;
		totalEntries: number;
		timestamp: string;
	};
}

export interface AnalyzeResponse {
	totalEntries: number;
	fileCount: number;
	timestamp: string;
	summary: {
		processed: boolean;
		message: string;
	};
}

export interface ErrorResponse {
	error: string;
	message: string;
}

export interface TestResponse {
	message: string;
	timestamp: string;
	success: boolean;
}

// Handler function type
export type HandlerFunction = (
	request: Request,
	env: Env,
	ctx: ExecutionContext
) => Promise<Response>;
