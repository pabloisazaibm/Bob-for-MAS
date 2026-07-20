#!/usr/bin/env node

/**
 * Maximo MCP Server
 * 
 * Author: Markus van Kempen
 * Date: 3 Feb 2026
 * 
 * This server exposes tools to interact with an IBM Maximo instance via the Model Context Protocol.
 * Capabilities:
 * 1. Introspect Schema: Read the local OpenApi definition to understand available Object Structures.
 * 2. Query Data: Fetch data from Maximo using OSLC/REST APIs.
 */

// Load environment variables from .env file
// IMPORTANT: quiet:true prevents dotenv from outputting to stdout, which would corrupt MCP stdio
require('dotenv').config({ quiet: true });

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");
const fs = require('fs');
const path = require('path');

// --- Configuration (loaded from environment variables) ---
const RAW_MAXIMO_URL = (process.env.MAXIMO_URL || '').replace(/\/+$/, ''); // strip trailing slashes
const API_KEY = process.env.MAXIMO_API_KEY;
const OPENAPI_FILE = process.env.MAXIMO_OPENAPI_PATH || path.join(__dirname, 'maximo_openapi.json');

// Normalize MAXIMO_URL: ensure it ends with /api so queries hit /api/os/{OS}
function normalizeMaximoUrl(raw) {
    if (!raw) return '';
    // Already ends with /api
    if (raw.endsWith('/api')) return raw;
    // Ends with /oslc — replace with /api
    if (raw.endsWith('/oslc')) return raw.replace(/\/oslc$/, '/api');
    // Bare Maximo URL like https://host/maximo
    if (raw.match(/\/maximo$/i)) return raw + '/api';
    // Something else — append /api as best guess
    return raw + '/api';
}

const MAXIMO_URL = normalizeMaximoUrl(RAW_MAXIMO_URL);

// Validate required environment variables
if (!RAW_MAXIMO_URL || !API_KEY) {
    console.error("ERROR: Missing required environment variables.");
    console.error("Please set MAXIMO_URL and MAXIMO_API_KEY in your .env file or MCP config.");
    console.error("  MAXIMO_URL  — e.g. https://your-host/maximo/api  (or https://your-host/maximo)");
    console.error("  MAXIMO_API_KEY — your Maximo API key");
    console.error("See .env.example for reference.");
}

if (RAW_MAXIMO_URL && RAW_MAXIMO_URL !== MAXIMO_URL) {
    console.error(`URL normalized: ${RAW_MAXIMO_URL} → ${MAXIMO_URL}`);
}

// --- State ---
let openApiSpec = null;
let schemaLoaded = false;

// --- Load Schema (local file first, then live fetch) ---
function loadLocalSchema() {
    try {
        if (fs.existsSync(OPENAPI_FILE)) {
            console.error(`Loading OpenAPI spec from ${OPENAPI_FILE}...`);
            const raw = fs.readFileSync(OPENAPI_FILE, 'utf-8');
            openApiSpec = JSON.parse(raw);
            schemaLoaded = true;
            console.error(`Loaded OpenAPI spec. Components: ${Object.keys(openApiSpec.components?.schemas || {}).length}`);
            return true;
        }
    } catch (e) {
        console.error("Error loading local OpenAPI spec:", e.message);
    }
    return false;
}

async function fetchLiveSchema() {
    if (!MAXIMO_URL || !API_KEY) return false;
    // Maximo exposes its OpenAPI spec at /oas/api.json (relative to /api base)
    // e.g. https://host/maximo/api  →  /oas/api.json  →  https://host/maximo/oas/api.json
    // Or the OSLC variant:  https://host/maximo/oslc/oas/api
    const baseForOas = MAXIMO_URL.replace(/\/api$/, '');
    const oasUrls = [
        `${baseForOas}/oslc/oas/api`,      // primary: /oslc/oas/api
        `${MAXIMO_URL}/oas/api.json`,       // variant: /api/oas/api.json
    ];

    for (const oasUrl of oasUrls) {
        try {
            console.error(`Fetching OpenAPI spec from ${oasUrl}...`);
            const res = await fetch(oasUrl, {
                headers: {
                    'apikey': API_KEY,
                    'Accept': 'application/json'
                }
            });
            if (res.ok) {
                openApiSpec = await res.json();
                schemaLoaded = true;
                const count = Object.keys(openApiSpec.components?.schemas || {}).length;
                console.error(`Loaded live OpenAPI spec from ${oasUrl}. Schemas: ${count}`);
                return true;
            } else {
                console.error(`  → ${res.status} ${res.statusText}`);
            }
        } catch (e) {
            console.error(`  → Failed: ${e.message}`);
        }
    }
    return false;
}

