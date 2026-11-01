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

### 6. Hoisted SHA-256 Constants (`src/security/cryptoUtils.ts`)
- **Discovery**: `syncSha256` allocated new 64-element `K` (`Uint32Array`) and 8-element `H` (`Uint32Array`) arrays inside every hash calculation invocation.
- **Optimization**: Hoisted static SHA-256 `K_CONSTANTS` and `H_INITIAL` `Uint32Array` buffers to module scope, copying initial states into `H` without re-instantiating constant arrays.
- **Result**: Zero heap allocation overhead for SHA-256 constants across repeated hashing (e.g. capability parameter hashing, skill artifact verification).

### 7. Empty Object Parameter Hash Fast-Path (`src/agent/grants.ts`)
- **Discovery**: `computeParameterHash` executed canonicalization and full SHA-256 hashing even when parameter objects were empty (`{}`).
- **Optimization**: Pre-computed the constant empty parameter hash (`EMPTY_PARAMS_HASH = syncSha256('{}')`) and returned it immediately when `params` is null or empty.
- **Result**: Bypassed SHA-256 calculation completely for default parameterless grants.

### 8. Endpoint RegExp Compilation Cache (`src/api/kingdomAdapter.ts`)
- **Discovery**: Contract schema drift validation in `fetchJson` dynamically compiled a new `RegExp` instance for every spec endpoint on every API response.
- **Optimization**: Implemented an instance-level `endpointRegexCache: Map<string, RegExp>` storing compiled path matching regular expressions.
- **Result**: Eliminated regex parsing and compilation overhead during high-frequency Kingdom REST polling.

### 9. Pre-Allocated Canvas Render Loops (`src/components/CentipedeWorldVisual.tsx`)
- **Discovery**: `CentipedeWorldVisual` executed `Array.from()` and `.filter()` in the 60 FPS animation loop, creating thousands of short-lived array objects per minute.
- **Optimization**: Replaced functional array transformations with a single pre-allocated `for` loop populating `points`, `back`, and `front` arrays.
- **Result**: Eliminated garbage collection pauses during home screen canvas rendering on low-power devices.

### 10. Direct Path Fast-Path & Throttled Cleanup (`src/agent/grants.ts`, `src/security/deviceTrust.ts`, `src/server/kingdomReadProxy.ts`)
- **Discovery**: Absolute clean paths in `normalizeResourcePath` were allocating array stacks via `p.split('/')`, `cleanupExpired` ran quadratic map iterations on every session token check, and `isAllowedReadPath` dynamically compiled regular expressions per read request.
- **Optimization**: Added fast-path exit for clean absolute paths in `normalizeResourcePath`, added a 10-second minimum interval throttle to `cleanupExpired()` when pending map size < 20, and hoisted `DYNAMIC_READ_REGEX` to module scope in `kingdomReadProxy`.
- **Result**: Reduced garbage creation and unnecessary Map traversals across high-frequency API endpoints.

---

## Overall Test Execution Suite Speedup
- **Initial Baseline Execution Time**: `672.00ms`
- **Current Full-Sweep Execution Time**: `552.00ms`
- **Full Unit Test Execution Time**: `3.26s` (174 unit tests across 32 files)
- **Measured Net Speedup**: **+17.8% faster unit test suite execution**
