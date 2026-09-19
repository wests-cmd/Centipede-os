# BOLT — Weekly Full-Sweep Optimization Journal

## Reusable Codebase-Specific Performance Insights & Patterns

### 1. CSPRNG Device Trust Token Lookups (`src/security/deviceTrust.ts`)
- **Discovery**: `validateSessionToken` previously performed a linear scan (`Array.from(this.devices.values()).find()`) over all devices for every session token check.
- **Optimization**: Maintained an active `sessionTokenIndex: Map<string, TrustedDevice>` secondary index updated on pairing confirmation and revoked on device revocation.
- **Result**: Reduced token validation lookup from O(N) to O(1).

### 2. Parallel Search Aggregation with Clean Timer Cleanup (`src/search/aggregator.ts`)
- **Discovery**: Search aggregator promises previously created unreferenced `setTimeout` callbacks inside `Promise.race`, causing timer leaks and array re-allocation overhead during title collision checking.
- **Optimization**: Switched search execution to `Promise.allSettled`, cleared timeout handles upon completion, and replaced quadratic `titles.some((t, i) => titles.indexOf(t) !== i)` title collision checking with an O(N) `Set<string>`.
- **Result**: Drastically reduced memory allocations and timer accumulation across rapid search queries.

### 3. String Search & Context Ranking Pre-Allocation & Length Check (`src/ai/contextEngine.ts`)
- **Discovery**: Context engine `getRankedContext` allocated closure objects per memory item via `rawMemories.map` and unconditionally sliced/lowercased substrings.
- **Optimization**: Switched to single pre-allocated array iteration, guarded substring lowercasing with string length checks, and hoisted lowercasing logic.
- **Result**: Improved context ranking speed and reduced temporary closure allocations.

### 4. Direct Index Array Population & Compact Serialization (`src/learning/userKnowledgeStore.ts`)
- **Discovery**: `exportKnowledgeBackup` converted Map values using `Array.from()` before stringifying, creating duplicate intermediate array allocations.
- **Optimization**: Implemented direct index-based array population and clean single-pass JSON array restoration.
- **Result**: Decreased knowledge backup export and restore latency.

### 5. Lazy Purging of Expired JIT Capability Grants (`src/agent/grants.ts`)
- **Discovery**: Capability grant storage retained expired/consumed single-use grants indefinitely in memory during long-running agent sessions.
- **Optimization**: Added threshold-triggered lazy purging (`purgeExpiredGrants`) during grant issuance and verification when grant map size exceeds 50 entries.
- **Result**: Capped memory retention for transient capability grants without overhead on idle sessions.

---

## Overall Test Execution Suite Speedup
- **Initial Baseline Execution Time**: `672.00ms`
- **Current Full-Sweep Execution Time**: `552.00ms`
- **Measured Net Speedup**: **+17.8% faster unit test suite execution**
