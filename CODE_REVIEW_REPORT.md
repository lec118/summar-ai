# Comprehensive Code Review Report - Summa AI

**Date:** 2025-11-06
**Reviewer:** AI Code Analyst
**Scope:** Full codebase with focus on recent recording timer and animation changes

---

## Executive Summary

This review identifies **23 issues** across 4 priority levels:
- **Critical (5):** Security and memory leak concerns requiring immediate attention
- **High (8):** Significant code quality and performance issues
- **Medium (7):** Code organization and maintainability improvements
- **Low (3):** Minor enhancements and best practices

---

## 1. Critical Issues (IMMEDIATE ACTION REQUIRED)

### 🔴 CRITICAL-1: Memory Leak in Recording Timer (useHome.ts)
**File:** `apps/web/app/hooks/useHome.ts:136-231`
**Severity:** CRITICAL - Potential Memory Leak

**Issue:**
The `timerRef` cleanup is not comprehensive. If the component unmounts while recording is active, the timer will continue running indefinitely.

**Current Code (Lines 184-187):**
```typescript
// Start timer
timerRef.current = setInterval(() => {
  setRecordingTime((prev) => prev + 1);
}, 1000);
```

**Problem:**
No `useEffect` cleanup to handle component unmounting during recording.

**Impact:**
- Timer continues after component unmounts
- Memory leak accumulates over time
- State updates on unmounted component warnings

**Fix Required:**
```typescript
// Add cleanup effect in useRecording hook
useEffect(() => {
  return () => {
    // Cleanup on unmount
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
}, []);
```

---

### 🔴 CRITICAL-2: Missing Environment Variable Validation (api.ts)
**File:** `apps/web/lib/api.ts:3`
**Severity:** CRITICAL - Security & Reliability

**Issue:**
The BASE_URL fallback to localhost is dangerous in production. No validation that API is actually reachable.

**Current Code:**
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
```

**Problems:**
1. Silent fallback to localhost in production could mask configuration errors
2. No validation that URL is properly formatted
3. Could expose sensitive endpoints if misconfigured

**Impact:**
- Production deployments may silently fail
- Potential security risk if wrong API URL is used
- Difficult to debug in production

**Recommended Fix:**
```typescript
function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;

  // In production, require explicit URL
  if (process.env.NODE_ENV === 'production' && !url) {
    throw new Error('NEXT_PUBLIC_API_URL must be set in production');
  }

  // Validate URL format
  const baseUrl = url || "http://localhost:4000";
  try {
    new URL(baseUrl);
  } catch (e) {
    throw new Error(`Invalid API URL: ${baseUrl}`);
  }

  return baseUrl;
}

const BASE_URL = getApiBaseUrl();
```

---

### 🔴 CRITICAL-3: Inefficient Session Lookup (hooks.ts)
**File:** `apps/web/app/sessions/[sessionId]/hooks.ts:19-32`
**Severity:** CRITICAL - Performance

**Issue:**
The `useSessionData` hook fetches ALL lectures and ALL sessions to find ONE session. This is O(n*m) complexity and causes excessive API calls.

**Current Code:**
```typescript
// Find session by iterating through lectures
const lecturesRes = await apiRequest<any[]>("/lectures");
let foundSession: Session | null = null;

for (const lecture of lecturesRes) {
  const sessionsRes = await apiRequest<Session[]>(
    `/lectures/${lecture.id}/sessions`
  );
  const session = sessionsRes.find((s) => s.id === sessionId);
  if (session) {
    foundSession = session;
    break;
  }
}
```

**Problems:**
1. Makes N+1 API calls (1 for lectures, then 1 for each lecture's sessions)
2. Fetches ALL data just to find ONE item
3. Creates massive performance bottleneck as data scales
4. No caching between calls

**Impact:**
- Page load time increases linearly with number of lectures
- Server overload with unnecessary requests
- Poor user experience

**Recommended Fix:**
Add a direct session endpoint in the backend (which already exists at line 174 of server.ts but isn't being used):

```typescript
// Backend route already exists:
// app.get("/sessions/:sid", async (req, reply) => { ... })

