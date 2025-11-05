import { HandlerFunction } from '../types';
import { successResponse, errorResponse } from '../utils/response';

type ChatMessage = {
	role: 'user' | 'assistant';
	content: string;
};

export const handleChat: HandlerFunction = async (request, env, ctx) => {
	try {
		// Parse request body
		const body = await request.json();
		const { messages } = body as { messages: ChatMessage[] };

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return errorResponse('Invalid request: messages array is required', 400);
		}

		// System instructions for CDN cache optimization
		const instructions = `You are an AI assistant specialized in Cloudflare CDN cache optimization and performance analysis.
You help users understand their CDN logs, identify performance issues, and provide actionable recommendations to improve cache hit rates, reduce origin load, and optimize content delivery.

Key areas of expertise:
- Cache hit rate optimization
- Origin response time analysis
- Query parameter impact on caching
- WAF and security patterns
- Bot and threat detection
- ASN and geographic distribution analysis
- HTTP status code patterns
- Load balancer health

Always provide specific, actionable advice based on the metrics and patterns in the user's data.
If you receive a json object, you will analyze the data and provide your advice in natural language.
Format your responses using markdown for better readability. Use headings, lists, bold, and emphasis where appropriate to organize information clearly.`;

		// Build conversation context by joining all messages
		// Format: "User: <message>\nAssistant: <response>\n..."
		const conversationContext = messages
			.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
			.join('\n\n');

		// Get the latest user message
		const latestMessage = messages[messages.length - 1];
		if (latestMessage.role !== 'user') {
			return errorResponse('Last message must be from user', 400);
		}

		// Call Workers AI with conversation context
		const aiResponse = await env.AI.run('@cf/openai/gpt-oss-120b', {
			instructions: instructions,
			input: conversationContext,
		}) as any;

		// Extract the text from the nested response structure
		// Response format: aiResponse.output[1].content[0].text
		let responseText = 'Sorry, I could not generate a response.';

		if (aiResponse?.output && Array.isArray(aiResponse.output) && aiResponse.output.length > 1) {
			const messageOutput = aiResponse.output[1];
			if (messageOutput?.type === 'message' && Array.isArray(messageOutput.content) && messageOutput.content.length > 0) {
				const textContent = messageOutput.content[0];
				if (textContent?.type === 'output_text' && textContent.text) {
					responseText = textContent.text;
				}
			}
		}

		return successResponse({ response: responseText });
	} catch (error) {
		console.error('Chat error:', error);
		return errorResponse(`Chat failed: ${String(error)}`, 500);
	}
};
