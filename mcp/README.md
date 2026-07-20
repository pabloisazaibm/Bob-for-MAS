# maximo-mcp-server — Extended Build

This is a modified version of the `maximo-mcp-server` npm package with full read **and write** capability added.

## Changes vs. upstream

Three tools were added on top of the original 6 read-only tools:

| Tool | Method | Purpose |
|---|---|---|
| `create_record` | POST | Create any record in any Maximo Object Structure (assets, work orders, PMs, job plans, inventory, locations, …) |
| `update_record` | POST + `x-method-override: PATCH` | Update an existing record by OSLC where clause — MERGE semantics, only supplied fields change |
| `run_action` | POST + `x-method-override: PATCH` | Invoke Maximo business actions: `wsmethod:changeStatus`, `wsmethod:generateWO`, `wsmethod:approve`, etc. |

## All 9 tools

| Tool | HTTP | Description |
|---|---|---|
| `list_object_structures` | — | Discover available Object Structures from the OpenAPI schema |
| `get_schema_details` | GET | Get full field definitions for any Object Structure |
| `query_maximo` | GET | OSLC query — any OS, where/select/orderBy/pageSize |
| `render_carbon_table` | GET | Same as query_maximo, returns Carbon Design System HTML table |
| `render_carbon_details` | GET | Carbon detail view for a single record |
| `get_instance_details` | GET | Instance URL, latest WO date, timestamp |
| `create_record` | POST | Create a new record in any Object Structure |
| `update_record` | PATCH | Update fields on an existing record |
| `run_action` | POST | Fire a Maximo business action on a record |

## Usage

### Option A — Run directly (recommended, picks up this modified file)

Point your `~/.bob/settings/mcp.json` entry at this file:

```json
"maximo-mcp": {
  "command": "node",
  "args": ["/path/to/Bob-for-MAS/mcp/maximo-mcp-server.js"],
  "env": {
    "MAXIMO_URL": "https://<your-manage-host>/maximo",
    "MAXIMO_API_KEY": "<your-api-key>"
  },
  "alwaysAllow": [
    "list_object_structures", "get_schema_details",
    "query_maximo", "render_carbon_table",
    "render_carbon_details", "get_instance_details",
    "create_record", "update_record", "run_action"
  ]
}
```

### Option B — Run via npx (upstream package, read-only tools only)

```json
"maximo-mcp": {
  "command": "npx",
  "args": ["-y", "maximo-mcp-server"],
  "env": { ... }
}
```

> **Note:** `npx` will pull the upstream published package which does not include `create_record`, `update_record`, or `run_action`. Use Option A to get write capability.

## Requirements

- Node.js 18+
- `@modelcontextprotocol/sdk` (installed via the package's own `node_modules` — no separate install needed when using Option A)
- A MAS Manage instance with API key access

## Maximo gotchas handled

- `MAXIMO_URL` env var (not `MAXIMO_BASE_URL`) — wrong name silently leaves `instanceUrl` empty
- `_siteid` + `_insertsite` query params on POST — required when user has `querywithsite=true` without a Default Insert Site set
- 201 Created returns empty body — Location header is surfaced instead
- PATCH verb rejected by Maximo servlet (501) — `update_record` uses `POST` + `x-method-override: PATCH`
- `wsmethod:changeStatus` requires clean record href — `run_action` strips query params before appending `?action=`