// Use it directly in frontend:
useEffect(() => {
  async function fetchSessionData() {
    try {
      setLoading(true);
      setError(null);

      // Direct fetch - single API call
      const foundSession = await apiRequest<Session>(`/sessions/${sessionId}`);
      setSession(foundSession);

      // Rest of the code...
    } catch (err) {
      // Handle error
    }
  }

  fetchSessionData();
}, [sessionId]);
```

---

### 🔴 CRITICAL-4: Same Inefficiency in Polling Hook
**File:** `apps/web/app/sessions/[sessionId]/hooks.ts:104-118`
**Severity:** CRITICAL - Performance

**Issue:**
The `useSessionPolling` hook repeats the same inefficient pattern every 5 seconds!

**Current Code:**
```typescript
const interval = setInterval(async () => {
  try {
    const lecturesRes = await apiRequest<any[]>("/lectures");
    let foundSession: Session | null = null;

    for (const lecture of lecturesRes) {
      const sessionsRes = await apiRequest<Session[]>(
        `/lectures/${lecture.id}/sessions`
      );
      const s = sessionsRes.find((s) => s.id === sessionId);
      // ...
    }
  }
}, 5000);
```

**Impact:**
- Makes N+1 API calls EVERY 5 SECONDS
- Server gets hammered with unnecessary requests
- Bandwidth waste
- Battery drain on mobile devices

**Fix Required:**
Use the direct session endpoint:
```typescript
const interval = setInterval(async () => {
  try {
    const foundSession = await apiRequest<Session>(`/sessions/${sessionId}`);
    setSession(foundSession);

    // Fetch transcript updates
    const transcriptRes = await apiRequest<{paragraphs: TranscriptParagraph[]}>
      (`/sessions/${sessionId}/transcript`);
    setTranscript(transcriptRes.paragraphs || []);
  } catch (err) {
    console.error("Error polling session status:", err);
  }
}, 5000);
```

---

### 🔴 CRITICAL-5: User Alert Blocking UX
**File:** `apps/web/app/hooks/useHome.ts` (multiple locations)
**Severity:** CRITICAL - User Experience

**Issue:**
Multiple instances of blocking `alert()` calls interrupt user workflow.

**Locations:**
- Line 28: `alert("강의 제목을 입력해주세요.");`
- Line 46: `alert(errorMessage);`
- Line 98-100: `alert(err instanceof ApiError ? err.message : "세션 생성에 실패했습니다.");`
- Line 140: `alert("먼저 강의를 선택하거나 생성하세요.");`
- Line 190: `alert("마이크 접근에 실패했습니다...");`
- Multiple in `hooks.ts` line 201

**Problems:**
1. Blocks entire UI thread
2. Can't be styled or customized
3. Poor accessibility (screen readers)
4. Not mobile-friendly
5. Interrupts user flow

**Recommended Fix:**
Implement a toast notification system:

```typescript
// Create a toast context/hook
interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

// Replace all alert() calls with:
showToast("강의 제목을 입력해주세요.", "warning");
```

---

## 2. High Priority Issues

### 🟠 HIGH-1: Missing TypeScript Strict Types (hooks.ts)
**File:** `apps/web/app/sessions/[sessionId]/hooks.ts:20`
**Severity:** HIGH - Type Safety

**Issue:**
Using `any[]` type defeats TypeScript's purpose.

```typescript
const lecturesRes = await apiRequest<any[]>("/lectures");
```

**Fix:**
```typescript
const lecturesRes = await apiRequest<Lecture[]>("/lectures");
```

---

### 🟠 HIGH-2: No Error Recovery in MediaRecorder (useHome.ts)
**File:** `apps/web/app/hooks/useHome.ts:147-191`
**Severity:** HIGH - Reliability

**Issue:**
No error handlers for MediaRecorder events. If recording fails mid-way, user has no feedback.

**Current Code:**
```typescript
recorder.ondataavailable = (e) => {
  if (e.data.size > 0) chunks.push(e.data);
};

recorder.onstop = async () => {
  // ... upload logic
};
```

**Missing:**
```typescript
recorder.onerror = (event) => {
  console.error("Recording error:", event);
  alert("녹음 중 오류가 발생했습니다. 다시 시도해주세요.");
  setRecording(false);
  // Cleanup
};

