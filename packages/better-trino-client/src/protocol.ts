/**
 * Trino Client Protocol Types
 * Based on: https://trino.io/docs/current/develop/client-protocol.html
 * Source: https://github.com/trinodb/trino/tree/master/client/trino-client
 *
 * These types are derived from the Trino protocol specification and should
 * match the JSON structures returned by the Trino REST API.
 */

/**
 * Standard column types in Trino
 * These correspond to the types that can appear in Column.type field
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/ClientStandardTypes.java
 */
export const ClientStandardTypes = {
  BIGINT: "bigint",
  INTEGER: "integer",
  SMALLINT: "smallint",
  TINYINT: "tinyint",
  BOOLEAN: "boolean",
  DATE: "date",
  DECIMAL: "decimal",
  REAL: "real",
  DOUBLE: "double",
  HYPER_LOG_LOG: "HyperLogLog",
  QDIGEST: "qdigest",
  TDIGEST: "tdigest",
  SET_DIGEST: "SetDigest",
  P4_HYPER_LOG_LOG: "P4HyperLogLog",
  INTERVAL_DAY_TO_SECOND: "interval day to second",
  INTERVAL_YEAR_TO_MONTH: "interval year to month",
  TIMESTAMP: "timestamp",
  TIMESTAMP_WITH_TIME_ZONE: "timestamp with time zone",
  TIME: "time",
  TIME_WITH_TIME_ZONE: "time with time zone",
  VARBINARY: "varbinary",
  VARCHAR: "varchar",
  CHAR: "char",
  ROW: "row",
  ARRAY: "array",
  MAP: "map",
  JSON: "json",
  JSON_2016: "json2016",
  IPADDRESS: "ipaddress",
  UUID: "uuid",
  GEOMETRY: "Geometry",
  SPHERICAL_GEOGRAPHY: "SphericalGeography",
  BING_TILE: "BingTile",
  KDB_TREE: "KdbTree",
  COLOR: "color",
} as const;

/**
 * Union type of all standard Trino column type strings
 */
export type ClientStandardType = (typeof ClientStandardTypes)[keyof typeof ClientStandardTypes];

/**
 * Trino client request headers
 * Used when making requests to the Trino REST API
 * Note: Header names are lowercase to match HTTP conventions
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/ClientSession.java
 */
export interface ClientRequestHeaders {
  /** Specifies the session user */
  "x-trino-user"?: string;
  /** Specifies the session's original user */
  "x-trino-original-user"?: string;
  /** Specifies the roles of the original user */
  "x-trino-original-roles"?: string;
  /** For reporting purposes, supplies the name of the software that submitted the query */
  "x-trino-source"?: string;
  /** The catalog context for query processing */
  "x-trino-catalog"?: string;
  /** The schema context for query processing */
  "x-trino-schema"?: string;
  /** The path context for query processing */
  "x-trino-path"?: string;
  /** The timezone for query processing */
  "x-trino-time-zone"?: string;
  /** The language for query processing and formatting results (e.g., "en-US") */
  "x-trino-language"?: string;
  /** Trace token to help identify log lines */
  "x-trino-trace-token"?: string;
  /** Comma-separated list of name=value pairs as session properties */
  "x-trino-session"?: string;
  /** Sets the role for query processing */
  "x-trino-role"?: string;
  /** Comma-separated list of prepared statement name=key pairs */
  "x-trino-prepared-statement"?: string;
  /** The transaction ID to use for query processing */
  "x-trino-transaction-id"?: string;
  /** Arbitrary information about the client program */
  "x-trino-client-info"?: string;
  /** Comma-separated list of tag strings for resource groups */
  "x-trino-client-tags"?: string;
  /** Client capabilities */
  "x-trino-client-capabilities"?: string;
  /** Comma-separated list of resource=value assignments (EXECUTION_TIME, CPU_TIME, PEAK_MEMORY, PEAK_TASK_MEMORY) */
  "x-trino-resource-estimate"?: string;
  /** Extra credentials for the connector (name=value) */
  "x-trino-extra-credential"?: string;
  /** Query data encoding format */
  "x-trino-query-data-encoding"?: string;
}

/**
 * Trino server response headers
 * Returned by the Trino REST API and should be used to update subsequent request headers
 * Note: Header names are lowercase to match the fetch Headers API which normalizes names
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/ClientSession.java
 */
