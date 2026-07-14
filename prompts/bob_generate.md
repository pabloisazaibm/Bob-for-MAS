# Bob Prompt — MAS Demo Generator
# =================================
# INSTRUCTIONS FOR THE CSE:
# 1. Complete requirements/my_demo.md first
# 2. Fill in your .env file
# 3. Copy everything below this comment block and paste it into Bob as a new message
# 4. Bob will do the rest — do not interrupt until it reports "Done."
#
# Replace every [BRACKETED VALUE] with your actual value from .env and my_demo.md
# ─────────────────────────────────────────────────────────────────────────────────

---

I want to set up a full IBM Maximo Application Suite demo for **[CUSTOMER NAME]**.

Please work through the following steps in order. Do not skip any step. Report the result of each step before moving to the next.

---

## My Environment

- **Maximo API base URL:** `[API_BASE from .env]`
- **API Key:** `[MAXIMO_API_KEY from .env]`
- **Site:** `[MAXIMO_SITE from .env]`
- **Org:** `[MAXIMO_ORG from .env]`
- **Location:** `[MAXIMO_LOCATION from .env]`
- **Owner (Person ID):** `[MAXIMO_OWNER from .env]`

---

## My Demo Brief

[PASTE THE FULL CONTENTS OF requirements/my_demo.md HERE — replace this line]

---

## Step 1 — Validate the connection

Run `get_instance_details`. Confirm `instanceUrl` is populated and not empty.
If it is empty, stop and tell me — do not proceed.

---

## Step 2 — Validate site, location, and person

1. Query `mxapilocation` where `siteid="[MAXIMO_SITE]"` — confirm `[MAXIMO_LOCATION]` appears in the results.
2. Query `mxapiperson` — confirm a person with `personid="[MAXIMO_OWNER]"` exists.

If either is not found, stop and tell me what you found instead.

---

## Step 3 — Generate the demo data

Based on my demo brief above, generate:

**10 assets** specific to my customer's industry and asset types, following this format:
- Asset numbers: `[PREFIX]-AST-001` through `[PREFIX]-AST-010`
- Each asset needs: a realistic description, a serial number (`SRN-2024-001` through `SRN-2024-010`), and location `[MAXIMO_LOCATION]`
- Do NOT include vendor, assettype, or status fields — Maximo will reject them

**10 work orders** — one per asset, following this format:
- WO numbers: `[PREFIX]-WO-001` through `[PREFIX]-WO-010`
- Mix of work types: roughly 4 CM (Corrective Maintenance) and 6 PM (Preventive Maintenance)
- Make `[PREFIX]-WO-002` (or the most dramatic one) a CM / emergency scenario tied to the high-drama failure from my brief — wopriority: 1
- Each WO needs: 4–6 realistic task steps specific to the asset type, and 3–4 planned materials with realistic part numbers, descriptions, quantities, and unit costs
- The primary CM work order should have a high-value part (>$1,000) that makes for a good "parts availability" story in Scene 3
- Work types must be one of: PM, CM, CP, EM

Show me the complete generated data (assets list + work orders list) for my review before writing any files.

---

## Step 4 — Write and run the loader

Once I approve the data in Step 3:

1. Write the complete, runnable `scripts/demo_loader.py` with:
   - The `CONFIGURATION` block filled in with my environment values from Step 1
   - The `ASSETS` list populated with the 10 assets from Step 3
   - The `WORK_ORDERS` list populated with the 10 work orders from Step 3
   - The engine section (`login()`, `post()`, `create_assets()`, `create_work_orders()`) kept exactly as-is from the template

2. Run: `python3 scripts/demo_loader.py`

3. Report each asset and work order result — I need to see a `✓` for every record.
   If any fail, diagnose and fix before proceeding.

---

## Step 5 — Generate the demo script

Once all records are confirmed created in Maximo:

1. Update the `ASSETS`, `WORK_ORDERS`, `WO002_TASKS`, `WO002_MATERIALS`, `WO001_TASKS`, and `WO001_MATERIALS` constants in `scripts/build_docs.py` to match the exact data loaded in Step 4.

2. Update the cover page, opening hook, all scene navigation cues, narration, Q&A, and checklist in `build_demo_script()` to be specific to **[CUSTOMER NAME]** and their industry — no generic placeholders.

3. Run: `python3 scripts/build_docs.py`

4. Confirm both files were created:
   - `output/MAS_Demo_Script.docx`
   - `output/CSE_How_To_Guide.docx`

---

## Step 6 — Final check

Query Maximo to confirm the data is live:
1. Query `mxapiasset` for assets at site `[MAXIMO_SITE]` with assetnum starting with `[PREFIX]` — show me the count and first 3 records
2. Query `mxapiwo` for work orders at site `[MAXIMO_SITE]` with wonum starting with `[PREFIX]` — show me count, WO numbers, descriptions, and status

Report: "Demo environment ready. [N] assets and [N] work orders loaded. Demo script saved to output/MAS_Demo_Script.docx."
