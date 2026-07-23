# Bob Prompt — MAS Demo Generator (Manual Fallback)
# ==================================================
#
# NOTE: If you are using the MAS Demo Builder mode in Bob, you do NOT need
# this file — the guided onboarding flow runs automatically when you open
# the repo.
#
# Use this file only if you are NOT in MAS Demo Builder mode, or if you want
# to re-run the full generation flow manually in any mode. Copy everything
# below the dashed line and paste it into Bob as a new message.
#
# ─────────────────────────────────────────────────────────────────────────────

---

I want to set up a full IBM Maximo Application Suite demo environment.

Please work through the following stages in order. Do not skip any stage. Confirm the result of each stage before moving to the next. If you hit an error, diagnose and fix it before continuing.

---

## Stage 1 — Connection Setup

Ask me for the following, one at a time:

1. My MAS Manage URL (the base URL of the Maximo UI, e.g. `https://myapp.manage.mycluster.com/maximo`)
2. My Maximo API key (generate from: Maximo UI → avatar → API Keys → Generate new key)
3. My Site ID (e.g. `BEDFORD`)
4. My Org ID (e.g. `EAGLENA`)
5. My Location code — if I don't know it, type `lookup` and you will query `mxapilocation` for me
6. My Person ID (PERSON.PERSONID, not the login name) — if I don't know it, type `lookup` and you will query `mxapiperson` for me

Once collected, write a `.env` file in the workspace root using `.env.template` as the template.

---

## Stage 2 — Validate the Connection

Run `get_instance_details`. Confirm `instanceUrl` is populated and report the URL back.
If it is empty, stop — do not proceed. Tell me to check `MAXIMO_URL` in `~/.bob/settings/mcp.json`.

If I said `lookup` for location or person ID, query Maximo now and show me the results so I can pick.

Query `mxapilocation` filtered to my site to confirm the site exists. Tell me what you found.

---

## Stage 3 — Understand the Use Case

Ask me:

1. What type of demo I want to build — options:
   - A) Work Orders + Assets
   - B) Preventive Maintenance + Job Plans
   - C) Materials / Inventory
   - D) Full Stack (Assets + WOs + Job Plans + PMs + Inventory)
   - E) Something else (I'll describe it)

2. Who the customer is, what industry they are in, and what physical assets they operate

3. What naming prefix to use for asset and work order numbers (short, no spaces — e.g. `ACME`, `PWR`)

4. The high-drama emergency scenario that opens the demo (becomes the primary CM work order)

5. (If use case includes PM or Full Stack) What a routine scheduled maintenance task looks like for this fleet

Write all collected info into `requirements/my_demo.md`.

---

## Stage 4 — Propose the Demo Data

Based on the use case and brief from Stage 3, propose the full demo dataset **before creating anything in Maximo**:

- List every Maximo Object Structure you plan to create records in and why
- Propose 10 assets with realistic descriptions and serial numbers using the chosen prefix
- Propose 10 work orders — a realistic mix of types (CM, PM, CP), with task steps and planned materials with real part names and costs
- Flag the primary CM work order (the high-drama opening scenario) with ★
- Include job plans, PM schedules, and inventory records if the use case calls for them

Show the full proposed dataset as a formatted table. Do not create anything until I approve.
Explicitly ask: "Does this look right? Reply `yes` to proceed with loading, or tell me what to change."

---

## Stage 5 — Load the Data

Once I approve:

1. For each Object Structure (assets first, then job plans if any, then work orders, then PMs, then inventory):
   - Call `get_schema_details` to confirm field names
   - Call `create_record` for each record
   - Report ✓ or ✗ for each record as you go
   - If any record fails, diagnose the error, fix the payload, and retry before continuing

2. After all records are created, verify by querying Maximo:
   - Query assets filtered to site + prefix — confirm count
   - Query work orders filtered to site + prefix — confirm count
   - Show the first 3 of each for a visual spot-check

---

## Stage 6 — Demo Script (Optional)

Ask me: "Would you like me to generate a Word document demo script?"

If yes:
1. Update `scripts/build_docs.py` — replace all demo constants with content specific to this customer and the exact records just loaded
2. Run: `python3 scripts/build_docs.py`
3. Confirm both files were created in `output/`:
   - `output/MAS_Demo_Script.docx`
   - `output/CSE_How_To_Guide.docx`

---

## Stage 7 — Summary

Summarise what was built:
- Every Object Structure records were created in, with counts
- Confirmation the demo script is saved and tailored to this customer (if generated)
- A 2–3 sentence opening hook I can use to start the live demo

Report: "Demo environment ready for [CUSTOMER]. [summary]. Demo script saved to output/MAS_Demo_Script.docx."

After this, the session is open for any additional Maximo work I need.
