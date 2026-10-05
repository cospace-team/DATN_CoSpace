import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics to track non-functional requirements (NFRs)
export const failureRate = new Rate('failed_requests');
export const browseLatency = new Trend('browse_duration', true);
export const healthLatency = new Trend('health_duration', true);

// Configuration options
const targetVUs = parseInt(__ENV.VUS || '50', 10);
const durationStr = __ENV.DURATION || '1m';
const baseUrl = (__ENV.BASE_URL || 'https://datn-cospace.onrender.com').replace(/\/+$/, '');
const testMode = __ENV.TEST_MODE || 'read-heavy';

export const options = {
  // Explicitly tell k6 which percentiles to track for handleSummary
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  // Staged ramp-up and ramp-down simulating organic user waves
  stages: [
    { duration: '10s', target: Math.min(10, targetVUs) },   // Warm-up ramp
    { duration: '15s', target: targetVUs },                 // Full concurrent load
    { duration: durationStr, target: targetVUs },           // Steady state peak
    { duration: '10s', target: 0 },                         // Graceful ramp-down
  ],
  thresholds: {
    // SLA constraints: p95 latency under 1500ms, error rate < 5%
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    failed_requests: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Setup runs once before virtual users start
export function setup() {
  console.log(`[Setup] Verifying target endpoint at ${baseUrl}/api/health...`);
  const res = http.get(`${baseUrl}/api/health`, { headers: JSON_HEADERS });
  
  if (res.status !== 200) {
    console.warn(`[Setup Warning] Health endpoint returned HTTP ${res.status}. Backend might be warming up.`);
  }

  // Detect if user inadvertently entered the frontend Vercel URL
  if (typeof res.body === 'string' && (res.body.includes('<!DOCTYPE') || res.body.includes('<html'))) {
    throw new Error(
      `[Target Misconfigured] Target URL "${baseUrl}" returned an HTML webpage instead of JSON! ` +
      `You entered the Frontend (Vercel) URL. Please specify the Backend API (Render) URL: ` +
      `https://datn-cospace.onrender.com`
    );
  }

  return { baseUrl, ready: true };
}

export default function () {
  // Step 1: Health probe (simulating uptime check & DB connection pool heartbeat)
  const t0 = new Date();
  const healthRes = http.get(`${baseUrl}/api/health`, { headers: JSON_HEADERS });
  healthLatency.add(new Date() - t0);
  
  const healthOk = check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (body.status === 'UP' || body.database === 'UP' || body.service);
      } catch (e) {
        return typeof r.body === 'string' && r.body.includes('UP');
      }
    },
  });
  failureRate.add(!healthOk);

  // Think time between actions (100ms - 400ms jitter)
  sleep(0.1 + Math.random() * 0.3);

  // Step 2: Browse active branches (exercises Caffeine cache & PostgreSQL)
  const t1 = new Date();
  const branchesRes = http.get(`${baseUrl}/api/customer/spaces/branches`, { headers: JSON_HEADERS });
  browseLatency.add(new Date() - t1);

  const branchesOk = check(branchesRes, {
    'branches status is 200': (r) => r.status === 200,
    'branches returned valid json': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || typeof body === 'object';
      } catch (e) {
        return false;
      }
    },
  });
  failureRate.add(!branchesOk);

  sleep(0.1 + Math.random() * 0.3);

  // Step 3: Fetch space pricing summary (public landing & explore page traffic)
  const pricingRes = http.get(`${baseUrl}/api/customer/spaces/pricing-summary`, { headers: JSON_HEADERS });
  const pricingOk = check(pricingRes, {
    'pricing status is 200': (r) => r.status === 200,
  });
  failureRate.add(!pricingOk);

  // Step 4: Optional Authenticated Flow in 'full-journey' mode
  if (testMode === 'full-journey') {
    sleep(0.2 + Math.random() * 0.4);
    
    // Simulate user login
    const loginPayload = JSON.stringify({
      email: 'nguyenvana@demo.cospace.vn',
      password: 'Customer@123',
    });
    
    const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, { headers: JSON_HEADERS });
    const loginOk = check(loginRes, {
      'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    failureRate.add(!loginOk);
  }

  // Realistic think time between subsequent iterations
  sleep(0.5 + Math.random() * 1.0);
}

