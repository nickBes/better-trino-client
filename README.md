# better-trino

A modern TypeScript monorepo for Trino (PrestoSQL) tools and applications.

## Packages

### [@better-trino/client](./packages/better-trino-client)

A type-safe TypeScript client for Trino with comprehensive error handling and full protocol support.

**Features:**
- 🔒 Type-safe with discriminated union error types
- 🔄 Streaming results via AsyncGenerator
- ❌ Query cancellation support
- 📊 All 200+ Trino error codes with proper types
- 🚀 Zero runtime dependencies
- ✅ 32 integration tests

**Quick Example:**
```typescript
import { Trino } from "@better-trino/client";

const client = new Trino({
  baseUrl: "http://localhost:8080",
  headers: {
    "X-Trino-User": "user",
    "X-Trino-Catalog": "tpch",
    "X-Trino-Schema": "tiny",
  },
});

for await (const result of client.executeQuery("SELECT * FROM nation")) {
  if (result.ok) {
    console.log(result.value.data);
  } else {
    console.error(result.error);
  }
}
```

### [@better-trino/mcp](./apps/mcp)

Model Context Protocol server for Trino (coming soon).

## Tech Stack

- **TypeScript** - Type safety and improved DX
- **Bun** - Fast runtime and package manager
- **Turborepo** - Optimized monorepo build system
- **Oxlint** - Fast linting and formatting

## Getting Started

Install dependencies:

```bash
bun install
```

Run tests:

```bash
bun run test
```

Build all packages:

```bash
bun run build
```

## Development

### Running Trino Locally

The client tests require a running Trino instance:

```bash
docker-compose up
```

This starts Trino on `http://localhost:8080` with the TPCH connector.

### Available Scripts

- `bun run dev` - Start all applications in development mode
- `bun run build` - Build all packages
- `bun run test` - Run all tests
- `bun run check-types` - Check TypeScript types
- `bun run check` - Run linting and formatting

## Project Structure

```
better-trino/
├── apps/
│   └── mcp/                    # MCP server application
├── packages/
│   ├── better-trino-client/    # Trino TypeScript client
│   ├── config/                 # Shared TypeScript configs
│   └── env/                    # Environment utilities
└── docker-compose.yml          # Local Trino instance
```

## Contributing

Contributions are welcome! Please ensure:
1. All tests pass (`bun run test`)
2. Types check (`bun run check-types`)
3. Code is formatted (`bun run check`)

## License

MIT
