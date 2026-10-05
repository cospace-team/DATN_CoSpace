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
  // Staged ramp-up and ramp-down simulating organic user waves
  stages: [
    { duration: '10s', target: Math.min(10, targetVUs) },   // Warm-up ramp
    { duration: '15s', target: targetVUs },                 // Full concurrent load
    { duration: durationStr, target: targetVUs },           // Steady state peak
    { duration: '10s', target: 0 },                         // Graceful ramp-down
  ],
  thresholds: {
    // SLA constraints: p95 latency under 1000ms, p99 under 2500ms, error rate < 1%
    http_req_duration: ['p(95)<1000', 'p(99)<2500'],
    failed_requests: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export default function () {
  // Step 1: Health probe (simulating uptime check & DB connection pool heartbeat)
  const t0 = new Date();
  const healthRes = http.get(`${baseUrl}/api/health`, { headers: JSON_HEADERS });
  healthLatency.add(new Date() - t0);
  
  const healthOk = check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health body contains UP': (r) => r.body && r.body.includes('UP'),
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
    'branches returned list': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length >= 0;
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

// Generate Markdown summary for GitHub Actions Step Summary
export function handleSummary(data) {
  const reqTotal = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const reqRate = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : 0;
  const durAvg = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(1) : 0;
  const durP50 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(50)'].toFixed(1) : 0;
  const durP90 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(90)'].toFixed(1) : 0;
  const durP95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(1) : 0;
  const durP99 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'].toFixed(1) : 0;
  const durMax = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max.toFixed(1) : 0;
  
  const failRateVal = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0;
  const vusMax = data.metrics.vus_max ? data.metrics.vus_max.values.value : targetVUs;

  const markdownReport = `
# 📊 Báo Cáo Kiểm Thử Tải Đồng Thời (k6 Concurrency Simulation)

- **Target URL**: \`${baseUrl}\`
- **Chế độ kiểm thử**: \`${testMode}\`
- **Số người dùng đồng thời tối đa (Peak VUs)**: **${vusMax} VUs**
- **Tổng số request**: **${reqTotal}** requests
- **Throughput**: **${reqRate}** req/sec

### ⏱️ Phân Phối Độ Trễ (Response Latency)
| Thước đo | Giá trị | Ngưỡng SLA | Trạng thái |
|---|---|---|---|
| **Trung bình (Avg)** | ${durAvg} ms | - | ℹ️ |
| **Median (P50)** | ${durP50} ms | ≤ 300 ms | ${parseFloat(durP50) <= 300 ? '✅ Pass' : '⚠️ Warning'} |
| **P90** | ${durP90} ms | ≤ 600 ms | ${parseFloat(durP90) <= 600 ? '✅ Pass' : '⚠️ Warning'} |
| **P95** | ${durP95} ms | ≤ 1000 ms | ${parseFloat(durP95) <= 1000 ? '✅ Pass' : '❌ Fail'} |
| **P99** | ${durP99} ms | ≤ 2500 ms | ${parseFloat(durP99) <= 2500 ? '✅ Pass' : '❌ Fail'} |
| **Lớn nhất (Max)** | ${durMax} ms | - | ℹ️ |

### 🛡️ Độ Tin Cậy & Tỷ Lệ Lỗi (Reliability)
- **Tỷ lệ lỗi (Error Rate)**: **${failRateVal}%** (${parseFloat(failRateVal) <= 1.0 ? '✅ Đạt chuẩn (< 1%)' : '❌ Vượt ngưỡng cho phép'})
`;

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/summary.json': JSON.stringify(data, null, 2),
    'tests/load/summary.md': markdownReport,
  };
}

function textSummary(data) {
  return `k6 simulation completed for ${targetVUs} concurrent users. Details saved to summary.json.`;
}
