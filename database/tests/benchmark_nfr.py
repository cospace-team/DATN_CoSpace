"""
CoSpace NFR Benchmark Script
Automated measurement script for Non-Functional Requirements (NFR Verification):
1. API Latency (min, avg, max, p50, p90, p99)
2. Concurrent Throughput (req/s, error rate)
3. Jaccard Algorithm Matching speed
4. Frontend Distribution Bundle Analysis
"""

import time
import urllib.request
import concurrent.futures
import os
import json

BASE_URL = "http://localhost:8080"

def test_api_latency(endpoint="/api/health", runs=10):
    url = f"{BASE_URL}{endpoint}"
    times = []
    print(f"[*] Measuring latency for {endpoint} ({runs} runs)...")
    for _ in range(runs):
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                if resp.status == 200:
                    times.append((time.perf_counter() - t0) * 1000)
        except Exception as e:
            pass
    if times:
        times.sort()
        avg_t = sum(times) / len(times)
        min_t = min(times)
        max_t = max(times)
        p50 = times[int(len(times) * 0.5)]
        p90 = times[int(len(times) * 0.9)]
        print(f"    Min: {min_t:.1f}ms | Avg: {avg_t:.1f}ms | Max: {max_t:.1f}ms | P50: {p50:.1f}ms | P90: {p90:.1f}ms")
        return {"min": min_t, "avg": avg_t, "max": max_t, "p50": p50, "p90": p90}
    return None

def test_concurrency(endpoint="/api/health", total_requests=100, concurrency=20):
    url = f"{BASE_URL}{endpoint}"
    print(f"[*] Measuring concurrency: {total_requests} requests with {concurrency} threads...")
    
    def fetch(_):
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                return resp.status == 200, (time.perf_counter() - t0) * 1000
        except Exception:
            return False, (time.perf_counter() - t0) * 1000

    t_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        results = list(executor.map(fetch, range(total_requests)))
    total_time = time.perf_counter() - t_start

    successes = [r for r in results if r[0]]
    errors = total_requests - len(successes)
    throughput = total_requests / total_time
    print(f"    Total Time: {total_time:.2f}s | Throughput: {throughput:.1f} req/s | Error Rate: {(errors/total_requests)*100:.1f}%")
    return {"throughput": throughput, "error_rate": (errors/total_requests)*100}

def test_jaccard_algorithm(iterations=10000):
    print(f"[*] Benchmarking Jaccard similarity algorithm ({iterations} iterations)...")
    profile_a = {"Python", "Machine Learning", "Spring Boot", "Docker", "PostgreSQL", "React", "TypeScript"}
    profile_b = {"Java", "Spring Boot", "Docker", "PostgreSQL", "Kubernetes", "Microservices"}

    t0 = time.perf_counter()
    for _ in range(iterations):
        intersection = len(profile_a & profile_b)
        union = len(profile_a | profile_b)
        score = intersection / union if union > 0 else 0.0
    elapsed = (time.perf_counter() - t0) * 1000
    avg_per_calc = (elapsed / iterations) * 1000 # in microseconds
    print(f"    Completed {iterations} comparisons in {elapsed:.2f}ms (~{avg_per_calc:.3f} µs/calc)")
    return {"elapsed_ms": elapsed, "avg_microseconds": avg_per_calc}

def analyze_bundle_size():
    print("[*] Analyzing production frontend dist/ bundle...")
    dist_assets = r"d:\DA\FE\dist\assets"
    if os.path.exists(dist_assets):
        total_bytes = 0
        for f in os.listdir(dist_assets):
            fp = os.path.join(dist_assets, f)
            if os.path.isfile(fp):
                total_bytes += os.path.getsize(fp)
        print(f"    Total dist/assets size: {total_bytes / 1024:.1f} kB uncompressed")
    else:
        print("    Run 'npm run build' inside FE first to inspect dist/ directory.")

if __name__ == "__main__":
    print("=" * 60)
    print("CoSpace - NFR Automated Verification Suite")
    print("=" * 60)
    test_jaccard_algorithm()
    analyze_bundle_size()
    # If backend is running, latency and concurrency can be triggered
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=2)
        test_api_latency("/api/health")
        test_concurrency("/api/health")
    except Exception:
        print("\nNote: Backend is not running on port 8080. Start backend to test live API metrics.")