// Discover Object Structures from live OSLC catalog as lightweight fallback
async function discoverObjectStructures() {
    if (!MAXIMO_URL || !API_KEY) return [];
    try {
        const url = `${MAXIMO_URL}/os?lean=1&oslc.pageSize=200`;
        console.error(`Discovering Object Structures from ${url}...`);
        const res = await fetch(url, {
            headers: { 'apikey': API_KEY, 'Accept': 'application/json' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        const members = data.member || [];
        return members.map(m => {
            const name = m['oslc:name'] || m['spi:objectstructure'] || '';
            const href = m['rdf:about'] || m['href'] || '';
            const extracted = name || href.split('/').pop() || '';
            return {
                name: extracted.toUpperCase(),
                title: m['dcterms:title'] || extracted,
                description: m['dcterms:description'] || ''
            };
        }).filter(m => m.name);
    } catch (e) {
        console.error('Object Structure discovery failed:', e.message);
        return [];
    }
}

// Well-known Object Structures as ultimate fallback
const WELL_KNOWN_OS = [
    { name: 'MXWO', title: 'Work Orders', description: 'Work Order management' },
    { name: 'MXSR', title: 'Service Requests', description: 'Service Request management' },
    { name: 'MXASSET', title: 'Assets', description: 'Asset management' },
    { name: 'MXINVENTORY', title: 'Inventory', description: 'Inventory management' },
    { name: 'MXPO', title: 'Purchase Orders', description: 'Purchase Order management' },
    { name: 'MXPR', title: 'Purchase Requisitions', description: 'Purchase Requisition management' },
    { name: 'MXPERSON', title: 'Persons', description: 'Person records' },
    { name: 'MXLOCATION', title: 'Locations', description: 'Location management' },
    { name: 'MXITEM', title: 'Items', description: 'Item master' },
    { name: 'MXDOMAIN', title: 'Domains', description: 'Domain/lookup values' },
];

// Initialize schema (try local file synchronously, schedule live fetch)
loadLocalSchema();

// --- Server Setup ---
const server = new Server(
    {
        name: "maximo-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// --- Tools Implementation ---

/**
 * Tool: list_object_structures
 * Lists available object structures from the loaded OpenAPI spec.
 */
async function listObjectStructures({ filter }) {
    // Try loading schema on first use if not yet loaded
    if (!schemaLoaded) {
        await fetchLiveSchema();
    }

    let results;

    if (openApiSpec && openApiSpec.components && openApiSpec.components.schemas) {
        // Use OpenAPI spec if available
        const schemas = openApiSpec.components.schemas;
        results = Object.keys(schemas)
            .filter(key => key.startsWith('RESOURCE_'))
            .map(key => {
                const def = schemas[key];
                return {
                    name: key.replace('RESOURCE_', ''),
                    title: def.title || key,
                    description: def.description || ''
                };
            });
    } else {
        // Fallback: discover from live OSLC catalog
        results = await discoverObjectStructures();
        if (results.length === 0) {
            // Ultimate fallback: well-known list
            results = WELL_KNOWN_OS;
            console.error('Using well-known Object Structures as fallback');
        }
    }

    results = results
        .filter(item => !filter || item.name.toLowerCase().includes(filter.toLowerCase()) || (item.description || '').toLowerCase().includes(filter.toLowerCase()))
        .slice(0, 50);

    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
    };
}

/**
 * Tool: get_schema_details
 * Gets the property definition for a specific Object Structure
 */
async function getSchemaDetails({ objectStructure }) {
    // Try loading schema on first use if not yet loaded
    if (!schemaLoaded) {
        await fetchLiveSchema();
    }

    const osName = objectStructure.toUpperCase();
    const schemaName = `RESOURCE_${osName}`;
    const schema = openApiSpec?.components?.schemas?.[schemaName];

    if (schema) {
        // Simplify the schema for LLM consumption
        const simpleSchema = {
            name: objectStructure,
            description: schema.description,
            properties: Object.entries(schema.properties || {}).map(([propName, propDef]) => ({
                name: propName,
                type: propDef.type,
                title: propDef.title,
                description: propDef.description,
                maxLength: propDef.maxLength
            }))
        };
        return {
            content: [{ type: "text", text: JSON.stringify(simpleSchema, null, 2) }]
        };
    }

    // Fallback: infer schema from a live record
    console.error(`Schema RESOURCE_${osName} not found in OpenAPI spec, inferring from live data...`);
    try {
        const url = `${MAXIMO_URL}/os/${osName}?lean=1&oslc.pageSize=1`;
        const res = await fetch(url, {
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            return { content: [{ type: "text", text: `Could not load schema for ${objectStructure}. OpenAPI spec not available and live query returned ${res.status}.` }] };
        }
        const data = await res.json();
        const sample = (data.member || [])[0];
        if (!sample) {
            return { content: [{ type: "text", text: `No records found in ${objectStructure} to infer schema from.` }] };
        }
        const inferred = {
            name: objectStructure,
            description: `Schema inferred from live ${osName} record (OpenAPI spec not available)`,
            properties: Object.entries(sample)
                .filter(([k]) => !k.startsWith('_') && k !== 'href')
                .map(([propName, propVal]) => ({
                    name: propName,
                    type: typeof propVal === 'number' ? 'number' : typeof propVal === 'boolean' ? 'boolean' : Array.isArray(propVal) ? 'array' : 'string',
                    title: propName,
                    description: '',
                    sample: typeof propVal === 'object' ? undefined : propVal
                }))
        };
        return {
            content: [{ type: "text", text: JSON.stringify(inferred, null, 2) }]
        };
    } catch (e) {
        return { content: [{ type: "text", text: `Schema for ${objectStructure} not found. OpenAPI spec not loaded and live inference failed: ${e.message}` }] };
    }
}

/**
 * Tool: query_maximo
 * Executes a GET request to the Maximo OSLC API
 */
async function queryMaximo({ objectStructure, where, select, orderBy, pageSize = 10, formatted = true }) {
    const params = new URLSearchParams({
        "lean": "1",
        "oslc.pageSize": pageSize.toString()
    });

    if (where) params.append("oslc.where", where);
    if (select) params.append("oslc.select", select);
    if (orderBy) params.append("oslc.orderBy", orderBy);

    const url = `${MAXIMO_URL}/os/${objectStructure}?${params.toString()}`;

    console.error(`Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                "apikey": API_KEY,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            let hint = '';
            if (response.status === 404) {
                hint = `\n\nHint: 404 usually means the URL is wrong. Current base: ${MAXIMO_URL}\nFull request URL: ${url}\nEnsure MAXIMO_URL points to the Maximo API base (e.g. https://your-host/maximo/api).`;
            } else if (response.status === 401 || response.status === 403) {
                hint = '\n\nHint: Check that MAXIMO_API_KEY is valid and has the required permissions.';
            }
            return {
                content: [{ type: "text", text: `Error ${response.status}: ${response.statusText}${hint}` }],
                isError: true
            };
        }

        const data = await response.json();

        // Extract relevant member data
        const members = data.member || [];
        const result = {
            totalCount: data.responseInfo?.totalCount,
            nextPage: data.responseInfo?.nextPage?.href,
            count: members.length,
            records: members
        };

        if (formatted) {
            return await renderCarbonTable({
                objectStructure,
                where,
                select,
                orderBy,
                pageSize,
                title: `${objectStructure} Query Results`
            });
        }

        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };

    } catch (error) {
        return {
            content: [{ type: "text", text: `Network Error: ${error.message}` }],
            isError: true
        };
    }
}

/**
 * Tool: get_instance_details
 * Introspects the system to find key details
 */
async function getInstanceDetails() {
    // 1. Check for latest Work Order to determine "Current Data Date"
    const latestWoResult = await queryMaximo({
        objectStructure: "MXWO",
        select: "reportdate,wonum",
        orderBy: "-reportdate",
        pageSize: 1
    });

    let latestDate = "Unknown";
    try {
        const resultJson = JSON.parse(latestWoResult.content[0].text);
        if (resultJson.records && resultJson.records.length > 0) {
            latestDate = resultJson.records[0].reportdate;
        }
    } catch (e) {
        // Ignore parsing error
    }

    const details = {
        latestWorkOrderDate: latestDate,
        instanceUrl: MAXIMO_URL,
        timestamp: new Date().toISOString()
    };

    return {
        content: [{ type: "text", text: JSON.stringify(details, null, 2) }]
    };
}

/**
 * Tool: render_carbon_table
 * Generates a Carbon-styled HTML table for Maximo data
 */
async function renderCarbonTable({ objectStructure, where, select, orderBy, pageSize = 10, title = "Maximo Data" }) {
    // Avoid recursion if called from queryMaximo
    const queryResult = await (async () => {
        const params = new URLSearchParams({
            "lean": "1",
            "oslc.pageSize": pageSize.toString()
        });
        if (where) params.append("oslc.where", where);
        if (select) params.append("oslc.select", select);
        if (orderBy) params.append("oslc.orderBy", orderBy);
        const url = `${MAXIMO_URL}/os/${objectStructure}?${params.toString()}`;
        try {
            const res = await fetch(url, { headers: { "apikey": API_KEY, "Content-Type": "application/json" } });
            if (!res.ok) return { isError: true, content: [{ type: "text", text: `Error ${res.status}` }] };
            const data = await res.json();
            return { content: [{ text: JSON.stringify({ records: data.member, totalCount: data.responseInfo?.totalCount }) }] };
        } catch (e) { return { isError: true, content: [{ type: "text", text: e.message }] }; }
    })();

    if (queryResult.isError) return queryResult;

    const data = JSON.parse(queryResult.content[0].text);
    const records = data.records || [];

    if (records.length === 0) {
        return { content: [{ type: "text", text: `<div class="bx--inline-notification bx--inline-notification--info"><div class="bx--inline-notification__details">No records found for ${objectStructure}</div></div>` }] };
    }

    const columns = select ? select.split(',') : Object.keys(records[0]).filter(k => !k.startsWith('_') && k !== 'href');

    let html = `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/carbon-components/css/carbon-components.min.css">
    <style>
        body { padding: 1rem; background: #f4f4f4; }
        .container { background: white; padding: 2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .bx--search { margin-bottom: 2rem; }
        .bx--table-sort { cursor: pointer; }
    </style>
</head>
<body class="bx--body">
    <div class="container">
        <div class="bx--data-table-container">
            <div class="bx--data-table-header">
                <h4 class="bx--data-table-header__title">${title}</h4>
                <p class="bx--data-table-header__description">Object Structure: ${objectStructure} | Total: ${data.totalCount || records.length}</p>
            </div>
            
            <div class="bx--toolbar">
                <div class="bx--toolbar-content">
                    <div class="bx--search bx--search--sm" role="search" data-search>
                        <label id="search-label-1" class="bx--label" for="search-input-1">Search</label>
                        <input class="bx--search-input" type="text" id="table-search" role="searchbox" placeholder="Filter records..." aria-labelledby="search-label-1">
                        <svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bx--search-magnifier" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M15,14.3L10.7,10c1.9-2.3,1.7-5.8-0.5-7.9C9,1,7.4,0.5,5.8,0.5S2.7,1,1.5,2.1C-0.7,4.3-0.7,7.7,1.5,9.9 c1.1,1.1,2.6,1.6,4.2,1.6c1.2,0,2.5-0.4,3.5-1.1l4.3,4.3L15,14.3z M2,9.2C0.3,7.5,0.3,4.7,2.1,3C2.9,2.1,4.2,1.6,5.5,1.6 s2.5,0.5,3.4,1.4c1.7,1.7,1.7,4.5,0,6.2c-0.9,0.9-2.1,1.4-3.4,1.4S3,10.1,2,9.2z"></path></svg>
                    </div>
                </div>
            </div>

            <table class="bx--data-table bx--data-table--zebra bx--data-table--compact" id="main-table">
                <thead>
                    <tr>
                        ${columns.map((col, idx) => `
                        <th class="bx--table-sort" onclick="sortTable(${idx})">
                            <span class="bx--table-header-label">${col.trim().toUpperCase()}</span>
                            <svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bx--table-sort__icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M12.3 9.3L8.5 13.1 8.5 1 7.5 1 7.5 13.1 3.7 9.3 3 10 8 15 13 10z"></path></svg>
                        </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody id="table-body">
                    ${records.map(rec => `
                    <tr>
                        ${columns.map(col => {
        let val = rec[col.trim()] !== undefined ? rec[col.trim()] : '--';
        if (val === null) val = '--';
        if (typeof val === 'object') val = JSON.stringify(val);
        return `<td>${val}</td>`;
    }).join('')}
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Filter logic
        document.getElementById('table-search').addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#table-body tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });

        // Sorting logic
        let sortDir = 1;
        function sortTable(n) {
            const table = document.getElementById("main-table");
            const tbody = document.getElementById("table-body");
            const rows = Array.from(tbody.querySelectorAll("tr"));
            
            sortDir *= -1;
            
            const sortedRows = rows.sort((a, b) => {
                const x = a.getElementsByTagName("td")[n].textContent.toLowerCase();
                const y = b.getElementsByTagName("td")[n].textContent.toLowerCase();
                return x.localeCompare(y, undefined, {numeric: true}) * sortDir;
            });
            
            while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
            tbody.append(...sortedRows);
        }
    </script>
</body>
</html>`;

    return {
        content: [{ type: "text", text: html }]
    };
}

/**
 * Tool: render_carbon_details
 * Generates a Carbon-styled Detail view for a single Maximo record
 */
async function renderCarbonDetails({ objectStructure, where }) {
    const params = new URLSearchParams({ "lean": "1", "oslc.pageSize": "1" });
    if (where) params.append("oslc.where", where);
    const url = `${MAXIMO_URL}/os/${objectStructure}?${params.toString()}`;

    let rec;
    try {
        const res = await fetch(url, { headers: { "apikey": API_KEY, "Content-Type": "application/json" } });
        if (!res.ok) return { isError: true, content: [{ type: "text", text: `Error ${res.status}` }] };
        const data = await res.json();
        if (!data.member || data.member.length === 0) return { content: [{ type: "text", text: "Record not found" }] };
        rec = data.member[0];
    } catch (e) { return { isError: true, content: [{ type: "text", text: e.message }] }; }

    const fields = Object.entries(rec).filter(([k]) => !k.startsWith('_') && k !== 'href');

    let html = `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/carbon-components/css/carbon-components.min.css">
    <style>
        body { padding: 2rem; background: #f4f4f4; }
        .bx--tile { background: white; max-width: 800px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .field-row { display: flex; border-bottom: 1px solid #e0e0e0; padding: 0.75rem 1rem; }
        .field-label { font-weight: bold; width: 250px; color: #525252; text-transform: uppercase; font-size: 0.75rem; }
        .field-value { flex: 1; color: #161616; }
        .header { background: #161616; color: white; padding: 1rem; margin: -1rem -1rem 1rem -1rem; }
    </style>
</head>
<body class="bx--body">
    <div class="bx--tile">
       <div style="padding:1rem">
        <h3 class="bx--type-productive-heading-03" style="margin-bottom: 1.5rem;">${objectStructure} Record Details</h3>
        <div class="bx--grid bx--grid--no-gutter">
            ${fields.map(([k, v]) => `
            <div class="field-row">
                <div class="field-label">${k}</div>
                <div class="field-value">${typeof v === 'object' ? JSON.stringify(v) : (v !== null ? v : '--')}</div>
            </div>
            `).join('')}
        </div>
       </div>
    </div>
</body>
</html>`;

    return {
        content: [{ type: "text", text: html }]
    };
}

/**
 * Tool: create_record
 * POSTs a new record to any Maximo Object Structure via the OSLC REST API.
 * Works for assets, work orders, PMs, job plans, inventory, locations — anything
 * with an mxapi* Object Structure.
 *
 * Maximo quirks handled here:
 *   • lean=1 strips namespaces from the response
 *   • _siteid + _insertsite in the URL force the correct site when the API user
 *     has querywithsite=true but no Default Insert Site set in their profile
 *   • 201 Created responses have an empty body — we return the href from the
 *     Location response header instead
 */
async function createRecord({ objectStructure, payload, siteid }) {
    const params = new URLSearchParams({ lean: "1" });
    if (siteid) {
        params.append("_siteid", siteid);
        params.append("_insertsite", siteid);
    }

    const url = `${MAXIMO_URL}/os/${objectStructure}?${params.toString()}`;
    console.error(`POST ${url}`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "apikey":        API_KEY,
                "Content-Type":  "application/json",
                "Accept":        "application/json",
            },
            body: JSON.stringify(payload),
        });

        // 201 Created — body is empty; surface the Location header so callers
        // know the new record's self-link
        if (response.status === 201) {
            const location = response.headers.get("Location") || "";
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        status:   "created",
                        location: location,
                        message:  `Record created successfully in ${objectStructure}.`,
                    }, null, 2)
                }]
            };
        }

        if (!response.ok) {
            const body = await response.text();
            return {
                content: [{ type: "text", text: `Error ${response.status}: ${body.slice(0, 800)}` }],
                isError: true,
            };
        }

        const data = await response.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };

    } catch (error) {
        return {
            content: [{ type: "text", text: `Network Error: ${error.message}` }],
            isError: true,
        };
    }
}

