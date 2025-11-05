// scripts/generate_logs.ts
/*
  Cloudflare CDN log format - Scenario-based log generator
  Full schema: https://developers.cloudflare.com/logs/reference/log-fields/
*/
import * as fs from 'fs';

// Enum values
const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const cacheStatuses = ["HIT", "MISS", "EXPIRED", "BYPASS", "STALE", "UPDATING", "REVALIDATED"];
const urls = [
  "/",
  "/images/logo.png",
  "/api/data",
  "/blog/post1",
  "/css/styles.css",
  "/js/app.js",
  "/api/users",
  "/products/123",
  "/dashboard"
];
const statusCodes = [200, 200, 200, 304, 301, 404, 500, 502, 403];
const wafActions = ["ALLOW", "ALLOW", "ALLOW", "BLOCK", "CHALLENGE", "LOG"];
const originIPs = ["192.0.2.1", "192.0.2.2", "192.0.2.3", "198.51.100.1"];
const tlsVersions = ["TLSv1.2", "TLSv1.3"];
const sslProtocols = ["TLSv1.2", "TLSv1.3", "TLSv1.1"];
const cipherSuites = [
  "ECDHE-RSA-AES128-GCM-SHA256",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "AES128-GCM-SHA256",
  "AES256-GCM-SHA384"
];
const queryParams = ["", "?id=123", "?page=1", "?sort=desc&limit=10", "?utm_source=google"];
const asns = [15169, 16509, 13335, 8075, 20940]; // Google, Amazon, Cloudflare, Microsoft, Akamai

// Helper to pick random element
const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface LogEntry {
  EdgeStartTimestamp: string;
  EdgeEndTimestamp: string;
  ClientRequestQuery: string;
  EdgeResponseStatus: number;
  CacheStatus: string;
  OriginIP: string | null;
  OriginTLSVersion: string | null;
  OriginResponseDurationMs: number;
  WAFAction: string;
  BotScore: number;
  ThreatScore: number;
  ASN: number;
  ClientSSLProtocol: string;
  ClientCipher: string;
  Method: string;
  URL: string;
  ResponseTimeMs: number;
  Bytes: number;
}

// Base log generator
function generateBaseLog(overrides: Partial<LogEntry> = {}): LogEntry {
  const edgeStartTime = Date.now() - Math.random() * 3600000;
  const processingTime = Math.random() * 500; // 0-500ms
  const edgeEndTime = edgeStartTime + processingTime;

  const cacheStatus = random(cacheStatuses);
  const isCached = cacheStatus === "HIT" || cacheStatus === "STALE" || cacheStatus === "REVALIDATED";
  const originResponseTime = isCached ? 0 : Math.random() * 200;

  const baseLog: LogEntry = {
    EdgeStartTimestamp: new Date(edgeStartTime).toISOString(),
    EdgeEndTimestamp: new Date(edgeEndTime).toISOString(),
    ClientRequestQuery: random(queryParams),
    EdgeResponseStatus: random(statusCodes),
    CacheStatus: cacheStatus,
    OriginIP: isCached ? null : random(originIPs),
    OriginTLSVersion: isCached ? null : random(tlsVersions),
    OriginResponseDurationMs: isCached ? 0 : Math.round(originResponseTime),
    WAFAction: random(wafActions),
    BotScore: Math.floor(Math.random() * 100),
    ThreatScore: Math.floor(Math.random() * 100),
    ASN: random(asns),
    ClientSSLProtocol: random(sslProtocols),
    ClientCipher: random(cipherSuites),
    Method: random(methods),
    URL: random(urls),
    ResponseTimeMs: Math.round(processingTime),
    Bytes: Math.floor(Math.random() * 50000)
  };

  return { ...baseLog, ...overrides };
}

// Scenario 1: DDoS Attack
// Pattern: High volume of requests from few ASNs, high bot scores, many WAF blocks
function generateDDoSScenario(count: number = 100): LogEntry[] {
  const attackerASNs = [12345, 23456, 34567]; // Suspicious ASNs
  const targetURL = "/api/data";

  return Array.from({ length: count }, () => {
    const isAttacker = Math.random() < 0.7; // 70% attack traffic

    return generateBaseLog({
      URL: isAttacker ? targetURL : random(urls),
      Method: "GET",
      ASN: isAttacker ? random(attackerASNs) : random(asns),
      BotScore: isAttacker ? 80 + Math.floor(Math.random() * 20) : Math.floor(Math.random() * 30),
      ThreatScore: isAttacker ? 70 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 30),
      WAFAction: isAttacker ? (Math.random() < 0.6 ? "BLOCK" : "CHALLENGE") : "ALLOW",
      EdgeResponseStatus: isAttacker ? (Math.random() < 0.5 ? 403 : 429) : random(statusCodes),
      ResponseTimeMs: Math.round(Math.random() * 100) // Fast responses for blocked requests
    });
  });
}