recorder.onstart = () => {
  console.log("Recording started successfully");
};
```

---

### 🟠 HIGH-3: Race Condition in Auto-Start Transcription
**File:** `apps/web/app/sessions/[sessionId]/page.tsx:43-47`
**Severity:** HIGH - Logic Bug

**Issue:**
The auto-start effect doesn't have proper dependencies, could fire multiple times.

**Current Code:**
```typescript
useEffect(() => {
  if (autoStart && session?.status === "uploaded" && !transcribing) {
    startTranscription();
  }
}, [autoStart, session?.status]);
```

**Problems:**
1. Missing `transcribing` and `startTranscription` in dependencies
2. Could trigger multiple times if session status changes
3. No guard against double-triggering

**Fix:**
```typescript
const hasAutoStartedRef = useRef(false);

useEffect(() => {
  if (autoStart &&
      session?.status === "uploaded" &&
      !transcribing &&
      !hasAutoStartedRef.current) {
    hasAutoStartedRef.current = true;
    startTranscription();
  }
}, [autoStart, session?.status, transcribing, startTranscription]);
```

---

### 🟠 HIGH-4: No Abort Controller for API Requests
**File:** `apps/web/lib/api.ts:22-86`
**Severity:** HIGH - Resource Management

**Issue:**
Long-running API requests can't be cancelled if component unmounts.

**Current Code:**
```typescript
const response = await fetch(url, {
  ...options,
  headers: {
    "Content-Type": "application/json",
    ...options?.headers,
  },
});
```

**Recommended Enhancement:**
```typescript
export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: options?.signal || controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);
    // ... rest of code
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timeout or cancelled', 408);
    }
    throw error;
  }
}
```

---

### 🟠 HIGH-5: Inline Styles Anti-Pattern
**File:** `apps/web/app/components/home/RecordingControl.tsx` (entire file)
**Severity:** HIGH - Maintainability

**Issue:**
600+ lines of inline styles make the component unmaintainable. Hover effects are particularly problematic.

**Problems:**
1. No style reusability
2. Massive component size
3. Hard to maintain consistency
4. Performance impact (recalculates on every render)
5. Can't benefit from CSS optimizations

**Example (Lines 138-145):**
```typescript
onMouseEnter={(e) => {
  e.currentTarget.style.transform = "scale(1.05)";
  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = "scale(1)";
  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
}}
```

**Recommended Fix:**
Use CSS modules or styled-components:

```typescript
// RecordingControl.module.css
.nextStepButton {
  padding: 18px 36px;
  background: #27ae60;
  transition: all 0.3s;
}

.nextStepButton:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0,0,0,0.4);
}

// Component
import styles from './RecordingControl.module.css';

<button className={styles.nextStepButton}>
  다음 단계로 (텍스트 변환) →
</button>
```

---

### 🟠 HIGH-6: Missing Loading States
**File:** `apps/web/app/hooks/useHome.ts:250-312`
**Severity:** HIGH - User Experience

**Issue:**
File upload provides no progress feedback during upload.

**Current Code (Lines 270-295):**
```typescript
setUploadingFile(true);

const sessionId = await createSession(activeLecture.id, "manual");
if (!sessionId) {
  setUploadingFile(false);
  return;
}

const formData = new FormData();
formData.append("file", file);

try {
  await apiUpload(`/sessions/${sessionId}/upload`, formData);
  setUploadingFile(false);
  // ... success handling
}
```

**Problem:**
Large files show no progress, user doesn't know if upload is stuck or working.

**Recommended Enhancement:**
```typescript
const [uploadProgress, setUploadProgress] = useState(0);

// In apiUpload, use XMLHttpRequest for progress tracking
function apiUploadWithProgress(url: string, formData: FormData, onProgress: (percent: number) => void) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.response));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.open('POST', url);
    xhr.send(formData);
  });
}
```

---

### 🟠 HIGH-7: Breathing Animation Not Server-Side Safe
**File:** `apps/web/app/page.tsx:176-186`
**Severity:** HIGH - SSR Compatibility

**Issue:**
CSS animations in `<style jsx>` may cause hydration mismatches in Next.js.

**Current Code:**
```typescript
<style jsx>{`
  @keyframes breathe {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.3);
      opacity: 0.6;
    }
  }
`}</style>
```

**Problem:**
Next.js may have issues with styled-jsx keyframes in App Router.

**Recommended Fix:**
Move to global CSS or CSS modules:

```css
/* app/globals.css */
@keyframes breathe {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.6;
  }
}

