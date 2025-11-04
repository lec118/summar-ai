import type { ApiResponseType } from "@summa/shared";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Note: API routes do NOT have an /api prefix
// Routes are: /lectures, /sessions, etc.

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Type-safe API client with error handling
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let details: unknown;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          details = errorData.details;
        }
      } catch {
        // Response body is not JSON, use status text
      }

      throw new ApiError(errorMessage, response.status, details);
    }

    // Parse response
    const data: ApiResponseType<T> = await response.json();

    // Check API response format
    if (!data.ok) {
      throw new ApiError(
        data.error || "Unknown API error",
        response.status,
        data.details
      );
    }

    return data.data;
  } catch (error) {
    // Network errors or other exceptions
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(
        "네트워크 연결을 확인해주세요. API 서버가 실행 중인지 확인하세요.",
        0
      );
    }

    throw new ApiError(
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
      0
    );
  }
}

/**
 * Upload file with error handling
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let details: unknown;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          details = errorData.details;
        }
      } catch {
        // Response body is not JSON
      }

      throw new ApiError(errorMessage, response.status, details);
    }

    const data: ApiResponseType<T> = await response.json();

    if (!data.ok) {
      throw new ApiError(
        data.error || "Upload failed",
        response.status,
        data.details
      );
    }

    return data.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(
        "네트워크 연결을 확인해주세요. API 서버가 실행 중인지 확인하세요.",
        0
      );
    }

    throw new ApiError(
      error instanceof Error ? error.message : "파일 업로드에 실패했습니다",
      0
    );
  }
}

/**
 * Helper to construct API URLs
 */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}