export interface ClientResponseHeaders {
  /** Instructs client to set the catalog in subsequent requests */
  "x-trino-set-catalog"?: string;
  /** Instructs client to set the schema in subsequent requests */
  "x-trino-set-schema"?: string;
  /** Instructs client to set the path in subsequent requests */
  "x-trino-set-path"?: string;
  /** Instructs client to add a session property (format: property=value) */
  "x-trino-set-session"?: string;
  /** Instructs client to remove a session property */
  "x-trino-clear-session"?: string;
  /** Instructs client to set the role in subsequent requests */
  "x-trino-set-role"?: string;
  /** Instructs client to set the roles of the original user */
  "x-trino-set-original-roles"?: string;
  /** Query data encoding format used in response */
  "x-trino-query-data-encoding"?: string;
  /** Instructs client to add a prepared statement (format: name=key) */
  "x-trino-added-prepare"?: string;
  /** Instructs client to remove a prepared statement */
  "x-trino-deallocated-prepare"?: string;
  /** Provides the transaction ID to use in subsequent requests */
  "x-trino-started-transaction-id"?: string;
  /** Instructs client to clear the transaction ID */
  "x-trino-clear-transaction-id"?: string;
  /** Instructs client to set the authorization user */
  "x-trino-set-authorization-user"?: string;
  /** Instructs client to reset the authorization user to the original user */
  "x-trino-reset-authorization-user"?: string;
}

/**
 * Location in the query where an error occurred
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/ErrorLocation.java
 */
export interface ErrorLocation {
  lineNumber: number;
  columnNumber: number;
}

/**
 * Type signature parameter kind
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/ClientTypeSignatureParameter.java
 */
export enum ParameterKind {
  TYPE = "TYPE",
  LONG = "LONG",
  VARIABLE = "VARIABLE",
}

/**
 * Client type signature parameter (discriminated union based on kind)
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/ClientTypeSignatureParameter.java
 */
export type ClientTypeSignatureParameter =
  | {
      kind: ParameterKind.TYPE;
      typeSignature: ClientTypeSignature;
    }
  | {
      kind: ParameterKind.LONG;
      longLiteral: number;
    }
  | {
      kind: ParameterKind.VARIABLE;
      namedTypeSignature: NamedTypeSignature;
    };

/**
 * Named type signature (used for ROW types)
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/NamedClientTypeSignature.java
 */
export interface NamedTypeSignature {
  name?: string;
  typeSignature: ClientTypeSignature;
}

/**
 * Type signature for complex types
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/ClientTypeSignature.java
 */
export interface ClientTypeSignature {
  /**
   * The base type name. For simple types, this matches one of the ClientStandardTypes values.
   * For complex types, this is the container type (e.g., "array", "map", "row").
   * Note: Some special types may use different casing (e.g., "Geometry", "SphericalGeography").
   */
  rawType: ClientStandardType;
  /** Type parameters for the type (e.g., element type for arrays, key/value types for maps) */
  arguments: ClientTypeSignatureParameter[];
}

/**
 * Column definition in query results
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/Column.java
 */
export interface Column {
  /** Column name */
  name: string;
  /**
   * Type string representation.
   * For simple types, this will be one of ClientStandardTypes (e.g., "bigint", "varchar").
   * For complex types, this includes the full type specification (e.g., "array(bigint)", "map(varchar, integer)").
   */
  type: string;
  /** Detailed type signature for complex types */
  typeSignature?: ClientTypeSignature;
}

/**
 * Error information (used in FailureInfo)
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/FailureInfo.java
 */
export interface ErrorInfo {
  // Structure not fully defined in Trino source, placeholder for extensibility
  [key: string]: unknown;
}

/**
 * Detailed failure information including stack trace
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/FailureInfo.java
 */
export interface FailureInfo {
  type: string;
  message?: string;
  cause?: FailureInfo;
  suppressed: FailureInfo[];
  stack: string[];
  errorInfo?: ErrorInfo;
  errorLocation?: ErrorLocation;
}

/**
 * User error names - errors caused by invalid SQL or incorrect usage
 *
 * @see https://github.com/trinodb/trino/blob/master/core/trino-spi/src/main/java/io/trino/spi/StandardErrorCode.java
 */