/**
 * Tool: update_record
 * PATCHes an existing Maximo record identified by a where clause.
 * Maximo's OSLC PATCH requires the record's _id (rowstamp-bearing URI).
 * This tool first GETs the record to resolve its href, then PATCHes it.
 *
 * Use for: changing field values, updating descriptions, modifying planned
 * materials or task steps on an existing work order, etc.
 */
async function updateRecord({ objectStructure, where, payload }) {
    // Step 1 — resolve the record's self-link (href)
    const params = new URLSearchParams({ lean: "1", "oslc.pageSize": "1" });
    if (where) params.append("oslc.where", where);
    const getUrl = `${MAXIMO_URL}/os/${objectStructure}?${params.toString()}`;

    let recordHref;
    try {
        const getRes = await fetch(getUrl, {
            headers: { "apikey": API_KEY, "Accept": "application/json" }
        });
        if (!getRes.ok) {
            return {
                content: [{ type: "text", text: `Lookup failed (${getRes.status}) — cannot resolve record href for ${where}` }],
                isError: true,
            };
        }
        const data = await getRes.json();
        const record = (data.member || [])[0];
        if (!record) {
            return {
                content: [{ type: "text", text: `No record found matching: ${where}` }],
                isError: true,
            };
        }
        recordHref = record.href || record.localref;
    } catch (e) {
        return {
            content: [{ type: "text", text: `Lookup error: ${e.message}` }],
            isError: true,
        };
    }

    // Step 2 — PATCH the record
    // Maximo servlet containers reject the PATCH verb directly (501).
    // The correct approach is POST with x-method-override: PATCH.
    const patchUrl = `${recordHref}?lean=1&_mergeupdate=true`;
    console.error(`POST (PATCH override) ${patchUrl}`);

    try {
        const patchRes = await fetch(patchUrl, {
            method:  "POST",
            headers: {
                "apikey":            API_KEY,
                "Content-Type":      "application/json",
                "Accept":            "application/json",
                "x-method-override": "PATCH",
                "patchtype":         "MERGE",
            },
            body: JSON.stringify(payload),
        });

        if (patchRes.status === 204) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        status:  "updated",
                        href:    recordHref,
                        message: `Record updated successfully.`,
                    }, null, 2)
                }]
            };
        }

        if (!patchRes.ok) {
            const body = await patchRes.text();
            return {
                content: [{ type: "text", text: `Error ${patchRes.status}: ${body.slice(0, 800)}` }],
                isError: true,
            };
        }

        const data = await patchRes.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };

    } catch (error) {
        return {
            content: [{ type: "text", text: `Network Error: ${error.message}` }],
            isError: true,
        };
    }
}