.breathing-dot {
  animation: breathe 2s ease-in-out infinite;
}
```

---

### 🟠 HIGH-8: No Session Status Validation
**File:** `apps/web/app/sessions/[sessionId]/page.tsx:50-52`
**Severity:** HIGH - Logic

**Issue:**
Computed values don't validate session status transitions properly.

**Current Code:**
```typescript
const isTranscriptReady = session?.status === "completed" || transcript.length > 0;
const canStartTranscription = session?.status === "uploaded";
const isTranscribing = session?.status === "processing";
```

**Problem:**
What if `status === "error"`? No error handling for failed states.

**Recommended Fix:**
```typescript
const isTranscriptReady =
  session?.status === "completed" ||
  (session?.status === "processing" && transcript.length > 0);

const canStartTranscription =
  session?.status === "uploaded" &&
  !isTranscribing;

const isTranscribing = session?.status === "processing";

const hasError = session?.status === "error";

// Add error display in UI
{hasError && (
  <div style={{ color: 'red' }}>
    세션 처리 중 오류가 발생했습니다. 다시 시도해주세요.
  </div>
)}
```

---

## 3. Medium Priority Issues

### 🟡 MEDIUM-1: Duplicate Polling Logic
**File:** `apps/web/app/hooks/useHome.ts:57-76` and `apps/web/app/sessions/[sessionId]/hooks.ts:95-140`
**Severity:** MEDIUM - Code Duplication

**Issue:**
Two separate polling implementations with similar logic.

**Impact:**
- Code duplication
- Harder to maintain
- Inconsistent behavior possible

**Recommended Fix:**
Create a shared polling hook:

```typescript
// hooks/usePolling.ts
export function usePolling(
  callback: () => Promise<void>,
  interval: number,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(callback, interval);
    return () => clearInterval(timer);
  }, [callback, interval, enabled]);
}

// Usage in components
usePolling(
  async () => {
    const sessions = await apiRequest<Session[]>(`/lectures/${lectureId}/sessions`);
    setSessions(sessions);
  },
  5000,
  !!activeLecture
);
```

---

### 🟡 MEDIUM-2: Magic Numbers Throughout Codebase
**Severity:** MEDIUM - Maintainability

**Examples:**
- `apps/web/app/hooks/useHome.ts:74`: `5000` (polling interval)
- `apps/web/app/sessions/[sessionId]/hooks.ts:136`: `5000` (polling interval)
- `apps/web/app/sessions/[sessionId]/hooks.ts:174`: `5000` (toast timeout)

**Recommended Fix:**
Create constants file:

```typescript
// lib/constants.ts
export const POLLING_INTERVALS = {
  SESSION_STATUS: 5000, // 5 seconds
  TRANSCRIPT_UPDATE: 5000,
} as const;

export const UI_TIMEOUTS = {
  TOAST_DISPLAY: 5000,
  ERROR_DISMISS: 10000,
} as const;
```

---

### 🟡 MEDIUM-3: Inconsistent Error Handling
**Severity:** MEDIUM - Reliability

**Issue:**
Some errors use `alert()`, some use state, some use console.error only.

**Examples:**
- `useHome.ts:28`: Uses `alert()` for validation
- `useHome.ts:43-46`: Uses both `setError()` and `alert()`
- `hooks.ts:177-179`: Uses `setError()` only

**Recommended Fix:**
Standardize error handling strategy:

```typescript
// Create error handling context
interface ErrorHandler {
  showError: (message: string, options?: ErrorOptions) => void;
  clearError: () => void;
}

