# Refactoring Opportunities

This document outlines potential refactoring opportunities for TecniBus, organized by scope and effort. These are suggestions for future improvements—not currently implemented.

## Quick Wins (1-2 hours each)

### Remove development-only code from login.tsx

**Location:** `app/login.tsx` (line 55)

- [ ] Remove `tapCount` state variable used only for development session clearing
- Rationale: Simplifies component state management; development tools should be in debug mode or development build only
- Current impact: Adds unnecessary state re-renders on development taps

### Extract geocercas distance calculation to utility

**Files affected:** `lib/services/geocercas.service.ts`

- [ ] Extract `calcularDistancia()` function to `lib/utils/distance.ts`
- Rationale: Distance calculation (Haversine formula) is generic and reusable across multiple services
- Current impact: Potential future duplication if other modules need distance calculations

### Consolidate directions service logic

**Location:** `lib/services/directions.service.ts` and `lib/services/geocercas.service.ts`

- [ ] Review overlap between distance-based route analysis in both services
- Rationale: Route deviation detection and ETA calculation both use similar distance metrics
- Current impact: Minor—single source of truth already exists, but could be more explicit

## Medium Refactors (4-8 hours)

### Split large files by concern

#### app/login.tsx (~505 lines)

- [ ] Extract biometric authentication logic → `lib/hooks/useBiometricAuth.ts`
- [ ] Extract form validation logic → `lib/hooks/useLoginForm.ts`
- [ ] Keep main component at ~200 lines for orchestration
- Rationale: Component is a kitchen sink of authentication, UI, animations, and validation
- Current line count: 505 lines

#### lib/services/geocercas.service.ts (~391 lines)

- [ ] Split geofence zone logic → `lib/services/geofenceZones.service.ts`
- [ ] Split distance/ETA calculations → `lib/services/routeETA.service.ts`
- [ ] Keep main file for orchestration and public API
- Rationale: Currently mixes geofence containment, ETA calculations, and zone management
- Current line count: 391 lines

#### lib/network/NetworkQueue.ts (~292 lines)

- [ ] Extract retry logic → `lib/network/RetryStrategy.ts`
- [ ] Extract queue persistence → `lib/network/QueuePersistence.ts`
- [ ] Keep main file for queue orchestration
- Rationale: Single file handles queueing, retry logic, storage, and synchronization
- Current line count: 292 lines

### Consolidate hooks for shared functionality

**Driver and Parent shared hooks:**

- [ ] `lib/hooks/useDriverRecorrido.ts` + `lib/hooks/useParentRecorrido.ts` → `lib/hooks/useRecorrido.ts` with role-based variant
  - Current: Separate implementations with similar data fetching patterns
  - Benefit: Reduce duplication; maintain consistency across roles

- [ ] `lib/hooks/useDriverEstudiantes.ts` + `lib/hooks/useParentEstudiantes.ts` → `lib/hooks/useEstudiantes.ts` with role-based filtering
  - Current: Separate implementations with different filters but same core queries
  - Benefit: Single source of truth for student data fetching

- [ ] Geofencing hooks in `features/driver/hooks/` → consolidate with `lib/hooks/useGeofence.ts`
  - Current: Distributed across features directory
  - Benefit: Centralize geofence logic; reuse in admin panel if needed

**Related files:**
- `lib/hooks/useDriverActions.ts` / `lib/hooks/useParentActions.ts`
- `lib/hooks/useParentAsistencia.ts`

## Large Refactors (8+ hours)

### Performance optimization

#### Component re-render analysis

- [ ] Run React DevTools Profiler on driver and parent screens
- [ ] Identify components re-rendering unnecessarily due to parent state changes
- [ ] Implement memoization (React.memo, useMemo, useCallback) for expensive renders
- Target: Driver live view, parent tracking screens, route list components

#### FlatList and list rendering optimization

- [ ] Profile driver/parent student list components for scroll performance
- [ ] Implement `maxToRenderPerBatch`, `updateCellsBatchingPeriod`
- [ ] Add key props consistently to avoid layout thrashing
- Target: `features/driver/components/`, `features/parent/components/`

#### Animation performance

- [ ] Profile `app/login.tsx` animations with React Native performance monitor
- [ ] Consider reducing animation duration or frame rate on lower-end devices
- [ ] Verify Reanimated 3 is properly using native drivers

### Bundle size optimization

- [ ] Run bundle analysis: `npx expo-bundle-analyzer`
- [ ] Identify and remove unused dependencies (check `package.json` against imports)
- [ ] Lazy-load heavy modules:
  - Maps/location services on demand
  - Charts/reporting components (if used in admin panel)
  - Biometric authentication fallback UI
- [ ] Consider code-splitting by route (Expo Router supports this)
- Target: Reduce initial bundle by ~15-20%

### State management architecture

- [ ] Evaluate Context API performance for real-time location updates
- [ ] Consider Zustand or Jotai if Context re-renders become bottleneck
- [ ] Profile authentication flow with large number of concurrent users
- Current impact: Low, but relevant for scaling

## Technical Debt

### Code standardization

- [ ] **Error handling patterns:** Standardize try-catch vs error callbacks across all services
  - Current: Mixed patterns in `storage.service.ts`, `chat.service.ts`, `notifications.service.ts`
  - Recommendation: Define `ServiceError` class with structured error types

- [ ] **Magic numbers to constants:**
  - `geocercas.service.ts`: FACTOR_VIAL, distance thresholds, velocity assumptions
  - `NetworkQueue.ts`: Retry delays (backoff strategy), timeout values
  - `directions.service.ts`: Buffer distances, tolerance values
  - Create: `lib/constants/business.ts` and `lib/constants/system.ts`

- [ ] **API response validation:**
  - Add Zod or io-ts schemas for all Supabase responses
  - Current: Minimal type checking in services
  - Benefit: Catch API contract violations early

### Documentation gaps

- [ ] Document geofence distance calculation algorithm (Haversine + road factor)
- [ ] Document NetworkQueue retry strategy and persistence
- [ ] Add JSDoc to complex business logic:
  - ETA calculations with velocity factors
  - Zone containment algorithms
  - Biometric fallback logic

### Testing coverage

- [ ] Add unit tests for utility functions (distance, ETA, geofence containment)
- [ ] Add integration tests for NetworkQueue offline/online transitions
- [ ] Mock Supabase responses in service tests
- Priority: Test core business logic first (geocercas, recorridos)

## Dependency cleanup

- [ ] Audit `package.json` for unused dependencies
- [ ] Consider alternative libraries for:
  - Animations (Reanimated 2 → 3 migration complete; verify no v2 code remains)
  - Maps (current solution: React Native Maps)
  - State management (if moving from Context)

## Next Steps

**Prioritization guide:**
1. **First wave (Quick Wins):** Low risk, high morale boost
   - Remove dev-only code
   - Extract utility functions
   - ~3-4 hours total

2. **Second wave (Medium Refactors):** Address immediate pain points
   - Split large files by concern
   - Consolidate duplicate hooks
   - ~20-30 hours total; can be parallelized

3. **Third wave (Large Refactors):** Performance and scalability
   - Performance optimization (measure first!)
   - Bundle size reduction
   - ~40-60 hours; do after profiling

4. **Ongoing:** Technical debt
   - Standardize error handling
   - Add constants
   - Document complex algorithms
   - Integrate into regular development sprints

**Before refactoring:**
- Run test suite to establish baseline
- Profile performance to identify actual bottlenecks
- Plan around feature releases (avoid during critical periods)
- Test on low-end devices if performance optimization is goal

---

**Last updated:** 2026-04-11
**Maintained by:** Diego (TecniBus Team)
