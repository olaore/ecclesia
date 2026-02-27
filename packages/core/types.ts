// Shared utility types that don't require Zod validation.
// Add generic interfaces, enums, or helper types here as the project grows.

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Pagination metadata for list endpoints */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}