// Safe value extractor helper
function getMetricVal(metric, key, fallback = 0) {
  if (metric && metric.values && metric.values[key] !== undefined && metric.values[key] !== null) {
    return metric.values[key];
  }
  return fallback;
}

// Generate Markdown summary for GitHub Actions Step Summary
export function handleSummary(data) {
  const reqTotal = getMetricVal(data.metrics.http_reqs, 'count', 0);
  const reqRate = getMetricVal(data.metrics.http_reqs, 'rate', 0).toFixed(2);

  const durMetric = data.metrics.http_req_duration;
  const durAvg = getMetricVal(durMetric, 'avg', 0).toFixed(1);
  const durMed = (getMetricVal(durMetric, 'med', null) ?? getMetricVal(durMetric, 'p(50)', 0)).toFixed(1);
  const durP90 = getMetricVal(durMetric, 'p(90)', 0).toFixed(1);
  const durP95 = getMetricVal(durMetric, 'p(95)', 0).toFixed(1);
  const durP99 = getMetricVal(durMetric, 'p(99)', 0).toFixed(1);
  const durMax = getMetricVal(durMetric, 'max', 0).toFixed(1);

  const failRateVal = (getMetricVal(data.metrics.failed_requests, 'rate', 0) * 100).toFixed(2);
  const httpFailVal = (getMetricVal(data.metrics.http_req_failed, 'rate', 0) * 100).toFixed(2);
  const vusMax = getMetricVal(data.metrics.vus_max, 'value', targetVUs);

  const markdownReport = `
# 📊 Báo Cáo Kiểm Thử Tải Đồng Thời (k6 Concurrency Simulation)

- **Target URL**: \`${baseUrl}\`
- **Chế độ kiểm thử**: \`${testMode}\`
- **Số người dùng đồng thời tối đa (Peak VUs)**: **${vusMax} VUs**
- **Tổng số request**: **${reqTotal}** requests
- **Thông lượng (Throughput)**: **${reqRate}** req/sec

### ⏱️ Phân Phối Độ Trễ (Response Latency)
| Thước đo | Giá trị | Ngưỡng SLA | Trạng thái |
|---|---|---|---|
| **Trung bình (Avg)** | ${durAvg} ms | - | ℹ️ |
| **Median (P50)** | ${durMed} ms | ≤ 500 ms | ${parseFloat(durMed) <= 500 ? '✅ Pass' : '⚠️ Warning'} |
| **P90** | ${durP90} ms | ≤ 1000 ms | ${parseFloat(durP90) <= 1000 ? '✅ Pass' : '⚠️ Warning'} |
| **P95** | ${durP95} ms | ≤ 1500 ms | ${parseFloat(durP95) <= 1500 ? '✅ Pass' : '❌ Fail'} |
| **P99** | ${durP99} ms | ≤ 3000 ms | ${parseFloat(durP99) <= 3000 ? '✅ Pass' : '❌ Fail'} |
| **Lớn nhất (Max)** | ${durMax} ms | - | ℹ️ |

### 🛡️ Độ Tin Cậy & Tỷ Lệ Lỗi (Reliability)
- **Tỷ lệ kiểm tra không đạt (Failed Check Rate)**: **${failRateVal}%**
- **Tỷ lệ HTTP lỗi (HTTP 4xx/5xx)**: **${httpFailVal}%** (${parseFloat(httpFailVal) <= 5.0 ? '✅ Đạt chuẩn (< 5%)' : '❌ Vượt ngưỡng cho phép'})
`;

  return {
    'stdout': `k6 simulation completed: ${reqTotal} requests, avg ${durAvg}ms, error rate ${failRateVal}%.`,
    'tests/load/summary.json': JSON.stringify(data, null, 2),
    'tests/load/summary.md': markdownReport,
  };
}
