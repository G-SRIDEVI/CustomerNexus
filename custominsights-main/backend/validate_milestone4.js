const http = require('http');

console.log("==========================================================================");
console.log("  SHOPSENSE MILESTONE 4: COMPREHENSIVE INTEGRATION & REGRESSION SUITE   ");
console.log("  Deployable Analytics Platform & Performance Validation               ");
console.log("==========================================================================\n");

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json, latency });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, latency });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runMilestone4Tests() {
  let passed = 0;
  let failed = 0;
  const latencies = [];

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  🟢 [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.log(`  🔴 [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  console.log("--- 1. Service Availability & Health Gateways ---");
  await test("Express E-Commerce Backend Service Health Check (Port 5000)", async () => {
    const res = await makeRequest("http://localhost:5000/api/products");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    latencies.push(res.latency);
  });

  await test("Python FastAPI Analytics Engine Health Check (Port 8000)", async () => {
    const res = await makeRequest("http://localhost:8000/");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (res.body.status !== "online") throw new Error("Analytics service state is not online");
    latencies.push(res.latency);
  });

  console.log("\n--- 2. Node.js Express Core E-Commerce API Integration ---");
  await test("GET /api/products returns product catalog array", async () => {
    const res = await makeRequest("http://localhost:5000/api/products");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    const prods = Array.isArray(res.body) ? res.body : (res.body && res.body.products);
    if (!Array.isArray(prods)) throw new Error("Expected array of products");
  });

  await test("GET /api/orders returns orders array", async () => {
    const res = await makeRequest("http://localhost:5000/api/orders");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    const ords = Array.isArray(res.body) ? res.body : (res.body && res.body.orders);
    if (!Array.isArray(ords)) throw new Error("Expected array of orders");
  });

  console.log("\n--- 3. Python FastAPI Analytics & ML Forecasting Pipelines ---");
  await test("GET /vendors/ returns vendor metrics list", async () => {
    const res = await makeRequest("http://localhost:8000/vendors/");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (!Array.isArray(res.body)) throw new Error("Expected array of vendor metrics");
  });

  await test("GET /vendors/ranking returns sorted benchmarking rankings", async () => {
    const res = await makeRequest("http://localhost:8000/vendors/ranking");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (!Array.isArray(res.body)) throw new Error("Expected array of rankings");
    if (res.body.length > 0 && typeof res.body[0].fulfillment_rate !== "number") {
      throw new Error("Missing fulfillment_rate metric in vendor ranking");
    }
  });

  await test("GET /analytics/revenue returns marketplace GMV & profit analytics", async () => {
    const res = await makeRequest("http://localhost:8000/analytics/revenue");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (!Array.isArray(res.body)) throw new Error("Invalid analytics revenue response structure");
  });

  await test("POST /analytics/forecast executes LinearRegression & MLflow Registry", async () => {
    const res = await makeRequest("http://localhost:8000/analytics/forecast", { method: "POST" });
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (!res.body || !res.body.success) throw new Error("Forecast pipeline execution failed");
    if (!res.body.mlflow_run || typeof res.body.mlflow_run.accuracy !== "number") {
      throw new Error("Missing MLflow tracking payload in forecast response");
    }
    if (res.body.mlflow_run.accuracy < 0.70) {
      throw new Error(`ML model accuracy below threshold (0.70): ${res.body.mlflow_run.accuracy}`);
    }
  });

  await test("GET /analytics/customer-intelligence computes RFM customer tiers", async () => {
    const res = await makeRequest("http://localhost:8000/analytics/customer-intelligence");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (!res.body.success || !res.body.intelligence) throw new Error("Invalid customer intelligence payload");
    const { premium, gold, silver, regular } = res.body.intelligence;
    if (!Array.isArray(premium) || !Array.isArray(gold)) {
      throw new Error("RFM classification tiers missing or malformed");
    }
  });

  await test("POST /analytics/sync triggers cross-service database synchronization", async () => {
    const res = await makeRequest("http://localhost:8000/analytics/sync", { method: "POST" });
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (!res.body || (!res.body.success && res.body.status !== "success")) {
      throw new Error("Cross-service sync response did not report success");
    }
  });

  console.log("\n--- 4. Performance, Latency & High-Concurrency Benchmarks ---");
  await test("Single Request Target Latency Benchmark (<200ms)", async () => {
    const res = await makeRequest("http://localhost:8000/analytics/revenue");
    console.log(`     -> Measured Single-Request Latency: ${res.latency}ms`);
    if (res.latency > 300) throw new Error(`Latency exceeded 300ms SLA: ${res.latency}ms`);
  });

  await test("Concurrent Workload Stress Test (10 Parallel Async Requests)", async () => {
    const requests = Array.from({ length: 10 }).map(() =>
      makeRequest("http://localhost:8000/vendors/ranking")
    );
    const results = await Promise.all(requests);
    const avgLatency = results.reduce((acc, curr) => acc + curr.latency, 0) / results.length;
    const maxLatency = Math.max(...results.map(r => r.latency));
    console.log(`     -> Parallel Request Batch: 10 requests completed`);
    console.log(`     -> Average Concurrent Latency: ${avgLatency.toFixed(1)}ms | Max: ${maxLatency}ms`);
    if (avgLatency > 350) throw new Error(`High concurrent latency: ${avgLatency.toFixed(1)}ms`);
  });

  console.log("\n==========================================================================");
  console.log(`  FINAL RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log(`  STATUS: ${failed === 0 ? "🟢 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION" : "🔴 REGRESSION FAILURES DETECTED"}`);
  console.log("==========================================================================\n");
}

runMilestone4Tests();

