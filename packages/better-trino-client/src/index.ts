/**
 * Trino Client Protocol Types
 * Based on: https://trino.io/docs/current/develop/client-protocol.html
 * Source: https://github.com/trinodb/trino/tree/master/client/trino-client
 */

export * from "./types.js";
export * from "./protocol.js";

import type { FetchError, HttpError, QueryResult, Result, TrinoQueryError } from "./types.js";

import type {
  ClientRequestHeaders,
  ClientResponseHeaders,
  QueryError,
  QueryResults,
} from "./protocol.js";

export interface BasicAuth {
  type: "basic";
  username: string;
  password: string;
}

export interface BearerAuth {
  type: "bearer";
  token: string;
}

export type AuthConfig = BasicAuth | BearerAuth;

export interface TrinoClientConfig {
  /** Base URL of the Trino server (e.g., "http://localhost:8080") */
  baseUrl: string;
  /** Authentication configuration (basic or bearer) */
  auth?: AuthConfig;
  /** Default request headers to include in all requests */
  headers?: ClientRequestHeaders;
}

export interface QueryOptions {
  /** Additional headers to include in this specific query */
  headers?: ClientRequestHeaders;
}

export class Trino {
  private baseUrl: string;
  private defaultHeaders: ClientRequestHeaders;
  private auth?: AuthConfig;

  constructor(config: TrinoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.auth = config.auth;
    this.defaultHeaders = config.headers || {};
  }