export type UserErrorName =
  | "GENERIC_USER_ERROR"
  | "SYNTAX_ERROR"
  | "ABANDONED_QUERY"
  | "USER_CANCELED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "FUNCTION_NOT_FOUND"
  | "INVALID_FUNCTION_ARGUMENT"
  | "DIVISION_BY_ZERO"
  | "INVALID_CAST_ARGUMENT"
  | "OPERATOR_NOT_FOUND"
  | "INVALID_VIEW"
  | "ALREADY_EXISTS"
  | "NOT_SUPPORTED"
  | "INVALID_SESSION_PROPERTY"
  | "INVALID_WINDOW_FRAME"
  | "CONSTRAINT_VIOLATION"
  | "TRANSACTION_CONFLICT"
  | "INVALID_TABLE_PROPERTY"
  | "NUMERIC_VALUE_OUT_OF_RANGE"
  | "UNKNOWN_TRANSACTION"
  | "NOT_IN_TRANSACTION"
  | "TRANSACTION_ALREADY_ABORTED"
  | "READ_ONLY_VIOLATION"
  | "MULTI_CATALOG_WRITE_CONFLICT"
  | "AUTOCOMMIT_WRITE_CONFLICT"
  | "UNSUPPORTED_ISOLATION_LEVEL"
  | "INCOMPATIBLE_CLIENT"
  | "SUBQUERY_MULTIPLE_ROWS"
  | "PROCEDURE_NOT_FOUND"
  | "INVALID_PROCEDURE_ARGUMENT"
  | "QUERY_REJECTED"
  | "AMBIGUOUS_FUNCTION_CALL"
  | "INVALID_SCHEMA_PROPERTY"
  | "SCHEMA_NOT_EMPTY"
  | "QUERY_TEXT_TOO_LARGE"
  | "UNSUPPORTED_SUBQUERY"
  | "EXCEEDED_FUNCTION_MEMORY_LIMIT"
  | "ADMINISTRATIVELY_KILLED"
  | "INVALID_COLUMN_PROPERTY"
  | "QUERY_HAS_TOO_MANY_STAGES"
  | "INVALID_SPATIAL_PARTITIONING"
  | "INVALID_ANALYZE_PROPERTY"
  | "TYPE_NOT_FOUND"
  | "CATALOG_NOT_FOUND"
  | "SCHEMA_NOT_FOUND"
  | "TABLE_NOT_FOUND"
  | "COLUMN_NOT_FOUND"
  | "ROLE_NOT_FOUND"
  | "SCHEMA_ALREADY_EXISTS"
  | "TABLE_ALREADY_EXISTS"
  | "COLUMN_ALREADY_EXISTS"
  | "ROLE_ALREADY_EXISTS"
  | "DUPLICATE_NAMED_QUERY"
  | "DUPLICATE_COLUMN_NAME"
  | "MISSING_COLUMN_NAME"
  | "MISSING_CATALOG_NAME"
  | "MISSING_SCHEMA_NAME"
  | "TYPE_MISMATCH"
  | "INVALID_LITERAL"
  | "COLUMN_TYPE_UNKNOWN"
  | "MISMATCHED_COLUMN_ALIASES"
  | "AMBIGUOUS_NAME"
  | "INVALID_COLUMN_REFERENCE"
  | "MISSING_GROUP_BY"
  | "MISSING_ORDER_BY"
  | "MISSING_OVER"
  | "NESTED_AGGREGATION"
  | "NESTED_WINDOW"
  | "EXPRESSION_NOT_IN_DISTINCT"
  | "TOO_MANY_GROUPING_SETS"
  | "FUNCTION_NOT_WINDOW"
  | "FUNCTION_NOT_AGGREGATE"
  | "EXPRESSION_NOT_AGGREGATE"
  | "EXPRESSION_NOT_SCALAR"
  | "EXPRESSION_NOT_CONSTANT"
  | "INVALID_ARGUMENTS"
  | "TOO_MANY_ARGUMENTS"
  | "INVALID_PRIVILEGE"
  | "DUPLICATE_PROPERTY"
  | "INVALID_PARAMETER_USAGE"
  | "VIEW_IS_STALE"
  | "VIEW_IS_RECURSIVE"
  | "NULL_TREATMENT_NOT_ALLOWED"
  | "INVALID_ROW_FILTER"
  | "INVALID_COLUMN_MASK"
  | "MISSING_TABLE"
  | "INVALID_RECURSIVE_REFERENCE"
  | "MISSING_COLUMN_ALIASES"
  | "NESTED_RECURSIVE"
  | "INVALID_LIMIT_CLAUSE"
  | "INVALID_ORDER_BY"
  | "DUPLICATE_WINDOW_NAME"
  | "INVALID_WINDOW_REFERENCE"
  | "INVALID_PARTITION_BY"
  | "INVALID_MATERIALIZED_VIEW_PROPERTY"
  | "INVALID_LABEL"
  | "INVALID_PROCESSING_MODE"
  | "INVALID_NAVIGATION_NESTING"
  | "INVALID_ROW_PATTERN"
  | "NESTED_ROW_PATTERN_RECOGNITION"
  | "TABLE_HAS_NO_COLUMNS"
  | "INVALID_RANGE"
  | "INVALID_PATTERN_RECOGNITION_FUNCTION"
  | "TABLE_REDIRECTION_ERROR"
  | "MISSING_VARIABLE_DEFINITIONS"
  | "MISSING_ROW_PATTERN"
  | "INVALID_WINDOW_MEASURE"
  | "STACK_OVERFLOW"
  | "MISSING_RETURN_TYPE"
  | "AMBIGUOUS_RETURN_TYPE"
  | "MISSING_ARGUMENT"
  | "DUPLICATE_PARAMETER_NAME"
  | "INVALID_PATH"
  | "JSON_INPUT_CONVERSION_ERROR"
  | "JSON_OUTPUT_CONVERSION_ERROR"
  | "PATH_EVALUATION_ERROR"
  | "INVALID_JSON_LITERAL"
  | "JSON_VALUE_RESULT_ERROR"
  | "MERGE_TARGET_ROW_MULTIPLE_MATCHES"
  | "INVALID_COPARTITIONING"
  | "INVALID_TABLE_FUNCTION_INVOCATION"
  | "DUPLICATE_RANGE_VARIABLE"
  | "INVALID_CHECK_CONSTRAINT"
  | "INVALID_CATALOG_PROPERTY"
  | "CATALOG_UNAVAILABLE"
  | "MISSING_RETURN"
  | "DUPLICATE_COLUMN_OR_PATH_NAME"
  | "MISSING_PATH_NAME"
  | "INVALID_PLAN"
  | "INVALID_VIEW_PROPERTY"
  | "INVALID_ENTITY_KIND"
  | "QUERY_EXCEEDED_COMPILER_LIMIT"
  | "INVALID_FUNCTION_PROPERTY"
  | "BRANCH_NOT_FOUND"
  | "BRANCH_ALREADY_EXISTS"
  | "INVALID_BRANCH_PROPERTY"
  | "INVALID_DEFAULT_COLUMN_VALUE"
  | "INVALID_GRACE_PERIOD";

