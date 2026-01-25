# @better-trino/client

A modern, type-safe TypeScript client for Trino (formerly PrestoSQL) with comprehensive error handling and full protocol support.

## Features

- 🔒 **Type-Safe** - Full TypeScript support with discriminated union types
- 🎯 **Comprehensive Error Handling** - Separate error types for network, HTTP, and query errors
- 🔄 **Streaming Results** - AsyncGenerator-based API for efficient memory usage
- ❌ **Query Cancellation** - First-class support for canceling running queries
- 📊 **Complete Protocol Support** - All 200+ Trino error codes with proper types
- � **Authentication** - Built-in support for basic and bearer token authentication
- 📝 **Standard Types** - Type-safe constants for all Trino column types
- �🚀 **Zero Dependencies** - Lightweight with no external runtime dependencies
- ✅ **Well Tested** - 13 integration tests covering all functionality

## Installation

```bash
bun add @better-trino/client
```

## Quick Start

```typescript
import { Trino } from "@better-trino/client";

const client = new Trino({
  baseUrl: "http://localhost:8080",
  headers: {
    "X-Trino-User": "your-user",
    "X-Trino-Catalog": "tpch",
    "X-Trino-Schema": "tiny",
  },
});

// Execute a query
for await (const result of client.executeQuery("SELECT * FROM nation")) {
  if (result.ok) {
    console.log("Data:", result.value.data);
    console.log("State:", result.value.stats.state);
  } else {
    console.error("Error:", result.error);
  }
}
```

### With Authentication

```typescript
// Basic authentication
const clientBasic = new Trino({
  baseUrl: "http://localhost:8080",
  auth: {
    type: "basic",
    username: "admin",
    password: "secret",
  },
  headers: {
    "X-Trino-User": "admin",
    "X-Trino-Catalog": "tpch",
    "X-Trino-Schema": "tiny",
  },
});

// Bearer token authentication
const clientBearer = new Trino({
  baseUrl: "https://trino.example.com",
  auth: {
    type: "bearer",
    token: "your-jwt-token",
  },
  headers: {
    "X-Trino-User": "your-user",
  },
});
```

## API

### `new Trino(config)`

Creates a new Trino client instance.

**Config Options:**
- `baseUrl: string` - Trino server URL
- `auth?: AuthConfig` - Optional authentication configuration
  - Basic auth: `{ type: "basic", username: string, password: string }`
  - Bearer token: `{ type: "bearer", token: string }`
- `headers?: ClientRequestHeaders` - Request headers (user, catalog, schema, etc.)

**Example:**

```typescript
// Without authentication
const client = new Trino({
  baseUrl: "http://localhost:8080",
  headers: {
    "X-Trino-User": "myuser",
  },
});

// With basic authentication
const clientAuth = new Trino({
  baseUrl: "http://localhost:8080",
  auth: {
    type: "basic",
    username: "admin",
    password: "secret",
  },
  headers: {
    "X-Trino-User": "admin",
  },
});
```

### `executeQuery(sql: string): AsyncGenerator<QueryResult>`

Executes a query and returns an async generator yielding results.

**Returns:** `AsyncGenerator<Result<QuerySuccessResult, QueryError>>`

Each result is either:
- **Success**: `{ ok: true, value: QuerySuccessResult }` - Contains data, columns, stats, etc.
- **Error**: `{ ok: false, error: QueryError }` - Discriminated union of error types

### `cancelQuery(nextUri: string): Promise<Result<void, FetchError | HttpError>>`

Cancels a running query using its `nextUri`.

**Returns:** `Promise<Result<void, FetchError | HttpError>>`

## Error Types

The client provides type-safe error handling with discriminated unions:

### Network & HTTP Errors

```typescript
type FetchError = {
  _tag: "FetchError";
  error: unknown;
};

type HttpError = {
  _tag: "HttpError";
  response: Response;
};
```

### Query Errors (from Trino)

All query errors include full Trino protocol information:

```typescript
type UserError = {
  _tag: "UserError";
  errorType: "USER_ERROR";
  errorName: UserErrorName; // 139 specific error names
  errorCode: number;
  message: string;
  errorLocation?: ErrorLocation;
  failureInfo?: FailureInfo;
};

type InternalError = {
  _tag: "InternalError";
  errorType: "INTERNAL_ERROR";
  errorName: InternalErrorName; // 31 specific error names
  errorCode: number;
  message: string;
  // ... additional fields
};

// Also: ExternalError, InsufficientResourcesError
```

### Error Handling Patterns