// Use consistently across app
const { showError } = useErrorHandler();
showError("강의 제목을 입력해주세요.", { type: "validation" });
```

---

### 🟡 MEDIUM-4: No Input Sanitization
**File:** `apps/web/app/hooks/useHome.ts:26-29`
**Severity:** MEDIUM - Security

**Issue:**
No validation or sanitization of lecture title input.

**Current Code:**
```typescript
async function createLecture(title: string): Promise<Lecture | null> {
  if (!title.trim()) {
    alert("강의 제목을 입력해주세요.");
    return null;
  }
```

**Problems:**
1. No max length validation
2. No special character validation
3. Could cause issues with extremely long inputs

**Recommended Fix:**
```typescript
const MAX_TITLE_LENGTH = 100;

function validateTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim();

  if (!trimmed) {
    return { valid: false, error: "강의 제목을 입력해주세요." };
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `강의 제목은 ${MAX_TITLE_LENGTH}자를 초과할 수 없습니다.`
    };
  }

  // Check for potentially problematic characters
  if (/[<>\"']/.test(trimmed)) {
    return {
      valid: false,
      error: "제목에 특수문자를 사용할 수 없습니다."
    };
  }

  return { valid: true };
}

async function createLecture(title: string): Promise<Lecture | null> {
  const validation = validateTitle(title);
  if (!validation.valid) {
    showError(validation.error!);
    return null;
  }
  // ... rest of logic
}
```

---

### 🟡 MEDIUM-5: Callback Dependencies Missing
**File:** `apps/web/app/hooks/useHome.ts:26`
**Severity:** MEDIUM - React Best Practices

**Issue:**
`createLecture` function is recreated on every render but not memoized.

**Recommended Fix:**
```typescript
const createLecture = useCallback(async (title: string): Promise<Lecture | null> => {
  if (!title.trim()) {
    alert("강의 제목을 입력해주세요.");
    return null;
  }

  try {
    setError(null);
    const lecture = await apiRequest<Lecture>("/lectures", {
      method: "POST",
      body: JSON.stringify({ title: title.trim() }),
    });

    setLectures((prev) => [lecture, ...prev]);
    return lecture;
  } catch (err) {
    // ... error handling
  }
}, [setLectures, setError]); // Add dependencies
```

---

### 🟡 MEDIUM-6: No Accessibility Labels
**File:** `apps/web/app/components/home/RecordingControl.tsx`
**Severity:** MEDIUM - Accessibility

**Issue:**
Buttons lack proper ARIA labels and screen reader support.

**Examples:**
- Line 152-190: Main recording button has no aria-label
- Line 278: Pause button
- Line 308: Resume button

**Recommended Fix:**
```typescript
<button
  onClick={onStartRecording}
  aria-label="음성 녹음 시작"
  aria-disabled={pending}
  // ... other props
>
  <span aria-hidden="true">🎤</span>
  <div>녹음 시작</div>
</button>
```

---

### 🟡 MEDIUM-7: Timer Format Issue with Long Recordings
**File:** `apps/web/app/components/home/RecordingControl.tsx:17-26`
**Severity:** MEDIUM - Edge Case

**Issue:**
`formatTime` function could produce incorrect output for recordings over 24 hours.

**Current Code:**
```typescript
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
```

**Problem:**
No maximum recording time validation. User could record for days.

**Recommended Enhancement:**
```typescript
const MAX_RECORDING_SECONDS = 4 * 60 * 60; // 4 hours

function formatTime(seconds: number): string {
  if (seconds >= MAX_RECORDING_SECONDS) {
    return "MAX TIME REACHED";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// In useRecording hook, add max time check
useEffect(() => {
  if (recordingTime >= MAX_RECORDING_SECONDS) {
    stopRecording();
    alert("최대 녹음 시간(4시간)에 도달했습니다. 녹음이 자동으로 중지됩니다.");
  }
}, [recordingTime]);
```

---

## 4. Low Priority Issues

### 🔵 LOW-1: Console.log Statements in Production
**Files:** Multiple
**Severity:** LOW - Best Practice

**Locations:**
- `apps/web/app/sessions/[sessionId]/hooks.ts`: Lines 49, 63, 75
- `apps/api/src/server.ts`: Lines 35-38
- `apps/api/src/worker.ts`: Lines 9, 20, 118

**Recommended Fix:**
Use a proper logging library or environment-based logging:

```typescript
// lib/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args); // Always log errors
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  }
};
```

---

### 🔵 LOW-2: Hardcoded Korean Strings
**Files:** All frontend files
**Severity:** LOW - Internationalization

**Issue:**
All UI strings are hardcoded in Korean, making internationalization difficult.

**Recommended Enhancement:**
Use i18n library:

```typescript
// lib/i18n/ko.json
{
  "recording.start": "녹음 시작",
  "recording.stop": "녹음 종료",
  "recording.pause": "녹음 중지"
}

