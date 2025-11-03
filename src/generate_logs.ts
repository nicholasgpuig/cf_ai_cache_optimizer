// scripts/generate_logs.ts
import * as fs from 'fs';

const methods = ["GET", "POST", "PUT"];
const cacheStatuses = ["HIT", "MISS", "EXPIRED", "BYPASS"];
const urls = ["/", "/images/logo.png", "/api/data", "/blog/post1"];

const logs = Array.from({ length: 200 }, () => ({
  timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  method: methods[Math.floor(Math.random() * methods.length)],
  url: urls[Math.floor(Math.random() * urls.length)],
  cacheStatus: cacheStatuses[Math.floor(Math.random() * cacheStatuses.length)],
  responseTime: Math.random() * 500,
  bytes: Math.floor(Math.random() * 50000),
}));

fs.writeFileSync("mock_cache_logs.json", JSON.stringify(logs, null, 2));
console.log("✅ Generated mock_cache_logs.json");