```typescript
for await (const result of client.executeQuery(sql)) {
  if (!result.ok) {
    switch (result.error._tag) {
      case "FetchError":
        // Handle network errors
        console.error("Network error:", result.error.error);
        break;
      
      case "HttpError":
        // Handle HTTP errors
        console.error("HTTP error:", result.error.response.status);
        break;
      
      case "UserError":
        // Handle user errors (syntax, table not found, etc.)
        console.error("Query error:", result.error.errorName);
        break;
      
      case "InternalError":
        // Handle internal Trino errors
        console.error("Internal error:", result.error.message);
        break;
      
      case "ExternalError":
        // Handle external system errors
        console.error("External error:", result.error.message);
        break;
      
      case "InsufficientResourcesError":
        // Handle resource exhaustion
        console.error("Resources:", result.error.message);
        break;
    }
  }
}
```

## Column Types

The client exports all standard Trino column types as constants for type-safe column type checking:

```typescript
import { 
  ClientStandardTypes, 
  type ClientStandardType,
  isStandardType,
  getBaseType,
} from "@better-trino/client";

// Use the constants
console.log(ClientStandardTypes.BIGINT); // "bigint"
console.log(ClientStandardTypes.VARCHAR); // "varchar"
console.log(ClientStandardTypes.TIMESTAMP_WITH_TIME_ZONE); // "timestamp with time zone"

// Type-safe checking with simple types
for await (const result of client.executeQuery("SELECT * FROM table")) {
  if (result.ok && result.value.columns) {
    for (const column of result.value.columns) {
      if (column.type === ClientStandardTypes.BIGINT) {
        console.log(`${column.name} is a bigint column`);
      }
    }
  }
}

// Check if a type is a standard base type
isStandardType("bigint"); // true
isStandardType("array(bigint)"); // false - this is a complex type

// Extract base type from complex types
getBaseType("array(bigint)"); // "array"
getBaseType("map(varchar, integer)"); // "map"
getBaseType("bigint"); // "bigint"

// Working with complex types
for await (const result of client.executeQuery(`
  SELECT 
    ARRAY[1, 2, 3] as numbers,
    MAP(ARRAY['a', 'b'], ARRAY[1, 2]) as mapping
`)) {
  if (result.ok && result.value.columns) {
    for (const column of result.value.columns) {
      const baseType = getBaseType(column.type);
      
      if (baseType === ClientStandardTypes.ARRAY) {
        console.log(`${column.name} is an array: ${column.type}`);
        // e.g., "numbers is an array: array(integer)"
      } else if (baseType === ClientStandardTypes.MAP) {
        console.log(`${column.name} is a map: ${column.type}`);
        // e.g., "mapping is a map: map(varchar, integer)"
      }
      
      // Access detailed type signature for complex types
      if (column.typeSignature) {
        console.log("Raw type:", column.typeSignature.rawType);
        console.log("Arguments:", column.typeSignature.arguments);
      }
    }
  }
}

// Use the type for function parameters
function handleColumn(name: string, type: ClientStandardType) {
  // type is narrowed to all valid Trino base types
  console.log(`Column ${name} has type ${type}`);
}
```

**Available Types:**
- Numeric: `BIGINT`, `INTEGER`, `SMALLINT`, `TINYINT`, `DECIMAL`, `REAL`, `DOUBLE`
- Boolean: `BOOLEAN`
- String: `VARCHAR`, `CHAR`, `VARBINARY`
- Date/Time: `DATE`, `TIME`, `TIME_WITH_TIME_ZONE`, `TIMESTAMP`, `TIMESTAMP_WITH_TIME_ZONE`
- Interval: `INTERVAL_DAY_TO_SECOND`, `INTERVAL_YEAR_TO_MONTH`
- Complex: `ARRAY`, `MAP`, `ROW`, `JSON`, `JSON_2016`
- Special: `UUID`, `IPADDRESS`, `COLOR`, `GEOMETRY`, `SPHERICAL_GEOGRAPHY`
- Sketch: `HYPER_LOG_LOG`, `P4_HYPER_LOG_LOG`, `QDIGEST`, `TDIGEST`, `SET_DIGEST`
- Geospatial: `BING_TILE`, `KDB_TREE`

**Note:** For complex types like `array(bigint)` or `map(varchar, integer)`, the `Column.type` field contains the full type specification as a string. Use `getBaseType()` to extract the base type, or check `Column.typeSignature` for detailed type information.

## Examples

### Collecting All Results

```typescript
const allData: unknown[][] = [];

for await (const result of client.executeQuery("SELECT * FROM nation")) {
  if (result.ok) {
    if (result.value.data) {
      allData.push(...result.value.data);
    }
  } else {
    console.error("Query failed:", result.error);
    break;
  }
}

console.log(`Collected ${allData.length} rows`);
```

### Converting Rows to Objects

