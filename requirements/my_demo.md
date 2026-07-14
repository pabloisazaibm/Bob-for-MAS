# My Demo Brief
# ==============
# Fill in every section below. Bob reads this file to generate your assets,
# work orders, task steps, planned materials, and demo script.
# The more specific you are, the more realistic and impressive the output.
#
# When done, paste the contents of prompts/bob_generate.md into Bob.

---

## 1. Customer & Audience

**Customer name:**
<!-- e.g. City of Austin, Acme Manufacturing, US Army Corps of Engineers -->

**Audience (who will be in the room):**
<!-- e.g. Director of Facilities, VP of Operations, IT Director, Procurement Lead -->

**Industry / sector:**
<!-- e.g. Federal Government, Municipal Utilities, Oil & Gas, Healthcare, Manufacturing -->

---

## 2. What They Manage (the Asset Fleet)

**What physical assets does this customer operate and maintain?**
<!-- Be specific — not just "equipment" but "diesel generators at 12 substations",
     "HVAC units across 40 federal buildings", "a fleet of 85 refuse collection vehicles" -->

**Asset naming prefix (used for asset numbers and WO numbers):**
<!-- e.g. ACME, CITY, USACE, DOE — keep it short, no spaces -->
<!-- Assets will be named: PREFIX-AST-001 → 010 -->
<!-- Work orders will be named: PREFIX-WO-001 → 010 -->

**Name 3–5 specific asset types this customer has:**
<!--
- Asset type 1 (e.g. 480V Switchgear Cabinet)
- Asset type 2 (e.g. Chiller Unit - 200-ton Centrifugal)
- Asset type 3 (e.g. Emergency Diesel Generator - 750kW)
- Asset type 4
- Asset type 5
-->

---

## 3. The Emergency Scenario (your demo opening)

**What is the high-drama failure that opens your demo?**
<!-- This becomes the opening hook and the primary CM work order.
     Make it mission-critical — something the audience will immediately feel.
     e.g. "A 480V switchgear cabinet in Building 7 tripped offline at 0200,
     cutting power to the server room and three emergency egress corridors." -->

**Which asset fails? (pick one from your list above):**

**What is the most expensive / hard-to-get part needed to fix it?**
<!-- e.g. "480V bus bar assembly — $8,500, 6-week lead time from the OEM" -->

---

## 4. The Preventive Maintenance Contrast

**What is a routine, scheduled maintenance task for this fleet?**
<!-- This becomes your PM work order — the contrast to the emergency CM.
     e.g. "Annual thermographic inspection of all switchgear panels",
     "Quarterly oil sampling and filter change on diesel generators" -->

---

## 5. Maximo Environment

**Site ID:**
<!-- The Maximo site where your demo data will be loaded, e.g. BEDFORD -->

**Org ID:**
<!-- e.g. EAGLENA -->

**Location code:**
<!-- A valid location that already exists in Maximo at your site.
     Ask Bob: "Query mxapilocation for location and description at site [SITE]" -->

**Person ID (owner of all WOs):**
<!-- PERSON.PERSONID — not the login ID. May contain spaces.
     Ask Bob: "Query mxapiperson for personid and displayname, 10 records" -->

---

## 6. Tone & Talking Points (optional but recommended)

**Any compliance, regulatory, or safety requirements to weave in?**
<!-- e.g. NERC CIP for utilities, FedRAMP for federal, OSHA 1910 for manufacturing -->

**Any specific integration the customer cares about?**
<!-- e.g. SAP, ServiceNow, a SCADA/monitoring system, a GIS platform -->

**Any objections you're already expecting from this audience?**
<!-- e.g. "We're mid-SAP implementation", "Budget is frozen until FY26" -->
