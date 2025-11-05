// Request/Response types for the Worker

export interface AnalyzeRequest {
	logs: unknown[];
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