```typescript
interface Nation {
  nationkey: number;
  name: string;
  regionkey: number;
  comment: string;
}

const nations: Nation[] = [];
let columns: string[] | undefined;

for await (const result of client.executeQuery("SELECT * FROM nation")) {
  if (result.ok) {
    // Get column names from first result
    if (!columns && result.value.columns) {
      columns = result.value.columns.map(c => c.name);
    }
    
    if (result.value.data && columns) {
      for (const row of result.value.data) {
        const nation = columns.reduce((obj, col, idx) => {
          obj[col as keyof Nation] = row[idx] as any;
          return obj;
        }, {} as Nation);
        
        nations.push(nation);
      }
    }
  }
}

console.log(nations);
// [{ nationkey: 0, name: "ALGERIA", regionkey: 0, comment: "..." }, ...]
```

### Query Cancellation

```typescript
for await (const result of client.executeQuery("SELECT * FROM large_table")) {
  if (result.ok && result.value.nextUri) {
    // Cancel the query after first result
    const cancelResult = await client.cancelQuery(result.value.nextUri);
    
    if (cancelResult.ok) {
      console.log("Query cancelled successfully");
    }
    return;
  }
}
```

### Monitoring Query Progress

```typescript
for await (const result of client.executeQuery(sql)) {
  if (result.ok) {
    const { stats } = result.value;
    console.log(`State: ${stats.state}`);
    console.log(`Progress: ${stats.progressPercentage}%`);
    console.log(`Rows: ${stats.processedRows}`);
  }
}
```

### Using Async Iterator Helpers (Future)

```typescript
// NOTE: This syntax is not yet available in JavaScript. This demonstrates what 
// the code could look like once the TC39 Async Iterator Helpers proposal 
// (https://github.com/tc39/proposal-async-iterator-helpers) reaches Stage 4.
// The proposal adds methods like .map(), .filter(), .take(), etc. to async iterators.

const results = client.executeQuery("SELECT * FROM nation")
  .map(result => result.ok ? result.value : null)
  .filter(value => value !== null)
  .map(value => value.data)
  .flatMap(data => AsyncIterator.from(data || []))
  .take(10);

for await (const row of results) {
  console.log(row);
}

// Or with more complex transformations:
const processedData = client.executeQuery("SELECT id, name, value FROM metrics")
  .filter(result => result.ok)
  .map(result => result.value.data)
  .filter(data => data !== undefined)
  .flatMap(data => AsyncIterator.from(data))
  .map(row => ({ id: row[0], name: row[1], value: row[2] }))
  .filter(item => item.value > 100)
  .take(50);

const items = await processedData.toArray();
console.log(`Processed ${items.length} items:`, items);
```

## Type System

### QueryResult

```typescript
type QueryResult = 
  | { ok: true; value: QuerySuccessResult }
  | { ok: false; error: QueryError };
```
  | { ok: false; error: QueryError };
```

### QuerySuccessResult

Contains all successful query response data:
- `id: string` - Query ID
- `infoUri: string` - Query info URL
- `nextUri?: string` - Next chunk URL
- `data?: unknown[][]` - Result rows
- `columns?: Column[]` - Column definitions
- `stats: QueryStats` - Execution statistics
- `warnings: Warning[]` - Query warnings
- And more...

### QueryError

Discriminated union of all possible errors:

```typescript
type QueryError = 
  | FetchError 
  | HttpError 
  | TrinoUserError 
  | TrinoInternalError 
  | TrinoExternalError 
  | TrinoInsufficientResourcesError;
```

## Trino Protocol

The client implements the full Trino REST protocol including:
- Statement submission and polling
- Result pagination via `nextUri`
- Query cancellation
- Session management
- All error codes from `StandardErrorCode.java`

### Supported Error Names

The client includes TypeScript types for all 200+ Trino error codes:

**User Errors (139)**: `SYNTAX_ERROR`, `TABLE_NOT_FOUND`, `COLUMN_NOT_FOUND`, `USER_CANCELED`, etc.

**Internal Errors (31)**: `INTERNAL_ERROR`, `TOO_MANY_REQUESTS_FAILED`, `PAGE_TOO_LARGE`, etc.

**External Errors**: `EXTERNAL`, connection/authentication errors

**Resource Errors (12)**: `CLUSTER_OUT_OF_MEMORY`, `EXCEEDED_TIME_LIMIT`, etc.

## Testing

```bash
# Run tests (requires Trino running)
bun test

# Watch mode
bun test:watch
```

The test suite includes 32 integration tests covering:
- Basic queries and data collection
- TPCH schema queries
- Error handling
- Query cancellation
- Concurrent queries
- Session management
- And more...

## Development

```bash
# Build
bun run build

# Test
bun run test

# Type check
bun run check-types
```

## License

MIT

## Contributing

Contributions welcome! Please ensure all tests pass before submitting PRs.
