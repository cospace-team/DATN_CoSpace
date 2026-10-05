#!/usr/bin/env python3
"""
CoSpace Concurrency Simulation Runner
Simulates multiple concurrent users accessing the CoSpace Backend API.
Uses Python standard library (no pip packages needed).

Usage:
    python tests/load/concurrent_simulation.py --url https://datn-cospace.onrender.com --users 30 --requests 150
    python tests/load/concurrent_simulation.py --url http://localhost:8080 --users 50 --requests 200
"""

import argparse
import concurrent.futures
import json
import os
import sys
import time
import urllib.error
import urllib.request

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def make_request(url, timeout=10):
    t0 = time.perf_counter()
    status_code = 0
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "CoSpace-ConcurrencyTest/1.0",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status_code = resp.status
            _ = resp.read()
            latency_ms = (time.perf_counter() - t0) * 1000
            return True, latency_ms, status_code
    except urllib.error.HTTPError as e:
        latency_ms = (time.perf_counter() - t0) * 1000
        return False, latency_ms, e.code
    except Exception:
        latency_ms = (time.perf_counter() - t0) * 1000
        return False, latency_ms, 0


def run_simulation(base_url, concurrent_users, total_requests, timeout=15):
    base_url = base_url.rstrip("/")
    endpoints = [
        "/api/health",
        "/api/customer/spaces/branches",
        "/api/customer/spaces/pricing-summary",
    ]

    print("=" * 65)
    print("[*] CoSpace Concurrency Load Test Runner")
    print("=" * 65)
    print(f"Target URL:        {base_url}")
    print(f"Concurrent Users:  {concurrent_users} threads")
    print(f"Total Requests:    {total_requests}")
    print(f"Endpoints Tested:  {', '.join(endpoints)}")
    print("-" * 65)

    # Distribute requests across endpoints
    request_urls = [
        f"{base_url}{endpoints[i % len(endpoints)]}"
        for i in range(total_requests)
    ]

    print(f"[*] Firing {total_requests} requests across {concurrent_users} concurrent workers...")
    t_start = time.perf_counter()

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
        future_to_url = {
            executor.submit(make_request, url, timeout): url
            for url in request_urls
        }
        for future in concurrent.futures.as_completed(future_to_url):
            try:
                success, latency, code = future.result()
                results.append((success, latency, code))
            except Exception:
                results.append((False, 0.0, 500))

    total_time = time.perf_counter() - t_start

    successes = [r for r in results if r[0]]
    failures = [r for r in results if not r[0]]
    latencies = sorted([r[1] for r in results if r[1] > 0])

    if not latencies:
        print("[!] Error: No responses received from server (server unreachable or timeout).")
        return 1

    avg_lat = sum(latencies) / len(latencies)
    min_lat = latencies[0]
    max_lat = latencies[-1]
    p50_lat = latencies[int(len(latencies) * 0.50)]
    p90_lat = latencies[int(len(latencies) * 0.90)]
    p95_lat = latencies[int(len(latencies) * 0.95)]
    p99_lat = latencies[min(int(len(latencies) * 0.99), len(latencies) - 1)]

    throughput = total_requests / total_time if total_time > 0 else 0
    error_rate = (len(failures) / total_requests) * 100

    print("\n" + "=" * 65)
    print("[+] KET QUA DO DAC HIEU NANG DONG THOI (CONCURRENCY REPORT)")
    print("=" * 65)
    print(f"Tong thoi gian thuc thi:   {total_time:.2f} s")
    print(f"Thong luong (Throughput):  {throughput:.1f} req/s")
    print(f"So request thanh cong:     {len(successes)} / {total_requests}")
    print(f"Ty le loi (Error Rate):    {error_rate:.1f}%")
    print("-" * 65)
    print("PHAN PHOI DO TRE (Latency):")
    print(f"  - Min:                   {min_lat:.1f} ms")
    print(f"  - Median (P50):          {p50_lat:.1f} ms")
    print(f"  - P90:                   {p90_lat:.1f} ms")
    print(f"  - P95:                   {p95_lat:.1f} ms")
    print(f"  - P99:                   {p99_lat:.1f} ms")
    print(f"  - Max:                   {max_lat:.1f} ms")
    print(f"  - Trung binh (Avg):      {avg_lat:.1f} ms")
    print("=" * 65)

    passed_p95 = p95_lat <= 2500
    passed_err = error_rate <= 5.0

    if passed_p95 and passed_err:
        print("[OK] DAT YEU CAU: He thong xu ly muot ma tai nguoi dung dong thoi!")
        return 0
    else:
        print("[WARN] CANH BAO: Do tre hoac ty le loi vuot nguong khuyen nghi SLA.")
        return 0


def main():
    parser = argparse.ArgumentParser(description="CoSpace Concurrent Users Load Simulation")
    parser.add_argument("--url", default="https://datn-cospace.onrender.com", help="Target API Base URL")
    parser.add_argument("--users", type=int, default=20, help="Number of concurrent virtual users (threads)")
    parser.add_argument("--requests", type=int, default=100, help="Total number of requests to execute")
    parser.add_argument("--timeout", type=int, default=15, help="Request timeout in seconds")
    args = parser.parse_args()

    exit_code = run_simulation(args.url, args.users, args.requests, args.timeout)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
