# MAS Demo Framework — README

A self-service toolkit for IBM Customer Success Engineers. Clone this repo, open it in Bob — and walk away with a fully loaded Maximo environment and a customer-ready demo script.

**What it does:**
- Connects Bob directly to any MAS Manage instance via the `maximo-mcp` server
- Walks you through connection setup, site/org/location config, and use case selection — guided, step by step
- Creates demo assets, work orders, job plans, PM schedules, and inventory records tailored to your customer's industry — directly in Maximo via REST API
- Optionally generates a Word document demo script referencing your exact record numbers, descriptions, parts, and costs — no placeholders

**Runtime:** ~30 minutes end to end

---

## How It Works — The Guided Flow

Once you clone this repo and open it in Bob, the onboarding runs automatically. Here is exactly what happens:

| Stage | What Bob does |
|---|---|
| 1 | Welcomes you and checks whether `.env` already exists |
| 2 | Asks for your MAS URL, API key, site, org, location, and person ID — then writes `.env` |
| 3 | Validates the connection (`get_instance_details`), confirms site exists, looks up location/person ID if needed |
| 4 | Asks what the customer/industry is and what use case to build (WOs, PMs, Inventory, Full Stack, or custom) |
| 5 | Proposes the full data set — 10 assets + 10 work orders + any job plans / PMs / inventory — **for your review before anything is created** |
| 6 | Loads all records into Maximo, reports ✓/✗ per record, verifies counts |
| 7 | Asks if you want a Word document demo script — generates it if yes |
| 8 | Summarises what was built and gives you the opening hook for the live demo — session is then open for anything else |

---

## Prerequisites

Before you start, confirm you have:

- [ ] **Bob** running with the `maximo-mcp` server configured — point it at `mcp/maximo-mcp-server.js` in this repo (see `mcp/README.md`)
- [ ] **Python 3.7+** installed (`python3 --version`)
- [ ] **python-docx** installed (`pip3 install python-docx`)
- [ ] **A MAS Manage instance** with API access (TechZone GTM demo or customer env)
- [ ] **Your Maximo API key** (Maximo UI → avatar → API Keys → Generate)
- [ ] **Default Insert Site set** in your Maximo user profile (avatar → Profile → Default Insert Site) — without this, every POST will fail

---

## Quickstart

### Step 1 — Clone

```bash
git clone <this-repo-url>
cd mas-demo-framework
```

### Step 2 — Open in Bob

Open the repo folder in Bob. Switch to the **MAS Demo Builder** mode (available in the mode picker once the repo is open).

Bob will immediately start the guided onboarding flow. Answer the prompts — Bob handles the rest.

> If you are not using the MAS Demo Builder mode, paste the contents of `prompts/bob_generate.md` into Bob to run the same flow manually.

---

## Use Case Options

During onboarding, Bob will ask what you want to build. Options:

| Option | Object Structures created |
|---|---|
| Work Orders + Assets | `mxapiasset`, `mxapiwodetail` |
| Preventive Maintenance + Job Plans | `mxapiasset`, `mxapiwodetail`, `mxapijobplan`, `mxapipm` |
| Materials / Inventory | `mxapiasset`, `mxapiwodetail`, `mxapiinventory` |
| Full Stack | All of the above |
| Custom | Whatever you describe |

---

## Repo Structure

```
mas-demo-framework/
├── README.md                    <- you are here
├── .env.template                <- reference for .env fields (Bob writes .env for you)
├── .gitignore
├── .bob/
│   ├── custom_modes.yaml        <- MAS Demo Builder mode definition
│   └── skills/
│       └── mas-demo-setup/
│           └── SKILL.md         <- guided onboarding skill (auto-activates)
├── mcp/
│   ├── maximo-mcp-server.js     <- extended MCP server (create, update, run_action)
│   ├── package.json
│   └── README.md                <- MCP setup and tool reference
├── requirements/
│   ├── my_demo.md               <- Bob writes this from your answers during onboarding
│   └── example_noaa.md          <- completed reference example (NOAA buoy fleet)
├── prompts/
│   └── bob_generate.md          <- manual fallback prompt (paste into Bob if needed)
├── scripts/
│   ├── demo_loader.py           <- data loader engine (Bob fills this in for you)
│   └── build_docs.py            <- Word doc generator (Bob runs this for you)
└── output/                      <- generated files land here (.gitignored)
    └── .gitkeep
```

---

## Manual Option (no guided flow)

If you prefer to drive it yourself:

1. Copy `.env.template` to `.env` and fill in all values
2. Fill in `requirements/my_demo.md`
3. Paste `prompts/bob_generate.md` into Bob as a message
4. Bob will run through connection validation, data proposal, loading, and script generation

---

## Reference Example

`requirements/example_noaa.md` shows a completed brief for a NOAA ocean buoy fleet demo — including exact assets, work orders, tasks, and materials that were loaded into a TechZone GTM instance. Use it as a template for the level of detail that produces the best output.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Guided flow doesn't start | Make sure you are in **MAS Demo Builder** mode (mode picker, top of Bob) |
| `null is not a valid site` | Set Default Insert Site in Maximo UI (avatar → Profile) |
| `302 redirect on every call` | You are using the Navigator URL — use the `manage` subdomain |
| `instanceUrl empty` in Bob | Env var must be `MAXIMO_URL` in `mcp.json`, not `MAXIMO_BASE_URL` |
| `Person does not exist` | Use `PERSON.PERSONID`, not the login ID — they often differ |
| `Location X is not valid` | During Stage 3, type `lookup` and Bob will show valid locations |
| `Work Type MOD not valid` | Valid types: `PM`, `CM`, `CP`, `EM` |

Full troubleshooting reference: `output/CSE_How_To_Guide.docx` (generated during Stage 7)

---

*IBM Maximo Application Suite — Customer Success Engineering*
