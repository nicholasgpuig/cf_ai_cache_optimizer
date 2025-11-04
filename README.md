# Cloudflare AI Cache Optimizer

A Cloudflare Worker and Pages application for optimizing AI cache performance through log analysis.

## Project Structure

```
.
├── src/                    # Cloudflare Worker code
│   ├── index.ts           # Worker entry point with Durable Objects
│   └── generate_logs.ts   # Log generation utilities
├── web/                    # Cloudflare Pages (React app)
│   ├── src/               # React source code
│   ├── functions/         # Pages Functions (API routes)
│   ├── dist/              # Built output
│   └── wrangler.jsonc     # Pages configuration
└── wrangler.jsonc         # Worker configuration
```

## Architecture

This project uses **Cloudflare Workers** and **Cloudflare Pages** in the same repository:

- **Worker** (`src/`): Backend API with Durable Objects for stateful operations
- **Pages** (`web/`): React frontend with service binding to the Worker
- **Service Binding**: Pages communicates with Worker via Cloudflare's service bindings

## Getting Started

### Prerequisites

- Node.js 20.15.1+
- npm 10+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

```bash
# Install root dependencies
npm install

# Install web dependencies
cd web
npm install
```

## Development

### Option 1: Local Development with Deployed Worker

This is the simplest approach for testing the integration.

1. **Deploy the Worker:**
   ```bash
   wrangler deploy
   ```

2. **Build and run Pages locally:**
   ```bash
   cd web
   npm run build
   wrangler pages dev dist --service WORKER_API=cf-ai-cache-optimizer --port 8789
   ```

3. **Open your browser:**
   Navigate to `http://localhost:8789`

4. **Test the integration:**
   Click the "Test Worker API" button to verify the Worker connection

### Option 2: Fully Local Development

Run both Worker and Pages locally for faster iteration.

1. **Terminal 1 - Run Worker locally:**
   ```bash
   wrangler dev --port 8787
   ```

2. **Terminal 2 - Run Pages with local Worker binding:**
   ```bash
   cd web
   npm run build
   wrangler pages dev dist --service WORKER_API=cf-ai-cache-optimizer@local --port 8789
   ```

3. **Open your browser:**
   Navigate to `http://localhost:8789`

### Development Scripts

#### Worker (root directory)
```bash
wrangler dev          # Run Worker locally
wrangler deploy       # Deploy Worker to production
```

#### Pages (web directory)
```bash
npm run dev           # Run Vite dev server (frontend only, no Worker integration)
npm run dev:wrangler  # Build and run with Wrangler (includes Worker integration)
npm run build         # Build for production
npm run deploy        # Build and deploy to Cloudflare Pages
```

## Testing the Worker-Pages Integration

The application includes a test endpoint to verify the Worker and Pages are communicating:

1. Start the development server (see Development section above)
2. Open the application in your browser
3. Click the **"Test Worker API"** button
4. You should see a response like:
   ```json
   {
     "message": "Hello from Worker!",
     "timestamp": "2025-11-04T12:00:00.000Z",
     "success": true
   }
   ```

### How It Works

1. **React App** (`web/src/App.tsx`) makes a fetch request to `/api/test`
2. **Pages Function** (`web/functions/api/test.ts`) receives the request
3. **Service Binding** proxies the request to the Worker
4. **Worker** (`src/index.ts`) processes the request and returns JSON
5. **Response** flows back through Pages Function to the React app

## Deployment

### Deploy Worker

```bash
wrangler deploy
```

The Worker will be deployed to: `https://cf-ai-cache-optimizer.<your-subdomain>.workers.dev`

### Deploy Pages

```bash
cd web
npm run deploy
```

Or connect your GitHub repository to Cloudflare Pages for automatic deployments.

### Production Configuration

The service binding in `web/wrangler.jsonc` connects Pages to the Worker:

```jsonc
{
  "services": [
    {
      "binding": "WORKER_API",
      "service": "cf-ai-cache-optimizer"
    }
  ]
}
```

## API Endpoints

### Worker Endpoints

- `GET /api/test` - Test endpoint that returns a JSON response

### Pages Functions

- `/api/test` - Proxies to Worker's `/api/test` endpoint

## Technologies

- **Cloudflare Workers** - Serverless compute platform
- **Cloudflare Pages** - Static site hosting with Functions
- **Durable Objects** - Stateful serverless objects
- **React 19** - Frontend framework
- **Vite 7** - Build tool
- **TypeScript** - Type-safe development

## Troubleshooting

### Service binding shows "not connected"

This is expected when running `wrangler pages dev` without a local Worker. The binding will automatically use the deployed Worker instead. To connect to a local Worker, use `@local` suffix:

```bash
wrangler pages dev dist --service WORKER_API=cf-ai-cache-optimizer@local
```

### Port already in use

Change the port number:

```bash
wrangler pages dev dist --service WORKER_API=cf-ai-cache-optimizer --port 8790
```

### 503 Error on /api/test

Make sure the Worker is deployed:

```bash
wrangler deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally using the development instructions
5. Submit a pull request

## License

MIT