/**
 * Tool: run_action
 * Invokes a Maximo record action via the ?action= query parameter.
 * Used for status transitions and business process triggers that cannot be
 * expressed as a plain field update.
 *
 * Common actions:
 *   wsmethod:changeStatus   — change WO/PM/asset status (payload: {status, memo})
 *   wsmethod:generateWO     — generate work orders from a PM record
 *   wsmethod:approve        — approve a purchase order or requisition
 *
 * The record is resolved by objectStructure + where, then the action POST is
 * sent to its href.
 */
async function runAction({ objectStructure, where, action, payload }) {
    // Step 1 — resolve record href
    const params = new URLSearchParams({ lean: "1", "oslc.pageSize": "1" });
    if (where) params.append("oslc.where", where);
    const getUrl = `${MAXIMO_URL}/os/${objectStructure}?${params.toString()}`;

    let recordHref;
    try {
        const getRes = await fetch(getUrl, {
            headers: { "apikey": API_KEY, "Accept": "application/json" }
        });
        if (!getRes.ok) {
            return {
                content: [{ type: "text", text: `Lookup failed (${getRes.status}) for ${where}` }],
                isError: true,
            };
        }
        const data = await getRes.json();
        const record = (data.member || [])[0];
        if (!record) {
            return {
                content: [{ type: "text", text: `No record found matching: ${where}` }],
                isError: true,
            };
        }
        recordHref = record.href || record.localref;
    } catch (e) {
        return {
            content: [{ type: "text", text: `Lookup error: ${e.message}` }],
            isError: true,
        };
    }

    // Step 2 — POST the action
    // Maximo wsmethod actions must be sent to the individual record URI (href),
    // but the lean href is base64 — we need to strip ?lean=1 args from it and
    // append only the action param. Also include the payload fields merged in
    // (Maximo changeStatus reads status/memo from the request body).
    const baseHref = recordHref.split('?')[0];
    const actionUrl = `${baseHref}?lean=1&action=${encodeURIComponent(action)}`;
    console.error(`POST (action) ${actionUrl}`);

    // Merge the where-identified fields into the action body so Maximo's
    // MBO context is fully hydrated (prevents the mboSet null NPE on some versions)
    const actionBody = { ...(payload || {}) };

    try {
        const actionRes = await fetch(actionUrl, {
            method:  "POST",
            headers: {
                "apikey":        API_KEY,
                "Content-Type":  "application/json",
                "Accept":        "application/json",
                "x-method-override": "PATCH",
            },
            body: JSON.stringify(actionBody),
        });

        if (actionRes.status === 204 || actionRes.status === 200) {
            let body = {};
            try { body = await actionRes.json(); } catch (_) {}
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        status:  "action_completed",
                        action:  action,
                        href:    recordHref,
                        result:  body,
                    }, null, 2)
                }]
            };
        }

        const errBody = await actionRes.text();
        return {
            content: [{ type: "text", text: `Error ${actionRes.status}: ${errBody.slice(0, 800)}` }],
            isError: true,
        };

    } catch (error) {
        return {
            content: [{ type: "text", text: `Network Error: ${error.message}` }],
            isError: true,
        };
    }
}