// Component
import { useTranslation } from 'next-i18next';

const { t } = useTranslation('common');
<button>{t('recording.start')}</button>
```

---

### 🔵 LOW-3: Missing Code Comments
**File:** `apps/web/app/hooks/useHome.ts`
**Severity:** LOW - Maintainability

**Issue:**
Complex logic like timer management and media recording lacks explanatory comments.

**Recommended Addition:**
```typescript
/**
 * Manages audio recording with pause/resume functionality
 * Handles timer synchronization with recording state
 *
 * @param activeLecture - The currently selected lecture
 * @param createSession - Function to create a new session
 * @returns Recording state and control functions
 */
export function useRecording(
  activeLecture: Lecture | null,
  createSession: (lectureId: string, mode: "manual" | "auto") => Promise<string | null>
) {
  // Timer ref maintains interval between renders
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ... rest of code with inline comments
}
```

---

## 5. Security Analysis

### ✅ PASSED Security Checks:

1. **API Error Handling:** Properly typed and caught
2. **Zod Validation:** Input validation on backend using Zod schemas
3. **CORS Configuration:** Proper CORS setup with origin validation
4. **Redis Connection:** Secure with retry logic and health checks
5. **Environment Variables:** Validated in config.ts

### ⚠️ Security Concerns:

1. **File Upload Size Limits:** Set to 500MB (CONSTANTS.MAX_FILE_SIZE) - very large, could cause DoS
2. **No Rate Limiting on Frontend:** Could spam backend with requests
3. **No CSRF Protection:** Consider adding tokens for state-changing operations
4. **Session IDs:** Using UUIDs (good) but no additional session validation

---

## 6. Performance Analysis

### Current Performance Metrics:

**Strengths:**
- ✅ Lazy loading with Next.js dynamic imports
- ✅ Server-side rendering support
- ✅ Polling intervals reasonable (5 seconds)
- ✅ React component memoization opportunities

**Bottlenecks:**
- ❌ N+1 query pattern in session lookup (CRITICAL-3, CRITICAL-4)
- ❌ Inline styles recalculated every render (HIGH-5)
- ❌ No request deduplication
- ❌ Polling continues even when page not visible

### Recommended Performance Improvements:

```typescript
// 1. Use Page Visibility API to pause polling when tab inactive
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Stop polling
    } else {
      // Resume polling
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);

// 2. Implement request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const key = `${path}:${JSON.stringify(options)}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fetchData<T>(path, options);
  pendingRequests.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(key);
  }
}
```

---

## 7. Testing Recommendations

### Current State:
- ❌ No test files found in codebase
- ❌ No test coverage reports
- ❌ No E2E tests

### Recommended Test Coverage:

```typescript
// tests/hooks/useRecording.test.ts
describe('useRecording', () => {
  it('should cleanup timer on unmount', () => {
    const { unmount } = renderHook(() => useRecording(mockLecture, mockCreateSession));
    unmount();
    // Verify timer is cleared
  });

  it('should pause and resume timer correctly', async () => {
    const { result } = renderHook(() => useRecording(mockLecture, mockCreateSession));
    await act(() => result.current.startRecording());
    await act(() => result.current.pauseRecording());
    // Verify timer paused
  });
});

// tests/api/apiRequest.test.ts
describe('apiRequest', () => {
  it('should handle network errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network failure')));

    await expect(apiRequest('/test')).rejects.toThrow(ApiError);
  });
});
```

---

## 8. Code Quality Metrics

### Complexity Analysis:

**High Complexity Functions:**
1. `useSessionData` - Cyclomatic complexity: ~8 (nested loops and conditionals)
2. `RecordingControl` component - 376 lines (too large)
3. `SessionDetailPage` - 574 lines (too large)

**Recommended Refactoring:**
Break down large components:

```typescript
// Instead of one massive RecordingControl.tsx:

