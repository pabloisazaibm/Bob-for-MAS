# Bob Prompt — MAS Demo Generator
# =================================
# INSTRUCTIONS FOR THE CSE:
# 1. Copy everything below this comment block and paste it into Bob as a new message
# 2. Fill in the "My Environment" section from your .env file
# 3. Replace the Step 3 section with a natural language description of your demo —
#    tell Bob what the customer does, what you want to demo, and any naming
#    conventions or prefixes you want used. Bob handles the rest.
# 4. Bob will ask clarifying questions if it needs more detail — answer and let it continue.
# ─────────────────────────────────────────────────────────────────────────────────

---

I want to set up a full IBM Maximo Application Suite demo environment.

Please work through the following steps in order. Do not skip any step. Confirm the result of each step before moving to the next. If you hit an error at any step, diagnose it and fix it before continuing — do not skip ahead.

---

## My Environment

- **Maximo URL:** `[paste your MAXIMO_URL here]`
- **API Key:** `[paste your MAXIMO_API_KEY here]`
- **Site:** `[paste your site ID here — e.g. BEDFORD]`
- **Org:** `[paste your org ID here — e.g. EAGLENA]`

---

## My Demo

[
  Describe your demo here in plain English. Include:

  - Who the customer is and what industry they are in
  - What physical assets they operate (equipment, vehicles, infrastructure, etc.)
  - The naming prefix or abbreviation you want used for asset and WO numbers
    (e.g. "use the prefix ACME", or "use the customer's ticker symbol PWR")
  - Any industry-specific terminology, part names, failure modes, or regulatory
    standards that should appear in the demo data and talking points
  - The high-drama scenario — the one failure or emergency that opens the demo
  - Anything else that would make this feel real for the customer
    (e.g. "they are very focused on regulatory compliance",
     "their biggest pain point is unplanned downtime",
     "they care a lot about inventory costs")

  Example (replace with your own):
  "The customer is a municipal water utility operating 40 pump stations across
   the city. Use the prefix MWU. Their biggest pain is emergency pump failures
   that take stations offline and trigger EPA compliance violations. The
   high-drama opening scenario is a main pump failure at Station 7 during
   peak demand. They are particularly interested in PM schedules, job plans,
   and parts inventory."
]

---

## Step 1 — Validate the connection

Run `get_instance_details`. Confirm `instanceUrl` is populated and report back the URL.
If it is empty, stop — do not proceed.

---

## Step 2 — Validate the environment

Query Maximo to confirm:
1. The site ID I gave you exists — query `mxapilocation` filtered to my site and show me 3 results
2. At least one valid location exists at that site — tell me the location codes you find
3. At least one active person exists — query `mxapiperson` and show me 3 personid + displayname results

Tell me what you found. If anything is missing, stop and tell me what to fix.

---

## Step 3 — Design the demo data

Based on my demo description above, propose the following **before creating anything in Maximo**:

**Tell me which Maximo Object Structures you plan to create records in**, and why each one supports the demo story. At minimum include assets and work orders. Also consider whether the demo would benefit from:
- Job Plans (mxapijobplan) — reusable task templates that attach to PMs and WOs
- PM Schedules (mxapipm) — automated maintenance triggers linked to assets and job plans
- Inventory records (mxapiinventory) — storeroom stock that makes the parts story real

For each Object Structure you plan to use, list:
- What records you will create
- The naming prefix/convention (using any abbreviation or nomenclature I specified above)
- How it connects to the other records in the demo flow

Then propose:
- **10 assets** with realistic names, descriptions, and serial numbers using my prefix
- **10 work orders** — one per asset, with a realistic mix of CM (emergency/corrective) and PM (scheduled/preventive) work types, realistic task steps, and planned materials with real-world part names and costs
- The primary CM work order should feature a high-value critical part (>$1,000) that anchors the inventory / parts availability scene
- Any job plans or PM schedules that would make the demo more compelling

Show me the full proposed data set for my review. **Do not create anything in Maximo until I approve.**

---

## Step 4 — Load the data

Once I approve the proposal in Step 3, create all the records directly in Maximo using the MCP tools:

1. For each Object Structure in your plan (assets first, then job plans if any, then work orders, then PMs if any):
   - Call `get_schema_details` to confirm the correct field names
   - Call `create_record` for each record
   - Report ✓ or ✗ for every record as you go
   - If any record fails, diagnose the error, fix the payload, and retry before continuing

2. Once all records are created, query Maximo to verify:
   - Query `mxapiasset` filtered to my site and prefix — confirm count matches
   - Query `mxapiwodetail` filtered to my site and prefix — confirm count matches
   - Show me the first 3 of each so I can visually confirm they look right

---

## Step 5 — Generate the demo script

Once all records are confirmed in Maximo:

1. Update `scripts/build_docs.py` — replace the NOAA demo constants (`ASSETS`, `WORK_ORDERS`, task lists, materials lists, cover page, opening hook, all scene narration, Q&A, and checklist) with content specific to this customer and the exact records just loaded.

2. Make the script feel real for this customer:
   - Use their industry terminology throughout
   - Reference the actual asset numbers, WO numbers, part numbers, and costs from Step 4
   - Tailor the objection handling and Q&A to their industry's typical concerns

3. Run: `python3 scripts/build_docs.py`

4. Confirm both files were created:
   - `output/MAS_Demo_Script.docx`
   - `output/CSE_How_To_Guide.docx`

---

## Step 6 — Final confirmation

Summarise what was built:
- List every Object Structure records were created in, with counts
- Confirm the demo script is saved and tailored to this customer
- Give me the 3-sentence opening hook I should use to start the live demo

Report: "Demo environment ready for [CUSTOMER]. [summary of what was created]. Demo script saved to output/MAS_Demo_Script.docx."
