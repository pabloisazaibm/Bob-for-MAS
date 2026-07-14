# MAS Demo Framework — IBM Bob + Maximo Manage

A self-service toolkit for IBM Customer Success Engineers. Clone this repo, fill in one file, paste one prompt into Bob — and walk away with a fully loaded Maximo environment and a customer-ready demo script.

**What it does:**
- Bulk-creates 10 industry-specific assets and 10 work orders (with task steps and planned materials) directly in your Maximo instance via REST API
- Generates a Word doc demo script that references your exact record numbers, descriptions, parts, and costs — no placeholders

**Runtime:** ~30 minutes end to end (most of that is reading)

---

## Prerequisites

Before you start, confirm you have:

- [ ] **Bob** running with the `maximo-mcp` server configured (see CSE How-To Guide)
- [ ] **Python 3.7+** installed (`python3 --version`)
- [ ] **python-docx** installed (`pip3 install python-docx`)
- [ ] **A MAS Manage instance** with API access (TechZone GTM demo or customer env)
- [ ] **Your Maximo API key** (Maximo UI → avatar → API Keys → Generate)
- [ ] **Default Insert Site set** in your Maximo user profile (avatar → Profile → Default Insert Site) — without this, every POST will fail

---

## 5-Step Quickstart

### Step 1 — Clone and configure

```bash
git clone <this-repo-url>
cd mas-demo-framework
cp .env.template .env
```

Open `.env` and fill in your Maximo connection details. See `.env.template` for field descriptions.

---

### Step 2 — Fill in your demo brief

Open `requirements/my_demo.md` and answer the 6 questions:
- Customer name and industry
- What assets they manage (a buoy fleet, a pump system, a vehicle fleet…)
- Asset number prefix and naming style
- High-drama scenario (the emergency that opens your demo)
- Your Maximo site, org, location, and person ID

This file is what Bob reads to generate everything. The more specific you are, the better the output.

See `requirements/example_noaa.md` for a completed example.

---

### Step 3 — Paste the Bob prompt

Open `prompts/bob_generate.md`.

Copy the entire contents and paste it into Bob as a new message. Bob will:
1. Validate your Maximo connection
2. Confirm your site, location, and person ID exist
3. Generate 10 assets and 10 work orders tailored to your industry
4. Write the completed data into `scripts/demo_loader.py`
5. Run `demo_loader.py` and confirm every record is created in Maximo
6. Generate `output/MAS_Demo_Script.docx` referencing the exact records loaded

---

### Step 4 — Verify in Maximo

Log into Maximo and spot-check:
- Assets → Assets → filter to your site — your 10 assets should appear
- Work Orders → Work Order Tracking → filter to your site, Status = WAPPR — your 10 WOs should appear
- Open your primary CM work order → Plans tab → confirm tasks and materials are there

---

### Step 5 — Open your demo script

Open `output/MAS_Demo_Script.docx`. It contains:
- A full asset/WO/parts reference table with your exact record numbers
- Scene-by-scene navigation guide (what to click, what to say)
- Exact task steps and material costs for your featured work orders
- Objection handling and Q&A tailored to your customer's industry
- A 12-item pre-demo checklist

---

## Repo Structure

```
mas-demo-framework/
├── README.md                    ← you are here
├── .env.template                ← copy to .env and fill in
├── .gitignore
├── requirements/
│   ├── my_demo.md               ← FILL THIS IN (your demo brief)
│   └── example_noaa.md          ← completed reference example (NOAA buoy fleet)
├── prompts/
│   └── bob_generate.md          ← paste this into Bob to generate everything
├── scripts/
│   ├── demo_loader.py           ← data loader engine (Bob fills this in for you)
│   └── build_docs.py            ← Word doc generator (Bob runs this for you)
└── output/                      ← generated files land here (.gitignored)
    └── .gitkeep
```

---

## Manual Option (no Bob)

If you prefer to drive it yourself without Bob:

1. Fill in `requirements/my_demo.md`
2. Edit the `CONFIGURATION` and `DEMO DATA` blocks in `scripts/demo_loader.py` directly
3. Run: `python3 scripts/demo_loader.py`
4. Run: `python3 scripts/build_docs.py`
5. Find your docs in `output/`

---

## Reference Example

The `requirements/example_noaa.md` file shows a completed brief for a NOAA ocean buoy fleet demo. It includes the exact assets, work orders, tasks, and materials that were loaded into a TechZone GTM instance — use it as a template for the level of detail Bob expects.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `null is not a valid site` | Set Default Insert Site in Maximo UI (avatar → Profile) |
| `302 redirect on every call` | You're using the Navigator URL — use the `manage` subdomain |
| `instanceUrl empty` in Bob | Env var must be `MAXIMO_URL`, not `MAXIMO_BASE_URL` |
| `Person does not exist` | Use `PERSON.PERSONID`, not the login ID — they often differ |
| `Location X is not valid` | Ask Bob: *"Query mxapilocation for location at site [SITE]"* |
| `Work Type MOD not valid` | Valid types: `PM`, `CM`, `CP`, `EM` |

Full troubleshooting reference: `CSE_How_To_Guide.docx`

---

*IBM Maximo Application Suite — Customer Success Engineering*