// --- Protocol Handling ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_object_structures",
                description: "List available Maximo Object Structures (APIs) from the schema, with optional filtering.",
                inputSchema: {
                    type: "object",
                    properties: {
                        filter: {
                            type: "string",
                            description: "Search term to filter Object Structures by name or description"
                        }
                    }
                }
            },
            {
                name: "get_schema_details",
                description: "Get the detailed field definitions (properties, types) for a specific Maximo Object Structure.",
                inputSchema: {
                    type: "object",
                    properties: {
                        objectStructure: {
                            type: "string",
                            description: "The name of the Object Structure (e.g., MXWO, MXASSET)"
                        }
                    },
                    required: ["objectStructure"]
                }
            },
            {
                name: "query_maximo",
                description: "Query data from Maximo using the OSLC REST API.",
                inputSchema: {
                    type: "object",
                    properties: {
                        objectStructure: {
                            type: "string",
                            description: "The Object Structure to query (e.g., mxwo, mxasset)"
                        },
                        where: {
                            type: "string",
                            description: "OSLC where clause (e.g., status=\"APPR\" and siteid=\"BEDFORD\")"
                        },
                        select: {
                            type: "string",
                            description: "Comma-separated list of fields to select (e.g., wonum,description,status)"
                        },
                        pageSize: {
                            type: "number",
                            description: "Number of records to return (default 10)",
                            default: 10
                        },
                        orderBy: {
                            type: "string",
                            description: "OSLC orderBy clause (e.g., -reportdate)"
                        },
                        formatted: {
                            type: "boolean",
                            description: "If true, returns a Carbon-styled HTML table instead of JSON (default: true)"
                        }
                    },
                    required: ["objectStructure"]
                }
            },
            {
                name: "render_carbon_table",
                description: "Generates a beautiful Carbon Design System HTML table from Maximo data.",
                inputSchema: {
                    type: "object",
                    properties: {
                        objectStructure: {
                            type: "string",
                            description: "The Object Structure to query (e.g., mxwo, mxasset)"
                        },
                        where: {
                            type: "string",
                            description: "OSLC where clause"
                        },
                        select: {
                            type: "string",
                            description: "Comma-separated list of fields (e.g., wonum,description)"
                        },
                        orderBy: {
                            type: "string",
                            description: "Sorting criteria"
                        },
                        pageSize: {
                            type: "number",
                            description: "Number of records (default 10)"
                        },
                        title: {
                            type: "string",
                            description: "Title for the table"
                        }
                    },
                    required: ["objectStructure"]
                }
            },
            {
                name: "render_carbon_details",
                description: "Generates a beautiful Carbon Design System detail view for a specific Maximo record.",
                inputSchema: {
                    type: "object",
                    properties: {
                        objectStructure: {
                            type: "string",
                            description: "The Object Structure (e.g., mxwo)"
                        },
                        where: {
                            type: "string",
                            description: "OSLC where clause to find the unique record (e.g., wonum=\"1001\")"
                        }
                    },
                    required: ["objectStructure", "where"]
                }
            },
            {
                name: "get_instance_details",
                description: "Introspect the Maximo instance to get context data (e.g., latest data dates, version).",
                inputSchema: {
                    type: "object",
                    properties: {},
                }
            },
            {
                name: "create_record",
                description: "Create a new record in any Maximo Object Structure via POST (assets, work orders, PMs, job plans, inventory, locations, etc.). Supply the Object Structure name, a JSON payload matching its schema, and optionally a siteid.",
                inputSchema: {
                    type: "object",
                    properties: {
                        objectStructure: {
                            type: "string",
                            description: "The Object Structure to POST to (e.g., mxapiasset, mxapiwodetail, mxapipm, mxapijobplan, mxapiinventory)"
                        },
                        payload: {
                            type: "object",
                            description: "The record fields to create. Use get_schema_details first to discover valid field names. Do NOT include assettype, vendor, or status unless you have confirmed valid values via a query."
                        },
                        siteid: {
                            type: "string",
                            description: "Site ID appended as _siteid and _insertsite query params (e.g. BEDFORD). Required when the API user has querywithsite=true and no Default Insert Site configured."
                        }
                    },
                    required: ["objectStructure", "payload"]
                }
            },
            {
                name: "update_record",
                description: "Update an existing Maximo record via PATCH. Resolves the record by objectStructure + OSLC where clause, then merges the supplied payload fields. Only supplied fields are changed (MERGE semantics — all others are untouched).",
                inputSchema: {
                    type: "object",
                    properties: {
                        objectStructure: {
                            type: "string",
                            description: "The Object Structure of the record to update (e.g., mxapiasset, mxapiwodetail)"
                        },
                        where: {
                            type: "string",
                            description: "OSLC where clause identifying the record (e.g., wonum=\"WO-001\" and siteid=\"BEDFORD\")"
                        },
                        payload: {
                            type: "object",
                            description: "Fields to update. Only supplied fields change; all others are left untouched."
                        }
                    },
                    required: ["objectStructure", "where", "payload"]
                }
            },
            {
                name: "run_action",
                description: "Invoke a Maximo business action on an existing record — status changes, generating WOs from a PM, approving a PO, etc. Actions trigger Maximo server-side business logic beyond a simple field edit. Common actions: wsmethod:changeStatus (payload: {status, memo}), wsmethod:generateWO, wsmethod:approve.",
                inputSchema: {
                    type: "object",
                    properties: {
                        objectStructure: {
                            type: "string",
                            description: "Object Structure of the target record (e.g., mxapiwodetail, mxapipm, mxapiasset)"
                        },
                        where: {
                            type: "string",
                            description: "OSLC where clause to identify the record (e.g., wonum=\"WO-001\" and siteid=\"BEDFORD\")"
                        },
                        action: {
                            type: "string",
                            description: "Maximo action name (e.g., wsmethod:changeStatus, wsmethod:generateWO, wsmethod:approve)"
                        },
                        payload: {
                            type: "object",
                            description: "Action parameters (e.g., {\"status\": \"APPR\", \"memo\": \"Approved via Bob\"} for changeStatus). Pass {} or omit if the action takes no parameters."
                        }
                    },
                    required: ["objectStructure", "where", "action"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;

        switch (name) {
            case "list_object_structures":
                return await listObjectStructures(args);
            case "get_schema_details":
                return await getSchemaDetails(args);
            case "query_maximo":
                return await queryMaximo(args);
            case "render_carbon_table":
                return await renderCarbonTable(args);
            case "render_carbon_details":
                return await renderCarbonDetails(args);
            case "get_instance_details":
                return await getInstanceDetails();
            case "create_record":
                return await createRecord(args);
            case "update_record":
                return await updateRecord(args);
            case "run_action":
                return await runAction(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message} ` }],
            isError: true
        };
    }
});

// Start the server
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Maximo MCP Server running on stdio");
}

run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});

// --- Smithery Sandbox Server Export ---
// This allows Smithery to scan server capabilities without real credentials
function createSandboxServer() {
    return server;
}

module.exports = { createSandboxServer };