  /**
   * Execute a query and iterate over the results as they become available
   * Handles fetch, HTTP, and query errors in the error union
   * @param sql - The SQL query to execute
   * @param options - Optional query execution options
   * @yields QueryResult (Ok with QuerySuccessResult or Err with QueryErrorResult)
   */
  async *executeQuery(sql: string, options?: QueryOptions): AsyncGenerator<QueryResult, void> {
    // Each query execution maintains its own session headers
    let sessionHeaders: ClientRequestHeaders = {};
    const headers = this.buildHeaders(sessionHeaders, options?.headers);

    // Initial POST request to /v1/statement
    let response: Response;
    try {
      response = await this.fetch(`${this.baseUrl}/v1/statement`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "text/plain",
        },
        body: sql,
      });
    } catch (error) {
      yield { ok: false, error: this.createFetchError(error) };
      return;
    }

    // Check for HTTP errors
    if (!response.ok) {
      yield { ok: false, error: this.createHttpError(response) };
      return;
    }

    sessionHeaders = this.updateSessionHeaders(sessionHeaders, response.headers);

    let result: QueryResults;
    try {
      result = (await response.json()) as QueryResults;
    } catch (error) {
      yield { ok: false, error: this.createFetchError(error) };
      return;
    }

    // Handle query errors
    if (result.error) {
      yield {
        ok: false,
        error: this.createQueryError(result.error),
      };
      return;
    }

    // Success case - omit error field
    const { error: _omitted1, ...successResult1 } = result;
    yield { ok: true, value: successResult1 };

    // Follow nextUri links until query is complete
    while (result.nextUri) {
      try {
        response = await this.fetch(result.nextUri, {
          method: "GET",
          headers: this.buildHeaders(sessionHeaders),
        });
      } catch (error) {
        yield { ok: false, error: this.createFetchError(error) };
        return;
      }

      // Check for HTTP errors
      if (!response.ok) {
        yield { ok: false, error: this.createHttpError(response) };
        return;
      }

      sessionHeaders = this.updateSessionHeaders(sessionHeaders, response.headers);

      try {
        result = (await response.json()) as QueryResults;
      } catch (error) {
        yield { ok: false, error: this.createFetchError(error) };
        return;
      }

      // Handle query errors
      if (result.error) {
        yield {
          ok: false,
          error: this.createQueryError(result.error),
        };
        return;
      }

      // Success case - omit error field
      const { error: _omitted2, ...successResult2 } = result;
      yield { ok: true, value: successResult2 };
    }
  }

  /**
   * Cancel a running query using its cancel URI
   * @param cancelUri - The partialCancelUri from QueryResults
   * @returns Result indicating success or failure of cancellation
   */
  async cancelQuery(cancelUri: string): Promise<Result<void, FetchError | HttpError>> {
    try {
      const response = await this.fetch(cancelUri, {
        method: "DELETE",
        headers: this.buildHeaders({}),
      });

      // Check if the response is successful (2xx status)
      if (!response.ok) {
        return {
          ok: false,
          error: this.createHttpError(response),
        };
      }

      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: this.createFetchError(error) };
    }
  }

  /**
   * Build request headers by merging default, session, and custom headers
   */
  private buildHeaders(
    sessionHeaders: ClientRequestHeaders,
    customHeaders?: ClientRequestHeaders,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...sessionHeaders,
      ...customHeaders,
    };

    // Add authentication header if configured
    if (this.auth) {
      headers["Authorization"] = this.getAuthorizationHeader();
    }

    // Filter out undefined values
    return Object.fromEntries(
      Object.entries(headers).filter(([_, v]) => v !== undefined),
    ) as Record<string, string>;
  }

  /**
   * Update session headers based on response headers
   */
  private updateSessionHeaders(
    sessionHeaders: ClientRequestHeaders,
    responseHeaders: Headers,
  ): ClientRequestHeaders {
    const updates: Partial<ClientResponseHeaders> = {};

    responseHeaders.forEach((value, key) => {
      updates[key as keyof ClientResponseHeaders] = value;
    });

    const newHeaders = { ...sessionHeaders };

    // Process response headers to update session state
    if (updates["X-Trino-Set-Catalog"]) {
      newHeaders["X-Trino-Catalog"] = updates["X-Trino-Set-Catalog"];
    }
    if (updates["X-Trino-Set-Schema"]) {
      newHeaders["X-Trino-Schema"] = updates["X-Trino-Set-Schema"];
    }
    if (updates["X-Trino-Set-Path"]) {
      newHeaders["X-Trino-Path"] = updates["X-Trino-Set-Path"];
    }
    if (updates["X-Trino-Set-Session"]) {
      const currentSession = newHeaders["X-Trino-Session"] || "";
      const sessions = currentSession ? currentSession.split(",") : [];
      sessions.push(updates["X-Trino-Set-Session"]);
      newHeaders["X-Trino-Session"] = sessions.join(",");
    }
    if (updates["X-Trino-Clear-Session"]) {
      const propertyToRemove = updates["X-Trino-Clear-Session"];
      const currentSession = newHeaders["X-Trino-Session"] || "";
      const sessions = currentSession
        .split(",")
        .filter((s) => !s.startsWith(`${propertyToRemove}=`));
      newHeaders["X-Trino-Session"] = sessions.join(",") || undefined;
    }
    if (updates["X-Trino-Set-Role"]) {
      newHeaders["X-Trino-Role"] = updates["X-Trino-Set-Role"];
    }
    if (updates["X-Trino-Added-Prepare"]) {
      const currentPrepared = newHeaders["X-Trino-Prepared-Statement"] || "";
      const prepared = currentPrepared ? currentPrepared.split(",") : [];
      prepared.push(updates["X-Trino-Added-Prepare"]);
      newHeaders["X-Trino-Prepared-Statement"] = prepared.join(",");
    }
    if (updates["X-Trino-Deallocated-Prepare"]) {
      const nameToRemove = updates["X-Trino-Deallocated-Prepare"];
      const currentPrepared = newHeaders["X-Trino-Prepared-Statement"] || "";
      const prepared = currentPrepared.split(",").filter((s) => !s.startsWith(`${nameToRemove}=`));
      newHeaders["X-Trino-Prepared-Statement"] = prepared.join(",") || undefined;
    }
    if (updates["X-Trino-Started-Transaction-Id"]) {
      newHeaders["X-Trino-Transaction-Id"] = updates["X-Trino-Started-Transaction-Id"];
    }
    if (updates["X-Trino-Clear-Transaction-Id"]) {
      delete newHeaders["X-Trino-Transaction-Id"];
    }
    if (updates["X-Trino-Set-Authorization-User"]) {
      newHeaders["X-Trino-User"] = updates["X-Trino-Set-Authorization-User"];
      // Keep original user if setting authorization
      if (!newHeaders["X-Trino-Original-User"] && this.defaultHeaders["X-Trino-User"]) {
        newHeaders["X-Trino-Original-User"] = this.defaultHeaders["X-Trino-User"];
      }
    }
    if (updates["X-Trino-Reset-Authorization-User"]) {
      if (newHeaders["X-Trino-Original-User"]) {
        newHeaders["X-Trino-User"] = newHeaders["X-Trino-Original-User"];
        delete newHeaders["X-Trino-Original-User"];
      }
    }

    return newHeaders;
  }

  /**
   * Generate Authorization header value based on auth configuration
   */
  private getAuthorizationHeader(): string {
    if (!this.auth) {
      return "";
    }

    if (this.auth.type === "basic") {
      const credentials = `${this.auth.username}:${this.auth.password}`;
      const encoded = Buffer.from(credentials).toString("base64");
      return `Basic ${encoded}`;
    } else if (this.auth.type === "bearer") {
      return `Bearer ${this.auth.token}`;
    }

    return "";
  }

  /**
   * Wrapper around fetch for easier mocking/testing
   */
  private fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, { ...init });
  }

  /**
   * Create a branded FetchError from an unknown error
   */
  private createFetchError(error: unknown): FetchError {
    return {
      _tag: "FetchError",
      error,
    };
  }

  /**
   * Create a branded HttpError from a non-2xx response
   */
  private createHttpError(response: Response): HttpError {
    return {
      _tag: "HttpError",
      response,
    };
  }

  /**
   * Create a branded TrinoQueryError from a QueryError
   */
  private createQueryError(error: QueryError): TrinoQueryError {
    switch (error.errorType) {
      case "USER_ERROR":
        return { ...error, _tag: "UserError" };
      case "INTERNAL_ERROR":
        return { ...error, _tag: "InternalError" };
      case "EXTERNAL":
        return { ...error, _tag: "ExternalError" };
      case "INSUFFICIENT_RESOURCES":
        return { ...error, _tag: "InsufficientResourcesError" };
    }
  }
}
