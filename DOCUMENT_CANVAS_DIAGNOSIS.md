# Document Canvas System Diagnosis - React Infinite Loop Analysis

## Error Message
```
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, 
but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

**Location**: SpartanCanvasRenderer component (ScandinavianDocument sub-component)

---

## Root Cause Analysis

### CRITICAL ISSUE #1: Stale Closure in buildImmutableDocument (Lines 599-647)

**Problem**: The `buildImmutableDocument` useCallback accesses `frozenVersions` (a ref) but doesn't have it in the dependency array.

```typescript
const buildImmutableDocument = React.useCallback(() => {
  // ... code ...
  if (frozenVersions.has(v)) {  // ❌ Accessing ref but not in dependencies
    versionContent = frozenVersions.get(v) || '';
  }
  // ... code ...
}, [currentRevision, activeTypingVersion, activeTypingContent, revisionHistory]);
// ❌ frozenVersions is missing from dependencies (intentionally, but causes issues)
```

**Why it causes loops**:
- `frozenVersions` is a ref (`frozenVersionsRef.current`) that gets updated
- When `frozenVersions` changes, `buildImmutableDocument()` returns different content
- But the useCallback doesn't recreate because frozenVersions isn't in dependencies
- This creates a stale closure where the function captures old frozenVersions values

### CRITICAL ISSUE #2: displayedText useEffect Infinite Loop (Lines 1034-1044)

**Problem**: The useEffect calls `buildImmutableDocument()` but doesn't properly track all its internal dependencies.

```typescript
useEffect(() => {
  const result = buildImmutableDocument();  // ❌ This function accesses frozenVersions
  setDisplayedText(result.content);
  setVersionSections(result.sections);
  // ... scroll code ...
}, [currentRevision, activeTypingContent, selectedVersion]);
// ❌ Comment says "Removed buildImmutableDocument to prevent infinite loop"
// ❌ But the function still accesses frozenVersions which changes frequently
```

**The Loop Mechanism**:
1. Component renders with frozenVersions = Map(1 -> "content v1")
2. useEffect runs, calls buildImmutableDocument()
3. buildImmutableDocument reads frozenVersions.has(1) = true
4. Later, a version completes and updates frozenVersions = Map(1 -> "content v1", 2 -> "content v2")
5. frozenVersions is a ref, so no re-render triggered
6. But when activeTypingContent changes, useEffect runs again
7. buildImmutableDocument now sees different frozenVersions content
8. setDisplayedText triggers with new content
9. This causes a state update which triggers more renders
10. **INFINITE LOOP**

### CRITICAL ISSUE #3: content useMemo Stale Closure (Lines 656-674)

```typescript
const content = React.useMemo(() => {
  if (selectedVersion) {
    if (frozenVersions.has(selectedVersion)) {  // ❌ Accessing ref
      return frozenVersions.get(selectedVersion) || '';
    }
    // ... code ...
  }
  const result = buildImmutableDocument();  // ❌ Calls function that accesses ref
  return result.content;
}, [selectedVersion, activeTypingVersion, activeTypingContent, currentRevision, revisionHistory]);
// ❌ frozenVersions missing, but accessed inside
```

**Why it's a problem**:
- useMemo caches the value based on dependencies
- But it accesses frozenVersions which isn't in dependencies
- When frozenVersions changes, useMemo returns stale cached value
- This causes mismatched content and triggers re-renders

### CRITICAL ISSUE #4: Auto-Switch Tab Effect (Lines 2039-2073)

```typescript
useEffect(() => {
  if (canvasElements.length > 0) {
    const latestElement = canvasElements[canvasElements.length - 1];
    // ... code ...
    analyzeCanvasWithNPU(canvasElements, `New ${latestElement.type} element added`);
  }
}, [canvasElements, analyzeCanvasWithNPU, transitionState, createAtomicVersion, finalizeVersion]);
```

**Problems**:
- `analyzeCanvasWithNPU`, `transitionState`, `createAtomicVersion`, `finalizeVersion` are not memoized
- They come from the Zustand store and create new function references on every render
- This causes the effect to run on every render
- Each run might trigger state updates that cause more renders

### ISSUE #5: Canvas Elements Selector (Lines 1644-1648)

```typescript
const canvasElements = useCanvasStore(
  state => state.canvasElementsByConversation[state.currentConversationId] || [],
  (a, b) => a.length === b.length && a.every((el, i) => el.id === b[i]?.id)
);
```

**Potential Problem**:
- The comparison function only checks length and IDs
- If element content changes but ID doesn't, it returns the same reference
- But later code expects updated content
- This can cause stale data and trigger re-renders

### ISSUE #6: Seeding Frozen Versions Effect (Lines 576-594)

```typescript
useEffect(() => {
  if (seededRefDocRef.current) return;
  try {
    if (Array.isArray(revisionHistory)) {
      revisionHistory.forEach((rev: any) => {
        // ... code that updates frozenVersionsRef ...
        frozenVersionsRef.current.set(rev.version, content);  // ❌ Updates ref
      });
    }
    seededRefDocRef.current = true;
  } catch {}
}, [currentRevision, revisionHistory, element.id, setFrozenVersion]);
// Comment says "CRITICAL: Removed frozenVersions to prevent infinite loop"
```

**The Problem**:
- Updates `frozenVersionsRef.current` directly
- This doesn't trigger re-renders (because it's a ref)
- But other code depends on frozenVersions being up-to-date
- Creates desynchronization between ref state and component state

---

## The Cascade Effect

Here's how these issues compound into an infinite loop:

1. **Initial Render**: Component loads with document v1
2. **Typewriter Effect**: Starts typing v1 content
3. **Version Completes**: v1 finishes, freezes content via `setFrozenVersion`
4. **Store Update**: Zustand store updates element.frozenVersions
5. **No Re-render**: frozenVersionsRef.current updated but doesn't trigger render
6. **activeTypingContent Changes**: As typing progresses
7. **displayedText Effect Runs**: Calls buildImmutableDocument()
8. **Stale Closure**: buildImmutableDocument uses old frozenVersions
9. **Content Mismatch**: DisplayedText doesn't match actual frozen state
10. **Scroll Code Runs**: contentContainerRef.current.scrollTop updated
11. **Another State Change**: Something else triggers a render
12. **Effect Runs Again**: With still-stale frozenVersions
13. **Different Result**: buildImmutableDocument now sees new frozenVersions
14. **setDisplayedText**: Triggers state update
15. **Re-render**: Component re-renders
16. **Repeat from Step 7**: **INFINITE LOOP**

---

## Additional Contributing Factors

### 1. Multiple State Updates in Single Effect
Many useEffects perform multiple setState calls:
```typescript
setDisplayedText(result.content);
setVersionSections(result.sections);
contentContainerRef.current.scrollTop = ...;  // DOM update
```
This can trigger multiple re-renders in quick succession.

### 2. Ref Updates Without Re-renders
```typescript
frozenVersionsRef.current.set(version, content);  // Silent update
```
Other parts of the code expect this to be reactive, but it's not.

### 3. Dependency Array Confusion
Multiple comments say "Removed X to prevent infinite loop" but the code still uses X:
- `buildImmutableDocument` removed from deps but still called
- `frozenVersions` removed from deps but still accessed

### 4. Async State Updates
```typescript
setTimeout(() => {
  frozenVersionsRef.current.set(activeTypingVersion!, targetContent);
}, someDelay);
```
Async updates can arrive out of order, causing unexpected state.

### 5. Store Function Instability
Functions from Zustand store aren't stable references:
```typescript
const { setFrozenVersion, getFrozenVersions } = useCanvasStore();
```
These might be new functions on every render.

---

## Files Involved

1. **src/components/SpartanCanvasRenderer.tsx** (2411 lines)
   - ScandinavianDocument component (lines 283-1340)
   - SpartanCanvasRenderer component (lines 1643-2407)

2. **src/stores/canvasStore.ts** (1710 lines)
   - setFrozenVersion (lines 433-455)
   - getFrozenVersions (lines 457-463)
   - Canvas element management

3. **src/hooks/useCollaborativeDocument.ts** (78 lines)
   - Collaborative document hook
   - setState calls in useCallback

---

## Solution Strategy

### Immediate Fixes

1. **Convert frozenVersions from Ref to State**
   - Make it reactive so changes trigger re-renders
   - Or use a different approach entirely

2. **Fix buildImmutableDocument Dependencies**
   - Either add frozenVersions to deps (if it's state)
   - Or restructure to not depend on it

3. **Fix displayedText useEffect**
   - Ensure all accessed values are in dependency array
   - Or split into multiple effects with clear boundaries

4. **Memoize Store Functions**
   - Use useCallback to stabilize function references
   - Or access functions directly from store without destructuring

5. **Simplify State Management**
   - Reduce number of state variables
   - Batch related state updates
   - Use state reducers for complex updates

### Long-term Refactoring

1. **Separate Concerns**
   - Split ScandinavianDocument into smaller components
   - Each component manages its own isolated state
   
2. **Use State Machines**
   - Define clear states: idle, typing, completed
   - Prevent invalid state transitions

3. **Event-Driven Architecture**
   - Use events instead of direct state manipulation
   - Centralize state updates

4. **Better Testing**
   - Add unit tests for each useEffect
   - Test dependency arrays
   - Test for infinite loops

---

## Recommended Fix Order

1. ✅ **FIRST**: Fix frozenVersions reactivity issue
2. ✅ **SECOND**: Fix buildImmutableDocument stale closure
3. ✅ **THIRD**: Fix displayedText useEffect dependencies  
4. ✅ **FOURTH**: Fix auto-switch tab effect dependencies
5. ✅ **FIFTH**: Simplify state management and remove redundant state
6. ✅ **SIXTH**: Add error boundaries and safety checks

---

## Testing Strategy

After fixes:
1. Load document canvas
2. Let version 1 complete typing
3. Request version 2
4. Watch for console errors
5. Monitor React DevTools for excessive renders
6. Check that content displays correctly
7. Verify version switching works
8. Test continuation prompts
9. Test collaborative mode toggle
10. Test export functions

---

## Prevention Guidelines

1. **Always include accessed values in dependency arrays**
2. **Avoid refs for reactive data - use state instead**
3. **Memoize functions that are used as dependencies**
4. **Use useCallback/useMemo appropriately**
5. **Batch related state updates**
6. **Add comments explaining why dependencies are excluded**
7. **Use ESLint exhaustive-deps rule**
8. **Test effects in isolation**

---

## Conclusion

The infinite loop is caused by a combination of:
- **Stale closures** (frozenVersions ref accessed but not in deps)
- **Missing dependencies** (buildImmutableDocument not properly tracked)
- **Unstable function references** (store functions not memoized)
- **Complex state interdependencies** (multiple states triggering each other)

The fix requires careful refactoring of the state management system to ensure all reactive values are properly tracked and all effects have correct dependency arrays.









