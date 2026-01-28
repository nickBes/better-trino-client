/**
 * Integration tests for Trino client
 * Requires docker-compose up to be running with Trino container
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { Trino } from "./index.js";
import type { QuerySuccessResult, QueryResult } from "./types.js";

const TRINO_BASE_URL = process.env.TRINO_URL || "http://localhost:8080";

/**
 * Helper to unwrap QueryResult and throw on error
 */
function unwrap(result: QueryResult): QuerySuccessResult {
  if (!result.ok) {
    if (result.error._tag === "FetchError") {
      throw new Error(`Fetch error: ${result.error.error}`);
    } else if (result.error._tag === "HttpError") {
      throw new Error(
        `HTTP error: ${result.error.response.status} ${result.error.response.statusText}`,
      );
    } else {
      throw new Error(`Query error (${result.error.errorType}): ${result.error.message}`);
    }
  }
  return result.value;
}

describe("Trino Client", () => {
  let client: Trino;

  beforeAll(() => {
    client = new Trino({
      baseUrl: TRINO_BASE_URL,
      headers: {
        "x-trino-user": "test-user",
        "x-trino-catalog": "tpch",
        "x-trino-schema": "tiny",
      },
    });
  });

  describe("Basic Query Execution", () => {
    test("should execute query and return results with columns and data", async () => {
      const results: QuerySuccessResult[] = [];
      const allData: unknown[][] = [];

      for await (const result of client.executeQuery("SELECT 1 as num, 'test' as text")) {
        const queryResult = unwrap(result);
        results.push(queryResult);
        if (queryResult.data) {
          allData.push(...queryResult.data);
        }
      }

      expect(results.length).toBeGreaterThan(0);
      const finalResult = results[results.length - 1]!;
      expect(finalResult.columns).toBeDefined();
      expect(finalResult.columns?.length).toBe(2);
      expect(allData.length).toBe(1);
      expect(allData[0]).toEqual([1, "test"]);
    });

    test("should provide query statistics", async () => {
      for await (const result of client.executeQuery("SELECT * FROM nation LIMIT 5")) {
        const queryResult = unwrap(result);
        expect(queryResult.id).toBeDefined();
        expect(queryResult.stats).toBeDefined();
        expect(queryResult.stats.state).toBeDefined();
        expect(typeof queryResult.stats.elapsedTimeMillis).toBe("number");
        expect(Array.isArray(queryResult.warnings)).toBe(true);
      }
    });

    test("should handle session management", async () => {
      const results: QuerySuccessResult[] = [];

      for await (const result of client.executeQuery("SET SESSION query_max_run_time = '10m'")) {
        results.push(unwrap(result));
      }

      expect(results.length).toBeGreaterThan(0);
      expect(results[results.length - 1]!.updateType).toBe("SET SESSION");
    });
  });

  describe("Column Types", () => {
    test("should handle different column types", async () => {
      let columns: QuerySuccessResult["columns"];

      for await (const result of client.executeQuery(`
        SELECT
          CAST(1 AS BIGINT) as bigint_col,
          CAST(1.5 AS DOUBLE) as double_col,
          CAST('text' AS VARCHAR) as varchar_col,
          CAST(true AS BOOLEAN) as boolean_col,
          CAST(DATE '2024-01-01' AS DATE) as date_col
      `)) {
        const queryResult = unwrap(result);
        if (queryResult.columns) {
          columns = queryResult.columns;
        }
      }

      expect(columns).toBeDefined();
      expect(columns?.length).toBe(5);
      expect(columns?.map((c) => c.name)).toEqual([
        "bigint_col",
        "double_col",
        "varchar_col",
        "boolean_col",
        "date_col",
      ]);
    });

    test("should handle complex types (array, map, row)", async () => {
      let columns: QuerySuccessResult["columns"];
      let data: unknown[][];

      for await (const result of client.executeQuery(`
        SELECT
          ARRAY[1, 2, 3] as array_col,
          MAP(ARRAY['key1', 'key2'], ARRAY[10, 20]) as map_col,
          ROW(1, 'text', true) as row_col,
          ARRAY[ARRAY[1, 2], ARRAY[3, 4]] as nested_array_col
      `)) {
        const queryResult = unwrap(result);
        if (queryResult.columns) {
          columns = queryResult.columns;
        }
        if (queryResult.data) {
          data = queryResult.data;
        }
      }

      expect(columns).toBeDefined();
      expect(columns?.length).toBe(4);

      const arrayCol = columns?.find((c) => c.name === "array_col");
      expect(arrayCol?.type).toMatch(/^array\(/);
      expect(arrayCol?.typeSignature?.rawType).toBe("array");

      const mapCol = columns?.find((c) => c.name === "map_col");
      expect(mapCol?.type).toMatch(/^map\(/);
      expect(mapCol?.typeSignature?.rawType).toBe("map");

      const rowCol = columns?.find((c) => c.name === "row_col");
      expect(rowCol?.type).toMatch(/^row\(/);
      expect(rowCol?.typeSignature?.rawType).toBe("row");

      expect(data!.length).toBe(1);
      expect(data![0]![0]).toEqual([1, 2, 3]);
      expect(data![0]![1]).toEqual({ key1: 10, key2: 20 });
    });

    test("should verify rawType values match standard types", async () => {
      let columns: QuerySuccessResult["columns"];

      for await (const result of client.executeQuery(`
        SELECT
          CAST(1 AS BIGINT) as bigint_col,
          CAST('test' AS VARCHAR) as varchar_col,
          ARRAY[1, 2, 3] as array_col,
          MAP(ARRAY['a'], ARRAY[1]) as map_col
      `)) {
        const queryResult = unwrap(result);
        if (queryResult.columns) {
          columns = queryResult.columns;
        }
      }

      expect(columns).toBeDefined();
      expect(columns?.find((c) => c.name === "bigint_col")?.typeSignature?.rawType).toBe("bigint");
      expect(columns?.find((c) => c.name === "varchar_col")?.typeSignature?.rawType).toBe(
        "varchar",
      );
      expect(columns?.find((c) => c.name === "array_col")?.typeSignature?.rawType).toBe("array");
      expect(columns?.find((c) => c.name === "map_col")?.typeSignature?.rawType).toBe("map");
    });

    test("should verify special cased types (HyperLogLog)", async () => {
      let columns: QuerySuccessResult["columns"];

      for await (const result of client.executeQuery(`
        SELECT approx_set(nationkey) as hyperloglog_col
        FROM nation LIMIT 1
      `)) {
        const queryResult = unwrap(result);
        if (queryResult.columns) {
          columns = queryResult.columns;
        }
      }

      const hyperloglogCol = columns?.find((c) => c.name === "hyperloglog_col");
      expect(hyperloglogCol?.typeSignature?.rawType).toBe("HyperLogLog");
      expect(hyperloglogCol?.type).toBe("HyperLogLog");
    });
  });

  describe("Error Handling", () => {
    test("should handle UserError for invalid queries", async () => {
      let hasError = false;

      for await (const result of client.executeQuery("SELECT * FROM nonexistent_table")) {
        if (!result.ok && result.error._tag === "UserError") {
          hasError = true;
          expect(result.error.message).toBeDefined();
          expect(result.error.errorCode).toBeGreaterThan(0);
          expect(result.error.errorName).toBeDefined();
          expect(result.error.errorLocation).toBeDefined();
        }
      }

      expect(hasError).toBe(true);
    });

    test("should handle FetchError for network failures", async () => {
      const badClient = new Trino({
        baseUrl: "http://invalid-host-that-does-not-exist:9999",
        headers: {
          "x-trino-user": "test-user",
        },
      });

      let hasFetchError = false;

      for await (const result of badClient.executeQuery("SELECT 1")) {
        if (!result.ok) {
          hasFetchError = true;
          expect(result.error._tag).toBe("FetchError");
          if (result.error._tag === "FetchError") {
            expect(result.error.error).toBeDefined();
          }
        }
      }

      expect(hasFetchError).toBe(true);
    });
  });

  describe("Result Type Discrimination", () => {
    test("should properly discriminate Ok and Err result types", async () => {
      // Test Ok result
      for await (const result of client.executeQuery("SELECT 1")) {
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBeDefined();
          expect(result.value.id).toBeDefined();
          expect(result.value).not.toHaveProperty("error");
        }
      }
    });
  });

  describe("Query Cancellation", () => {
    test("should provide cancel URI and cancel query", async () => {
      let cancelUri: string | undefined;

      for await (const result of client.executeQuery("SELECT * FROM nation")) {
        if (result.ok && result.value.nextUri) {
          cancelUri = result.value.nextUri;
          break;
        }
      }

      expect(cancelUri).toBeDefined();
      expect(typeof cancelUri).toBe("string");

      const cancelResult = await client.cancelQuery(cancelUri!);
      expect(cancelResult.ok).toBe(true);
    });

    test("should cancel query after fetching multiple chunks", async () => {
      const query = "SELECT * FROM lineitem ORDER BY orderkey, linenumber";
      const generator = client.executeQuery(query);

      const firstResult = await generator.next();
      if (firstResult.done || !firstResult.value.ok) {
        throw new Error("Expected first result");
      }

      const cancelUri = firstResult.value.value.nextUri;
      expect(cancelUri).toBeDefined();

      const secondResult = await generator.next();
      if (secondResult.done) {
        throw new Error("Expected second result");
      }

      // Cancel using the first cancel URI
      const cancelResult = await client.cancelQuery(cancelUri!);
      expect(cancelResult.ok).toBe(true);

      // Continue iterating - should get error
      let resultsAfterCancel = 0;
      let gotCancelError = false;
      while (resultsAfterCancel < 10) {
        const next = await generator.next();
        if (next.done) break;

        resultsAfterCancel++;
        if (!next.value.ok) {
          expect(next.value.error._tag).toBe("UserError");
          if (next.value.error._tag === "UserError") {
            expect(next.value.error.errorName).toBe("USER_CANCELED");
          }
          gotCancelError = true;
          break;
        }
      }

      expect(gotCancelError).toBe(true);
    });

    test("should handle invalid cancel URI", async () => {
      const invalidUri = `${TRINO_BASE_URL}/v1/statement/invalid-query-id/invalid-token`;
      const cancelResult = await client.cancelQuery(invalidUri);

      expect(cancelResult.ok).toBe(false);
      if (!cancelResult.ok) {
        expect(cancelResult.error._tag).toBe("HttpError");
      }
    });
  });

  describe("Prepared Statements", () => {
    test("should allocate, describe, and deallocate a prepared statement", async () => {
      // Allocate a prepared statement
      for await (const result of client.executeQuery(
        "PREPARE my_statement FROM SELECT * FROM nation WHERE nationkey = ?",
      )) {
        unwrap(result); // Just verify it didn't error
      }

      // Describe the prepared statement
      let columns: QuerySuccessResult["columns"];
      for await (const result of client.executeQuery("DESCRIBE OUTPUT my_statement")) {
        const queryResult = unwrap(result);
        if (queryResult.columns) {
          columns = queryResult.columns;
        }
      }

      expect(columns).toBeDefined();
      expect(columns?.length).toBeGreaterThan(0);
      expect(columns?.find((c) => c.name === "Column Name")).toBeDefined();
      expect(columns?.find((c) => c.name === "Type")).toBeDefined();

      // Deallocate the prepared statement
      for await (const result of client.executeQuery("DEALLOCATE PREPARE my_statement")) {
        unwrap(result); // Just verify it didn't error
      }
    });
  });
});