/**
 * Internal error names - server-side errors in Trino
 *
 * @see https://github.com/trinodb/trino/blob/master/core/trino-spi/src/main/java/io/trino/spi/StandardErrorCode.java
 */
export type InternalErrorName =
  | "GENERIC_INTERNAL_ERROR"
  | "TOO_MANY_REQUESTS_FAILED"
  | "PAGE_TOO_LARGE"
  | "PAGE_TRANSPORT_ERROR"
  | "PAGE_TRANSPORT_TIMEOUT"
  | "NO_NODES_AVAILABLE"
  | "REMOTE_TASK_ERROR"
  | "COMPILER_ERROR"
  | "REMOTE_TASK_MISMATCH"
  | "SERVER_SHUTTING_DOWN"
  | "FUNCTION_IMPLEMENTATION_MISSING"
  | "REMOTE_BUFFER_CLOSE_FAILED"
  | "SERVER_STARTING_UP"
  | "FUNCTION_IMPLEMENTATION_ERROR"
  | "INVALID_PROCEDURE_DEFINITION"
  | "PROCEDURE_CALL_FAILED"
  | "AMBIGUOUS_FUNCTION_IMPLEMENTATION"
  | "ABANDONED_TASK"
  | "CORRUPT_SERIALIZED_IDENTITY"
  | "CORRUPT_PAGE"
  | "OPTIMIZER_TIMEOUT"
  | "OUT_OF_SPILL_SPACE"
  | "REMOTE_HOST_GONE"
  | "CONFIGURATION_INVALID"
  | "CONFIGURATION_UNAVAILABLE"
  | "INVALID_RESOURCE_GROUP"
  | "SERIALIZATION_ERROR"
  | "REMOTE_TASK_FAILED"
  | "EXCHANGE_MANAGER_NOT_CONFIGURED"
  | "CATALOG_NOT_AVAILABLE"
  | "CATALOG_STORE_ERROR";

/**
 * Insufficient resources error names
 */
export type InsufficientResourcesErrorName =
  | "GENERIC_INSUFFICIENT_RESOURCES"
  | "EXCEEDED_GLOBAL_MEMORY_LIMIT"
  | "QUERY_QUEUE_FULL"
  | "EXCEEDED_TIME_LIMIT"
  | "CLUSTER_OUT_OF_MEMORY"
  | "EXCEEDED_CPU_LIMIT"
  | "EXCEEDED_SPILL_LIMIT"
  | "EXCEEDED_LOCAL_MEMORY_LIMIT"
  | "ADMINISTRATIVELY_PREEMPTED"
  | "EXCEEDED_SCAN_LIMIT"
  | "EXCEEDED_TASK_DESCRIPTOR_STORAGE_CAPACITY"
  | "EXCEEDED_WRITE_LIMIT";

