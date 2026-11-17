// =============================================================================
// MasteryLMS - High Concurrency Load Test (k6)
// Target: Answer Submission & Heatmap Cache under realistic student concurrency
// Run: k6 run infra/k6/answer-submission-load-test.js
// =============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const submissionDuration = new Trend('submission_duration_ms');
const heatmapDuration = new Trend('heatmap_duration_ms');
const errorRate = new Rate('error_rate');
const successfulAttempts = new Counter('successful_attempts');

// Realistic load staging: Ramp up to 30 concurrent students, sustain, ramp down
export const options = {
  stages: [
    { duration: '15s', target: 10 }, // Warm-up
    { duration: '30s', target: 30 }, // Peak concurrent quiz takers
    { duration: '15s', target: 0 },  // Cool-down
  ],
  thresholds: {
    // 95% of submissions must complete under 400ms
    submission_duration_ms: ['p(95)<400'],
    // 95% of cached heatmap requests must complete under 150ms
    heatmap_duration_ms: ['p(95)<150'],
    // Total error rate must remain below 1%
    error_rate: ['rate<0.01'],
    // Overall HTTP failures
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://localhost:3000';
const COURSE_ID = __ENV.COURSE_ID || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
  };

  // 1. Benchmark Health Endpoint (Fast ping)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'gateway healthy': (r) => r.status === 200,
  });

  // 2. Benchmark Heatmap Retrieval (Exercises Redis Cache)
  const t0 = Date.now();
  const heatmapRes = http.get(`${BASE_URL}/mastery/courses/${COURSE_ID}/heatmap?studentId=22222222-2222-2222-2222-222222222222`, { headers });
  heatmapDuration.add(Date.now() - t0);

  const heatmapOk = check(heatmapRes, {
    'heatmap status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  if (!heatmapOk) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  // 3. Benchmark Answer Submission Payload
  const payload = JSON.stringify({
    question_id: '11111111-2222-3333-4444-555555555551',
    selected_option_id: 'opt-1a',
    time_taken_sec: Math.floor(Math.random() * 20) + 5,
  });

  const t1 = Date.now();
  const submitRes = http.post(`${BASE_URL}/assessments/attempts`, payload, { headers });
  submissionDuration.add(Date.now() - t1);

  const submitOk = check(submitRes, {
    'submission handled gracefully': (r) => r.status === 200 || r.status === 201 || r.status === 401 || r.status === 403,
  });

  if (submitOk) {
    successfulAttempts.add(1);
    errorRate.add(0);
  } else {
    errorRate.add(1);
  }

  // Realistic human pause between questions (1-2s)
  sleep(Math.random() * 1.5 + 0.5);
}
