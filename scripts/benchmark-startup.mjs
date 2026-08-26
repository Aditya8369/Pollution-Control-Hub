// scripts/benchmark-startup.mjs
//
// Startup benchmark for Issue #779.
// Measures the cold-start time of the Vite dev server and asserts
// it completes without deprecation warnings.
//
// Usage:
//   node scripts/benchmark-startup.mjs
//
// Exit code 0 = pass, 1 = fail (deprecation warnings detected or
// startup took > 10 seconds).

import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const STARTUP_BUDGET_MS = 10_000; // 10 seconds

function runBenchmark() {
    return new Promise((resolve, reject) => {
        const child = spawn("npx", ["vite", "--port", "5999"], {
            stdio: ["pipe", "pipe", "pipe"],
            shell: process.platform === "win32",
        });

        let stdout = "";
        let stderr = "";
        let deprecationWarnings = [];
        const startTime = performance.now();

        child.stdout.on("data", (data) => {
            const chunk = data.toString();
            stdout += chunk;
            // Vite prints "ready in XXX ms" when the server is up.
            if (chunk.includes("ready in")) {
                const elapsed = performance.now() - startTime;
                child.kill("SIGTERM");
                resolve({ elapsed, stdout, stderr, deprecationWarnings });
            }
        });

        child.stderr.on("data", (data) => {
            const chunk = data.toString();
            stderr += chunk;
            if (
                chunk.toLowerCase().includes("deprecation") ||
                chunk.toLowerCase().includes("deprecated")
            ) {
                deprecationWarnings.push(chunk.trim());
            }
        });

        child.on("error", (err) => {
            reject(new Error(`Failed to spawn Vite: ${err.message}`));
        });

        // Hard timeout — if Vite doesn't start in 30s, fail.
        const timeout = setTimeout(() => {
            child.kill("SIGKILL");
            reject(
                new Error(
                    `Vite failed to start within 30 seconds.\nstdout: ${stdout}\nstderr: ${stderr}`
                )
            );
        }, 30_000);

        child.on("exit", () => clearTimeout(timeout));
    });
}

try {
    console.log("🔍 Starting Vite startup benchmark...\n");

    const { elapsed, deprecationWarnings } = await runBenchmark();

    console.log(`\n--- Benchmark Results ---`);
    console.log(`Startup time: ${elapsed.toFixed(0)}ms`);
    console.log(`V8 deprecation warnings: ${deprecationWarnings.length}`);

    if (deprecationWarnings.length > 0) {
        console.error("\n❌ FAIL: Deprecation warnings detected:");
        deprecationWarnings.forEach((w) => console.error(`  ${w}`));
        process.exit(1);
    }

    if (elapsed > STARTUP_BUDGET_MS) {
        console.error(
            `\n❌ FAIL: Startup time ${elapsed.toFixed(0)}ms exceeds budget of ${STARTUP_BUDGET_MS}ms`
        );
        process.exit(1);
    }

    console.log(`\n✅ PASS: Startup completed in ${elapsed.toFixed(0)}ms (under ${STARTUP_BUDGET_MS}ms budget) with no deprecation warnings.`);
    process.exit(0);
} catch (err) {
    console.error("\n❌ FAIL:", err.message);
    process.exit(1);
}