/**
 * External error names - errors from external systems
 *
 * @see https://github.com/trinodb/trino/blob/master/core/trino-spi/src/main/java/io/trino/spi/StandardErrorCode.java
 */
export type ExternalErrorName = "UNSUPPORTED_TABLE_TYPE" | string;

/**
 * Base error information when a query fails
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryError.java
 */
interface BaseQueryError {
  message: string;
  sqlState?: string;
  errorCode: number;
  errorLocation?: ErrorLocation;
  failureInfo?: FailureInfo;
}

/**
 * User error - typically caused by invalid SQL or incorrect usage
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryError.java
 */
export interface UserError extends BaseQueryError {
  errorType: "USER_ERROR";
  errorName: UserErrorName;
}

/**
 * Internal error - server-side error in Trino
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryError.java
 */
export interface InternalError extends BaseQueryError {
  errorType: "INTERNAL_ERROR";
  errorName: InternalErrorName;
}

/**
 * External error - error from external systems (connectors, etc.)
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryError.java
 */
export interface ExternalError extends BaseQueryError {
  errorType: "EXTERNAL";
  errorName: ExternalErrorName;
}

/**
 * Insufficient resources error
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryError.java
 */
export interface InsufficientResourcesError extends BaseQueryError {
  errorType: "INSUFFICIENT_RESOURCES";
  errorName: InsufficientResourcesErrorName;
}

/**
 * Discriminated union of all query error types
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryError.java
 */
export type QueryError = UserError | InternalError | ExternalError | InsufficientResourcesError;

/**
 * Warning code details
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/WarningCode.java
 */
export interface WarningCode {
  code: number;
  name: string;
}

/**
 * Warning information
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/Warning.java
 */
export interface Warning {
  warningCode: WarningCode;
  message: string;
}

/**
 * Statistics for a query execution stage
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/StageStats.java
 */
export interface StageStats {
  stageId: string;
  state: string;
  done: boolean;
  nodes: number;
  totalSplits: number;
  queuedSplits: number;
  runningSplits: number;
  completedSplits: number;
  cpuTimeMillis: number;
  wallTimeMillis: number;
  processedRows: number;
  processedBytes: number;
  physicalInputBytes: number;
  failedTasks: number;
  coordinatorOnly: boolean;
  subStages: StageStats[];
}

/**
 * Statistics about query execution
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/StatementStats.java
 */
export interface StatementStats {
  state: string;
  queued: boolean;
  scheduled: boolean;
  progressPercentage?: number;
  runningPercentage?: number;
  nodes: number;
  totalSplits: number;
  queuedSplits: number;
  runningSplits: number;
  completedSplits: number;
  planningTimeMillis: number;
  analysisTimeMillis: number;
  cpuTimeMillis: number;
  wallTimeMillis: number;
  queuedTimeMillis: number;
  elapsedTimeMillis: number;
  finishingTimeMillis: number;
  physicalInputTimeMillis: number;
  processedRows: number;
  processedBytes: number;
  physicalInputBytes: number;
  physicalWrittenBytes: number;
  internalNetworkInputBytes: number;
  peakMemoryBytes: number;
  spilledBytes: number;
  rootStage?: StageStats;
}

/**
 * Query data wrapper (handles null data representation)
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryResults.java
 */
export type QueryData = unknown[][] | null;

/**
 * Main query results response from Trino
 *
 * @see https://github.com/trinodb/trino/blob/master/client/trino-client/src/main/java/io/trino/client/QueryResults.java
 */
export interface QueryResults {
  /** The ID of the query */
  id: string;

  /** URL for the query info page */
  infoUri: string;

  /** URL for partial cancellation (if supported) */
  partialCancelUri?: string;

  /** URL to fetch next batch of results. If absent, query is complete */
  nextUri?: string;

  /** Column definitions for the result set */
  columns?: Column[];

  /** Result data rows. Each row is an array of column values */
  data?: QueryData;

  /** Statistics about query execution */
  stats: StatementStats;

  /** Error information if query failed */
  error?: QueryError;

  /** List of warnings */
  warnings: Warning[];

  /** Type of update operation (e.g., "CREATE TABLE", "SET SESSION") */
  updateType?: string;

  /** Number of rows updated (for DML operations) */
  updateCount?: number;
}