// Scenario 2: Load Balancer Misconfiguration
// Pattern: All traffic going to one origin IP, that IP has degraded performance
function generateLoadBalancerScenario(count: number = 50): LogEntry[] {
  const problematicOrigin = "192.0.2.1";
  const healthyOrigins = ["192.0.2.2", "192.0.2.3"];

  return Array.from({ length: count }, () => {
    const hitProblematicOrigin = Math.random() < 0.8; // 80% to bad origin
    const originIP = hitProblematicOrigin ? problematicOrigin : random(healthyOrigins);
    const originResponseTime = hitProblematicOrigin
      ? 800 + Math.random() * 2000 // 800-2800ms (very slow)
      : 50 + Math.random() * 150;   // 50-200ms (healthy)

    return generateBaseLog({
      CacheStatus: "MISS", // All going to origin
      OriginIP: originIP,
      OriginTLSVersion: random(tlsVersions),
      OriginResponseDurationMs: Math.round(originResponseTime),
      ResponseTimeMs: Math.round(originResponseTime + Math.random() * 100),
      EdgeResponseStatus: hitProblematicOrigin && Math.random() < 0.2 ? 502 : 200,
      WAFAction: "ALLOW",
      BotScore: Math.floor(Math.random() * 30),
      ThreatScore: Math.floor(Math.random() * 20)
    });
  });
}

// Scenario 3: Cache Misses for Specific Query
// Pattern: One query parameter causing lots of cache misses
function generateCacheMissScenario(count: number = 60): LogEntry[] {
  const problematicQuery = "?user_id=dynamic";
  const normalQueries = ["", "?page=1", "?sort=desc"];

  return Array.from({ length: count }, () => {
    const hasProblematicQuery = Math.random() < 0.6; // 60% problematic
    const query = hasProblematicQuery ? problematicQuery : random(normalQueries);

    return generateBaseLog({
      ClientRequestQuery: query,
      URL: "/api/users",
      CacheStatus: hasProblematicQuery ? "MISS" : (Math.random() < 0.8 ? "HIT" : "MISS"),
      OriginIP: hasProblematicQuery ? random(originIPs) : null,
      OriginTLSVersion: hasProblematicQuery ? random(tlsVersions) : null,
      OriginResponseDurationMs: hasProblematicQuery ? Math.round(100 + Math.random() * 200) : 0,
      ResponseTimeMs: hasProblematicQuery
        ? Math.round(150 + Math.random() * 200)
        : Math.round(10 + Math.random() * 50),
      EdgeResponseStatus: 200,
      WAFAction: "ALLOW",
      BotScore: Math.floor(Math.random() * 30),
      ThreatScore: Math.floor(Math.random() * 20)
    });
  });
}

// Scenario 4: Origin Response Time Spike for Specific Endpoint
// Pattern: One endpoint showing dramatically increased origin response times
function generateOriginSpikeScenario(count: number = 50): LogEntry[] {
  const slowEndpoint = "/api/data";
  const fastEndpoints = ["/", "/images/logo.png", "/blog/post1"];

  return Array.from({ length: count }, () => {
    const isSlowEndpoint = Math.random() < 0.5;
    const url = isSlowEndpoint ? slowEndpoint : random(fastEndpoints);
    const originResponseTime = isSlowEndpoint
      ? 1500 + Math.random() * 3000 // 1.5-4.5 seconds
      : 50 + Math.random() * 150;    // 50-200ms

    return generateBaseLog({
      URL: url,
      CacheStatus: "MISS", // Going to origin
      OriginIP: random(originIPs),
      OriginTLSVersion: random(tlsVersions),
      OriginResponseDurationMs: Math.round(originResponseTime),
      ResponseTimeMs: Math.round(originResponseTime + Math.random() * 100),
      EdgeResponseStatus: isSlowEndpoint && Math.random() < 0.1 ? 504 : 200, // Some timeouts
      Method: isSlowEndpoint ? "POST" : "GET",
      WAFAction: "ALLOW",
      BotScore: Math.floor(Math.random() * 30),
      ThreatScore: Math.floor(Math.random() * 20)
    });
  });
}

// Generate all scenarios
console.log("🔄 Generating scenario-based log files...\n");

const scenarios = [
  { name: "ddos_attack", generator: generateDDoSScenario, count: 100 },
  { name: "load_balancer_issue", generator: generateLoadBalancerScenario, count: 50 },
  { name: "cache_miss_query", generator: generateCacheMissScenario, count: 60 },
  { name: "origin_response_spike", generator: generateOriginSpikeScenario, count: 50 }
];

scenarios.forEach(scenario => {
  const logs = scenario.generator(scenario.count);
  const filename = `src/scenarios/${scenario.name}.json`;

  // Create scenarios directory if it doesn't exist
  if (!fs.existsSync("src/scenarios")) {
    fs.mkdirSync("src/scenarios", { recursive: true });
  }

  fs.writeFileSync(filename, JSON.stringify(logs, null, 2));
  console.log(`✅ Generated ${filename}`);
  console.log(`   ${logs.length} log entries`);
});

// Also generate a baseline "normal" log file for comparison
const normalLogs = Array.from({ length: 50 }, () => generateBaseLog());
fs.writeFileSync("src/scenarios/normal_traffic.json", JSON.stringify(normalLogs, null, 2));
console.log(`✅ Generated src/scenarios/normal_traffic.json`);
console.log(`   50 log entries (baseline)`);

console.log("\n🎉 All scenario files generated successfully!");