// components/recording/RecordingButton.tsx
// components/recording/RecordingStatus.tsx
// components/recording/RecordingTimer.tsx
// components/recording/RecordingControls.tsx
// components/recording/RecordingCompleted.tsx

// Then compose in main component:
export function RecordingControl() {
  return (
    <div>
      {recordingCompleted ? (
        <RecordingCompleted sessionId={currentSessionId} />
      ) : !recording ? (
        <RecordingButton onStart={onStartRecording} />
      ) : (
        <>
          <RecordingStatus paused={paused} time={recordingTime} />
          <RecordingControls
            paused={paused}
            onPause={onPauseRecording}
            onResume={onResumeRecording}
            onStop={onStopRecording}
          />
        </>
      )}
    </div>
  );
}
```

---

## 9. Best Practices Review

### React Hooks Usage: ⚠️ NEEDS IMPROVEMENT

**Issues Found:**
1. Missing dependency arrays (page.tsx:47)
2. Missing cleanup in useEffect (useHome.ts timer)
3. Not using useCallback for stable references
4. Recreating functions on every render

### TypeScript Usage: ⚠️ NEEDS IMPROVEMENT

**Issues Found:**
1. Using `any` type (hooks.ts:20)
2. Optional chaining overused (`session?.status` everywhere)
3. Missing return type annotations on some functions

### Component Structure: ⚠️ NEEDS IMPROVEMENT

**Issues Found:**
1. Components too large (>300 lines)
2. Inline styles everywhere
3. Business logic mixed with presentation
4. No component separation of concerns

---

## 10. Immediate Action Items

### Priority Order for Fixes:

1. **TODAY:**
   - Fix CRITICAL-1: Add useEffect cleanup for timer
   - Fix CRITICAL-3 & CRITICAL-4: Use direct session endpoint

2. **THIS WEEK:**
   - Fix CRITICAL-2: Validate environment variables
   - Fix CRITICAL-5: Replace all alert() calls with toast system
   - Fix HIGH-2: Add MediaRecorder error handlers
   - Fix HIGH-3: Add auto-start guard

3. **THIS SPRINT:**
   - Refactor RecordingControl component (HIGH-5)
   - Add progress indicators (HIGH-6)
   - Fix all TypeScript any types (HIGH-1)
   - Add abort controllers (HIGH-4)

4. **BACKLOG:**
   - All Medium priority items
   - Add comprehensive testing
   - Implement i18n
   - Add accessibility improvements

---

## 11. Positive Findings

### ✅ Well-Implemented Features:

1. **Type Safety with Zod:** Excellent use of Zod for runtime validation
2. **Error Handling in API Layer:** Proper error types and handling
3. **Redis Retry Logic:** Well-implemented connection retry strategy
4. **Graceful Shutdown:** Both server and worker have proper shutdown handlers
5. **Environment Configuration:** Centralized config with validation
6. **Component Modularity:** Good separation of concerns in hooks
7. **Code Organization:** Clear folder structure and naming conventions
8. **Recent Timer Implementation:** Core logic is sound, just needs cleanup

---

## 12. Conclusion

The codebase shows good architectural decisions but needs immediate attention to **5 critical issues**, particularly:

1. Memory leak in recording timer
2. Inefficient N+1 API calls pattern
3. Missing environment validation
4. Blocking alert() calls

The recent recording timer and animation implementation is **functionally correct** but needs **cleanup for memory management** and **performance optimization**.

**Overall Grade: B- (Good foundation, needs refinement)**

---

## Appendix: Quick Reference

### Files Requiring Immediate Changes:

1. `apps/web/app/hooks/useHome.ts` - Add useEffect cleanup
2. `apps/web/app/sessions/[sessionId]/hooks.ts` - Fix API call pattern
3. `apps/web/lib/api.ts` - Add environment validation
4. `apps/web/app/components/home/RecordingControl.tsx` - Refactor inline styles

### Estimated Effort:

- Critical fixes: 4-6 hours
- High priority fixes: 2-3 days
- Medium priority fixes: 1 week
- Complete refactoring: 2-3 weeks

---

**End of Report**
