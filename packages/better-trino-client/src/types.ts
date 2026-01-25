/**
 * Library-specific types for the Trino client
 * These types provide a type-safe Result-based API for error handling
 */

import type {
  UserError,
  InternalError,
  ExternalError,
  InsufficientResourcesError,
  QueryResults,
} from "./protocol.js";

/**
 * Branded type for fetch/network errors (network failures, connection issues, etc.)
 */
export interface FetchError {
  readonly _tag: "FetchError";
  readonly error: unknown;
}

/**
 * Branded type for HTTP errors (non-2xx status codes)
 * The status and statusText can be accessed via response.status and response.statusText
 */
export interface HttpError {
  readonly _tag: "HttpError";
  readonly response: Response;
}

/**
 * User error - typically caused by invalid SQL or incorrect usage
 * Includes errors like TABLE_NOT_FOUND, COLUMN_NOT_FOUND, TYPE_MISMATCH, DIVISION_BY_ZERO, etc.
 */
export interface TrinoUserError extends UserError {
  readonly _tag: "UserError";
}

/**
 * Internal error - server-side error in Trino
 */
export interface TrinoInternalError extends InternalError {
  readonly _tag: "InternalError";
}

/**
 * External error - error from external systems (connectors, etc.)
 */
export interface TrinoExternalError extends ExternalError {
  readonly _tag: "ExternalError";
}

/**
 * Insufficient resources error
 */
export interface TrinoInsufficientResourcesError extends InsufficientResourcesError {
  readonly _tag: "InsufficientResourcesError";
}

/**
 * Discriminated union of all Trino query error types
 */
export type TrinoQueryError =
  | TrinoUserError
  | TrinoInternalError
  | TrinoExternalError
  | TrinoInsufficientResourcesError;

/**
 * Result type for safe error handling (similar to Rust's Result<T, E>)
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Successful query result without error field
 */
export type QuerySuccessResult = Omit<QueryResults, "error">;

/**
 * Discriminated union of all possible error types
 */
export type QueryErrorResult = FetchError | HttpError | TrinoQueryError;

/**
 * Main result type that handles fetch, HTTP, and query errors
 */
export type QueryResult = Result<QuerySuccessResult, QueryErrorResult>;
