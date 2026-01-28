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
  private sessionHeaders: ClientRequestHeaders;

  constructor(config: TrinoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.auth = config.auth;
    this.defaultHeaders = config.headers || {};
    this.sessionHeaders = {};
  }

  /**
   * Execute a query and iterate over the results as they become available
   * Handles fetch, HTTP, and query errors in the error union
   * @param sql - The SQL query to execute
   * @param options - Optional query execution options
   * @yields QueryResult (Ok with QuerySuccessResult or Err with QueryErrorResult)
   */
  async *executeQuery(sql: string, options?: QueryOptions): AsyncGenerator<QueryResult, void> {
    const headers = this.buildHeaders(this.sessionHeaders, options?.headers);

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

    this.sessionHeaders = this.updateSessionHeaders(this.sessionHeaders, response.headers);

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
          headers: this.buildHeaders(this.sessionHeaders),
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

      this.sessionHeaders = this.updateSessionHeaders(this.sessionHeaders, response.headers);

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
    const updates: ClientResponseHeaders = {};

    // Headers API returns lowercase header names
    responseHeaders.forEach((value, key) => {
      updates[key as keyof ClientResponseHeaders] = value;
    });

    const newHeaders: ClientRequestHeaders = { ...sessionHeaders };

    // Process response headers to update session state
    if (updates["x-trino-set-catalog"]) {
      newHeaders["x-trino-catalog"] = updates["x-trino-set-catalog"];
    }
    if (updates["x-trino-set-schema"]) {
      newHeaders["x-trino-schema"] = updates["x-trino-set-schema"];
    }
    if (updates["x-trino-set-path"]) {
      newHeaders["x-trino-path"] = updates["x-trino-set-path"];
    }
    if (updates["x-trino-set-session"]) {
      const currentSession = newHeaders["x-trino-session"] || "";
      const sessions = currentSession ? currentSession.split(",") : [];
      sessions.push(updates["x-trino-set-session"]);
      newHeaders["x-trino-session"] = sessions.join(",");
    }
    if (updates["x-trino-clear-session"]) {
      const currentSession = newHeaders["x-trino-session"] || "";
      const sessions = currentSession
        .split(",")
        .filter((s) => !s.startsWith(`${updates["x-trino-clear-session"]}=`));
      newHeaders["x-trino-session"] = sessions.join(",") || undefined;
    }
    if (updates["x-trino-set-role"]) {
      newHeaders["x-trino-role"] = updates["x-trino-set-role"];
    }
    if (updates["x-trino-added-prepare"]) {
      const currentPrepared = newHeaders["x-trino-prepared-statement"] || "";
      const prepared = currentPrepared ? currentPrepared.split(",") : [];
      prepared.push(updates["x-trino-added-prepare"]);
      newHeaders["x-trino-prepared-statement"] = prepared.join(",");
    }
    if (updates["x-trino-deallocated-prepare"]) {
      const currentPrepared = newHeaders["x-trino-prepared-statement"] || "";
      const prepared = currentPrepared
        .split(",")
        .filter((s) => !s.startsWith(`${updates["x-trino-deallocated-prepare"]}=`));
      newHeaders["x-trino-prepared-statement"] = prepared.join(",") || undefined;
    }
    if (updates["x-trino-started-transaction-id"]) {
      newHeaders["x-trino-transaction-id"] = updates["x-trino-started-transaction-id"];
    }
    if (updates["x-trino-clear-transaction-id"]) {
      delete newHeaders["x-trino-transaction-id"];
    }
    if (updates["x-trino-set-authorization-user"]) {
      newHeaders["x-trino-user"] = updates["x-trino-set-authorization-user"];
      // Keep original user if setting authorization
      if (!newHeaders["x-trino-original-user"] && this.defaultHeaders["x-trino-user"]) {
        newHeaders["x-trino-original-user"] = this.defaultHeaders["x-trino-user"];
      }
    }
    if (updates["x-trino-reset-authorization-user"]) {
      if (newHeaders["x-trino-original-user"]) {
        newHeaders["x-trino-user"] = newHeaders["x-trino-original-user"];
        delete newHeaders["x-trino-original-user"];
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
