# Smartworld Sales Dashboard — KPI Reference & Data Sources

**Covers:** Smartworld The Edition · Smartworld Sky Arc · Trump Residences Gurgaon
**Last updated:** 17 July 2026

> **Maintenance rule:** this file must be updated in the same commit as any change to a KPI formula, a rebuild script, a data source, or a chart's calculation logic. If you (human or Claude) change how a number is computed, update the matching section here before moving on. Treat an out-of-date doc as a bug.

---

## 1. How this document is organized

Two pages per project:

- **Overview page** — Units, Area, Sales Value, Total Project Value, Project Snapshot bar, trend charts. Source: PDRN + INVR Excel files, rebuilt into `dashboard_data.json`.
- **Demand & Collection page** — Demand raised, Collected, Outstanding, Milestone table, Tower-wise breakdown, monthly trend. Source: DAPP Excel files, rebuilt into each project's own `*_dapp_kpi.json`.

"Cr" = Crore (1,00,00,000). All monetary figures are in Indian Rupees unless stated otherwise. "W/O Tax" / "W/O GST" means before GST.

### Source file glossary

| File | Project | Contains |
|---|---|---|
| `edition_pdrn.XLSX` / `skyarc_pdrn.XLSX` / `trump_pdrn.XLSX` | each project's own | Booking/sales register — one row per booked or cancelled unit |
| `edition_invr.XLSX` / `skyarc_invr.XLSX` / `trump_invr.XLSX` | each project's own | Inventory register — one row per physical unit (Booked/Available/Management Unit) |
| `edition_dapp.XLSX` / `skyarc_dapp.XLSX` / `trump_dapp.XLSX` | each project's own | Demand & collection ledger — one row per milestone installment raised against a unit |

### Rebuild scripts

| Script | Rebuilds |
|---|---|
| `scripts/rebuild_overview.py` | `dashboard_data.json` Overview sections for **all three** projects at once (pdrn/invr arrays, kpiExtra per project — merged not replaced, towerData, cpVsDirect, areaSummary, cancelledUnitStatus, brokerMap, salesVsRefund, monthly rate series) |
| `scripts/rebuild_edition_json.py` | Same Overview sections, Edition-only (used when only Edition's Excel changed, to avoid touching Sky Arc/Trump) |
| `scripts/rebuild_edition_dapp_kpi.py` | `public/data/dapp_kpi.json` (Edition Demand & Collection) |
| `scripts/rebuild_skyarc_dapp_kpi.py` | `public/data/skyarc_dapp_kpi.json` (Sky Arc Demand & Collection) |
| `scripts/rebuild_trump_dapp_kpi.py` | `public/data/trump_dapp_kpi.json` (Trump Demand & Collection) |

Run the relevant `*_dapp_kpi.py` script whenever a project's DAPP Excel is refreshed — none of this is automatic, and a stale `*_dapp_kpi.json` file is the single most common source of wrong numbers on this dashboard (this happened to Trump for three weeks before it was caught).

---

## 2. Overview Page KPIs (all 3 projects, same formulas)

| KPI | Formula |
|---|---|
| Booked (Active) Units | PDRN rows where Booking Status ≠ Cancelled/blank (Sky Arc: "Temporary Surrender" also counts as active) |
| Cancelled Units | PDRN rows where Booking Status contains "Cancel" |
| Total Inventory Units | Count of all rows in `*_invr.XLSX` |
| Available Units | INVR rows where Status = "Available" |
| Management Units | INVR rows where Status = "Management Unit" |
| Booked Area (sqft) | SUM(PDRN active rows, "Super Area") |
| Carpet Area (sqft) | SUM(PDRN active rows, "Carpet"/"Carpet Area") |
| Total BSP (Sold Value) | SUM(PDRN active rows, "Total BSP Net Value") ÷ 1e7 |
| Total TCV | SUM(PDRN active rows, "TCV (With Tax)") ÷ 1e7 |
| Cancelled BSP | SUM(PDRN cancelled rows, "Total BSP Net Value") ÷ 1e7 |
| Avg Rate / sqft | Total BSP ÷ Booked Area |

**Unsold Value & Total Project Value** (changed 17 Jul 2026 — now identical formula for all 3 projects, computed live in the browser, not baked into the JSON at build time):

```
Unsold Area   = INVR rows where Status = Available or Management Unit, SUM("Total Super Area")
Target Rate   = this project's targetRate in monthlyTargets for the CURRENT calendar month
                (same source the Rate chart's own tooltip reads — always in sync with it)
Unsold Value  = Unsold Area × Target Rate  ÷ 1e7
Total Project Value = Total BSP (Sold Value) + Unsold Value
Sold % (by value)   = Total BSP ÷ Total Project Value × 100
```

This lives in `src/App.jsx`, inside the `kpiEx` useMemo (search `currentMonthTargetRate`). It supersedes three different older, inconsistent methods:
- Edition previously used a **hardcoded fixed rate of ₹21,500/sqft**.
- Sky Arc previously used its own **avg sold rate (Sold BSP ÷ Sold Area)** applied to unsold area ("Approach 2").
- Trump had **no unsold-value calculation at all** and silently fell back to a type-wise blended-rate estimate.

⚠️ The `unsoldValueCr` / `totalProjCr` / `soldPctValue` fields still stored inside `dashboard_data.json`'s `kpiExtra` / `skyarcKpiExtra` objects are **no longer read for this display** — the frontend always recomputes live using the formula above. Those stored fields are vestigial; don't trust them if you're reading the raw JSON directly.

**Current values (17 Jul 2026, target rate for Jul'26):**

| | Edition | Sky Arc | Trump |
|---|---|---|---|
| Booked units | 632 | 889 | 224 |
| Cancelled units | 75 | 125 | 25 |
| Total inventory | 956 | 947 | 298 |
| Available / Management | 272 / 52 | 49 / 9 | 74 / 0 |
| Total BSP | ₹3,670.5 Cr | ₹4,430.6 Cr | ₹2,257.7 Cr |
| Avg Rate/sqft | ₹17,811 | ₹18,423 | ₹25,703 |
| Current month Target Rate | ₹21,500 | ₹21,500 | ₹28,500 |
| Unsold Value | ₹2,300.28 Cr | ₹338.95 Cr | ₹910.47 Cr |
| Total Project Value | ₹5,970.78 Cr | ₹4,769.55 Cr | ₹3,168.17 Cr |

**Project Snapshot bar — top 2 milestone chips:** computed **live** from each project's own `milestonesUpcoming` (sorted by `totalCr` descending, top 2), not a stored value. See §4 below. This replaced a hand-maintained `projectMeta.majorMilestones` field that was stale (Sky Arc's stored chips didn't match its real top milestone; Trump had none at all).

---

## 3. Demand & Collection Page KPIs (all 3 projects, same formulas)

| KPI | Formula |
|---|---|
| Total Demand (W/O Tax) | SUM(DAPP, "Demand Amount W/O Tax") ÷ 1e7 |
| Total Received (in Bank) | SUM(DAPP, "Received Amt (in Bank)") ÷ 1e7 |
| Total Received (W/O Tax) | SUM(DAPP, "Received Amt (in Bank)" − "CGST" − "SGST") ÷ 1e7 |
| Total Outstanding | SUM(DAPP, **"Outstanding 1"**) ÷ 1e7 — **not** "Outstanding Amount" (see bug note below) |
| Advance (raw/net/GST) | Rows where Demand = 0 but Received (Bank) > 0 (money collected before SAP raised the demand); net = raw ÷ 1.05, GST = raw − net |
| GST Rate | Fixed 5% |

⚠️ **"Outstanding 1" vs "Outstanding Amount" bug (fixed 17 Jul 2026, all 3 projects + Edition's raw dapp array):** `"Outstanding 1"` is a legitimate `0` for most rows. An earlier version used `Outstanding 1 or Outstanding Amount` in Python — since `0` is falsy, this silently fell through to `"Outstanding Amount"`, a completely different and much larger column, inflating Outstanding by roughly 20–25x. Always read `"Outstanding 1"` directly with no `or` fallback.

**CLP / TLP classification (changed 17 Jul 2026 — now identical rule for all 3 projects, by milestone content, not by Payment Plan Name):**

- **CLP** — milestone references a real construction event: floor/slab number, Excavation, Structure, Occupation Certificate, Possession, Flooring, Finishing Work, External Plaster, Basement/Plinth/Top Floor; OR a hybrid "event **or** date, whichever is later/earlier" (the date is just a backstop on a real construction milestone); OR a booking-stage milestone (Booking Amount / On Allotment — first installment); OR a time offset anchored to a construction event (e.g. "24 months from Application of OC").
- **TLP** — a pure fixed calendar date with no construction anchor ("Before `<date>`"), or a day/month interval from allotment/booking with no construction anchor ("After `<X>` Days/Months of Allotment/Booking").

This replaced three different older rules:
- Edition already used content-based classification (unchanged).
- Sky Arc previously classified by whether **Payment Plan Name** contained the text "CLP" — meant the same milestone could appear as both a CLP row and a TLP row depending on which plan happened to bill it.
- Trump previously classified **everything as TLP** (its Payment Plan Names are ratio-style — "30:30:40", "35:65" — and never contain CLP/TLP text, so that field was never usable as a signal). Its real construction milestones now correctly show as CLP.

**Current headline totals (17 Jul 2026):**

| | Edition | Sky Arc | Trump |
|---|---|---|---|
| Demand (W/O Tax) | ₹1,177.11 Cr | ₹1,861.93 Cr | ₹686.63 Cr |
| Received (in Bank) | ₹1,419.07 Cr | ₹1,732.32 Cr | ₹799.15 Cr |
| Received (W/O Tax) | ₹1,360.22 Cr | ₹1,639.23 Cr | ₹764.82 Cr |
| Outstanding | ₹40.46 Cr | ₹260.78 Cr | ₹51.2 Cr |
| Advance (raw / net / GST) | ₹223.34 / ₹212.71 / ₹10.64 Cr | ₹46.05 / ₹43.86 / ₹2.19 Cr | ₹135.63 / ₹129.17 / ₹6.46 Cr |
| — of which TLP | ₹950.76 Cr demand | ₹495.86 Cr demand | ₹439.11 Cr demand |
| — of which CLP | ₹226.34 Cr demand | ₹1,366.08 Cr demand | ₹247.52 Cr demand |
| Monthly trend points | 33 | 22 | 14 |

`kpi.all.totalDemandWoTax` always exactly equals `kpi.tlp.totalDemandWoTax + kpi.clp.totalDemandWoTax` (and likewise for received/outstanding) — if it doesn't, the rebuild script has a bug; check for double-counted rows.

**Required Rate / Target Rate (Rate — Target vs Actual chart, "at risk" callout):**

```
Required Rate  = average of ALL months' targetRate for this project in monthlyTargets
                 (this is what "New required rate of X" shows)
Target Rate    = THIS CALENDAR MONTH's own targetRate in monthlyTargets
                 (this is what "against ₹X (Target Rate)" shows — matches the chart tooltip exactly)
AOP TSV        = Total BSP (Sold Value) + (Available Area × current month's Target Rate)
```
Both read straight from `monthlyTargets`, filtered by `projectFilter` and the current month's `label` — same source as the Overview page's Unsold Value calc above, so they always agree with each other.

---

## 4. Milestone Table (all 3 projects, same conventions)

- **Grouping:** by semantic short name (case-insensitive), not raw text — e.g. "On Completion of 40th Floor Slab" and "On Laying of 40th Floor Slab" both become one "40th Floor Slab" row. Per the original doc's "Milestone Table Name Normalization" rule, extended from pure case-insensitivity to include construction-keyword grouping.
- **Amount basis:** `SUM("Installment Amount")` — the **full scheduled plan value**, not "Demand Amount W/O Tax" (which is only what's been billed to date). This is deliberately a different, larger number than the headline Demand KPI — the milestone table's grand total is meant to show the whole remaining payment schedule, billed or not.
- **"Before `<date>`" milestones** (pure fixed calendar date, e.g. "On or Before 15th May 2024") keep their own exact date as a distinct row — never collapsed into one generic "Fixed-Date Installment" bucket regardless of when they're actually due. Date parsing handles ordinal suffixes (1st/2nd/3rd/4th...), multiple month-name formats, hyphenated dates ("14th-Sep-2025"), and non-breaking spaces.
- **"After `<X>` Days/Months of Allotment/Booking" milestones** (relative interval, no construction anchor) — each distinct interval (60 days ≠ 90 days) stays its own row.
- **Tower columns (T-1…T-6):** Edition uses its own T-1…T-6 tower names directly. Sky Arc maps TA→T1, TB→T2, TC→T3, TD→T4, TE→T5, TF→T6 (fixed positional mapping). Trump maps Tower-1→T1, Tower-2→T2; its combined "Tower-1 & 2" bucket contributes to the milestone's `totalCr` but isn't split into a T-column (T3–T6 stay 0 for Trump — the frontend's milestone table hardcodes 6 T-columns regardless of project).
- **Expected dates for not-yet-billed milestones:** filled in from each project's slab/construction schedule file (Edition: `Edition_Slab_Matrix.xlsx`; Sky Arc: `11__Sky_Arc_schedule_-_Update-01_Jul_26_.xlsx`; Trump: `20260702_Trump_Tower_L0.xlsx`), using the **latest tower's** finish date (MAX across towers) for each milestone. Milestones with no explicit date anywhere in the schedule are left blank rather than interpolated or guessed.

**Current milestone table stats (17 Jul 2026):**

| | Edition | Sky Arc | Trump |
|---|---|---|---|
| Milestone rows | 415 | 157 | 41 |
| Grand total (Installment Amount basis) | ₹3,732.29 Cr | ₹4,482.76 Cr | ₹2,279.66 Cr |
| Top milestone | 40th Floor Slab (₹962.47 Cr, Apr 2027) | Excavation Start (₹581.32 Cr, Jul 2025) | OC Application (₹618.88 Cr, Oct 2029) |

---

## 5. Data Quality Notes & Decisions Log

Deliberate decisions and known gaps, so future rebuilds can be checked against the same logic.

1. **Sky Arc's stored data was overstated ~2.3x before 17 Jul 2026.** The live `dashboard_data.json` had all 1,014 Sky Arc PDRN records marked ACTIVE (zero recorded as cancelled), summing to ₹10,097 Cr Sold BSP. Neither the old nor new source Excel supports this figure from any column. Fresh Excel gives 848 ACTIVE + 42 Temporary Surrender + 125 CANCELLED, true Sold BSP ₹4,430.6 Cr. Per instruction, fresh Excel is now the source of truth going forward; the root cause of the original 2x inflation was never fully identified (not a duplicate column, not TCV, not with-tax BSP).

2. **`dapp` array duplication bug (fixed 17 Jul 2026).** `rebuild_overview.py`'s `parse_dapp()` used the raw Excel "Project Name" column text instead of the canonical project key. Sky Arc's column says "Smartworld Sky Arc", Trump's says "Trump Residences Gurgaon" — neither matches the canonical `SMARTWORLD SKY ARC` / `TRUMP RESIDENCES GURGAON` keys used everywhere else, so old mis-cased rows never got replaced by the next run's dedupe filter, and a fresh batch was added every re-run. Found after two runs had already tripled Sky Arc's dapp records (35,863 instead of 11,951) and Trump's (5,755 instead of 1,921). Fixed to always use the canonical key; purged back to exact source counts. This mainly affected the Collections tab's date-filtered totals, not the precomputed `dapp_kpi.json` headline figures.

3. **`CollectionsTab` project-filter refresh bug (fixed 17 Jul 2026).** Its data-fetch `useEffect` had an empty dependency array, so changing the project filter while already on the Demand & Collection page didn't refetch — it only appeared to work when navigating via Overview first, because switching tabs remounts the component. Fixed by adding `filters.project` to the dependency array.

4. **Milestone table Installment Amount vs Demand Amount W/O Tax (fixed 17 Jul 2026, Edition originally, same fix applied to Sky Arc/Trump from the start).** The milestone table must use `"Installment Amount"` (full scheduled value); using `"Demand Amount W/O Tax"` there means every not-yet-billed milestone shows ₹0, which is uninformative and doesn't match the doc's own stated convention.

5. **Trump's `trump_dapp_kpi.json` sat stale for ~3 weeks** (last built 24 Jun, source Excel refreshed 16 Jul) before being caught and rebuilt on 17 Jul 2026. General lesson: refreshing a project's raw Excel does **not** automatically rebuild its `*_dapp_kpi.json` — the relevant script must be run explicitly every time.

6. **Known gaps — no date available, left blank rather than guessed:**
   - Edition: 20th/29th/32nd/34th Floor Slab, Flooring, Finishing Work, Possession.
   - Sky Arc: OC Application, Possession, Super Structure, several Finishing Work variants, a few small stray fixed-date milestones.
   - Trump: several small "Within X Months from Allotment" milestones with no schedule match.

7. **BHK type charts** — the "Type Wise % Sale" chart on the Overview page collapses every project's detailed unit sub-type naming (Edition: "TYPE A- 3BHK...", Sky Arc: "3BHK+UTILITY - TYPE 3", Trump: "4BHK+UTILITY (DX-ODD) TYPE-3") down to plain 2BHK/3BHK/4BHK/5BHK buckets via a `(\d)\s*BHK` regex, consistent across all three. A separate, more detailed sub-type chart (`ChartCardBHK`) elsewhere on the page is untouched and still shows the granular breakdown.

8. **Sales Overview card's Demand/Collected/Outstanding now use PDRN for all 3 projects (18 Jul 2026), separate from the dedicated Demand & Collection page (still DAPP-based):**
   - Demand = SUM(PDRN active rows incl. Temporary Surrender, `"Total Demand Amount"`)
   - Collected = SUM(PDRN active rows incl. Temporary Surrender, `"Total Received"`)
   - Outstanding = SUM per row of `max("Total Demand Amount" - "Total Received", 0)`

   Current values:

   | | Edition | Sky Arc | Trump |
   |---|---|---|---|
   | Demand | ₹1,177.11 Cr | ₹1,863.99 Cr | ₹686.63 Cr |
   | Collected | ₹1,211.48 Cr | ₹1,614.89 Cr | ₹646.23 Cr |
   | Outstanding | ₹34.92 Cr | ₹250.92 Cr | ₹46.06 Cr |

   Note Edition's Collected (₹1,211.48 Cr) exceeds its Demand (₹1,177.11 Cr) - Collection % comes out to 102.9%. This is a real, valid consequence of the formula, not a bug: PDRN's `"Total Received"` includes money collected ahead of a formal DAPP demand being raised (i.e. advance payments), so it can legitimately exceed Demand.

   ⚠️ **This means the Sales Overview card and the dedicated Demand & Collection page (§3 above, still 100% DAPP-based for all 3 projects) intentionally show different Demand/Collected/Outstanding numbers.** This is per instruction, not a bug to silently "fix" back into agreement — if a future request asks to reconcile the two pages, treat that as a real design decision to flag, not an oversight to correct on sight.
   - Never found an exact match for the originally-requested target figure (₹1,860.81 Cr demand for Sky Arc, given to 2 decimal places); the closest PDRN column found was `"Total Demand Amount"` at ₹1,863.99 Cr (off by ₹3.18 Cr) — that's what's live. Sky Arc's raw DAPP file also has 2 genuine exact-duplicate rows (unit TB-2704) not yet cleaned up — irrelevant to this specific change since none of the 3 projects use DAPP for this card anymore, but still worth fixing if DAPP is ever used for Sky Arc totals again.
   - **PDRN refresh (31 Jul 2026):** all 3 Overview-page datasets refreshed from new PDRN exports (`2010_pdrn.XLSX`→Edition 711 rows, `1070_pdrn.XLSX`→Sky Arc 1017 rows, `1072_pdrn.XLSX`→Trump 253 rows). `rebuild_overview.py` was extended to also recompute demandRaisedCr/collectedCr/outstandingCr/collectionPct from PDRN strict-ACTIVE rows (previously it only recomputed BSP/TCV/area/rate and let the demand/collected fields carry stale through the kpiExtra merge). The BSP-derived project-value fields (Edition's totalProjCr/soldPctValue, Sky Arc's soldBSPCr/totalProjCr/totalSalesValueCr/soldPctValue) were also recomputed by hand after the rebuild since they live outside the script. **Only PDRN was refreshed — Sky Arc's booked area/units stay on the old INVR snapshot (Approach 2); refresh INVR too if those need updating.**

---

## 6. Monthly Targets (AOP)

All three projects now have a full 24-month AOP target table (Apr'25–Mar'27) in `dashboard_data.json`'s `monthlyTargets`, keyed by `projectFilter`. Schema: `{month, label, fy, units, areaSqft, tsvCr, targetRate, projectFilter}`.

- Edition and Sky Arc's tables were entered directly from the AOP spreadsheet and matched exactly.
- Trump's old table (23 entries) mixed actual historical bookings mislabeled as "targets" (e.g. May'25 showing 236 units/₹2,506 Cr — essentially all historical sales to date) with a flat dummy placeholder repeated for future months; replaced with the real 24-month table.

A 52-unit/₹309 Cr (Sky Arc) or 76-unit/₹949 Cr (Trump) or 336-unit/₹2,388 Cr (Edition) "carry-over to FY28" figure exists per project but isn't stored as a monthly row (same convention across all three).

---

## 7. Chart-specific fixes (not KPI formula changes, but affect what's displayed)

- **Area — Target vs Achieved chart:** bar/label values were being rounded to whole numbers via `Math.round()`, making small values (e.g. 0.15 L sqft) display as "0". Fixed to show the actual computed value.
- **TSV — Target vs Achieved chart:** the "Adjusted" projection line was removed per instruction (Units and Area charts keep theirs).
- **Rate — Target vs Actual chart:** the Target Rate (navy) line had a gap for the current quarter (was waiting on a "projection" line that's never actually rendered in this specific chart); fixed to render continuously from the current month.
- **Expected Collection per Month chart:** was rendering every month at once with no windowing, causing labels to overlap; added the same 14-month scrollable window + prev/next buttons used elsewhere.
- **Milestone table:** was rendering all rows with no height limit (400+ for Edition); added a 480px scrollable container with a sticky header.
- **Builtup Area (Project Snapshot bar):** was showing a raw comma-formatted sqft string; converted to "X.XX Lakh sq ft" to match the Saleable Area field's format.
- **Outstanding by Month chart added to the Demand & Collection page (20 Jul 2026, all 3 projects):** a new `outstanding` field was added to `monthlyTrend` (SUM of "Outstanding 1" for rows billed in that month — verified to reconcile exactly with `kpi.all.totalOutstanding` for all 3 projects), feeding a chart with one bar per month, only for months with `outstanding > 0`, showing how much of that month's billed demand is still unpaid today. (A companion "This Financial Year — Demand vs Received" chart was added in the same pass and then removed per instruction shortly after.)
- **"Achieved (this filter)" summary badge added (17 Jul 2026):** a teal pill above each of the 4 trend charts shows the total Achieved figure for whatever FY/Quarter/Month filter is currently active — computed from the full filtered dataset, not just the visible scroll window. Units/TSV/Area show a **sum**; the Rate chart shows an **average** (rates aren't additive, so summing them would be meaningless).
  - Fixed 18 Jul 2026: the badges were summing already-rounded per-month display values, causing small drift from the true total (e.g. Sky Arc's TSV badge showed ₹4,430.4 Cr instead of ₹4,430.6 Cr). Now computed from raw unrounded PDRN data.
  - Fixed 18 Jul 2026: when no FY/Quarter/Month filter is active, Units/TSV/Area badges now read the exact same values as the Sales Overview KPI cards (`kpiEx.bookedUnits`/`totalBSPCr`/`bookedAreaSqft` — INVR-based for Sky Arc's Units/Area per Approach 2, PDRN-based for BSP everywhere), so the default view matches perfectly for all 3 projects. Only when a date filter **is** active do the badges fall back to summing PDRN's own booking-date-tagged records directly — unavoidable since INVR is a snapshot with no per-booking date to filter by. In that filtered case only, Sky Arc's Units/Area badge can still show a small difference from the (always-unfiltered) KPI card — an inherent data limitation from Sky Arc's PDRN having a few extra historical rebooking rows beyond its physical INVR unit count, not a bug to chase further.
  - Fixed 18 Jul 2026: the Rate chart badge was a simple mean of each month's own average rate (equal weight regardless of booking volume that month), which diverges from the card's properly area-weighted `Total BSP / Total Booked Area` whenever booking volume varies month to month (e.g. Edition showed ₹18,844/sqft on the badge vs ₹17,811/sqft on the card). Now uses the same area-weighted calculation and matches `kpiEx.avgRatePerSqft` exactly when no date filter is active, same pattern as the other three badges.

10. **Hybrid milestone resolution is now per-unit, not a blanket assumption (20 Jul 2026, all 3 projects).** For any "X or Y, whichever is earlier/later" milestone (e.g. "On Completion of 40th Floor Slab / 36th Months of Booking, whichever is earlier"), every previous build simply classified the whole group as CLP under the construction event's name, ignoring the comparison the milestone text actually describes. Now, **per DAPP row**:
   - Time-based date = that row's own `"SFDC Booking date"` or `"Allotment Date"` (whichever the text refers to) + the stated interval — or a literal fixed date, when the text gives one instead of a relative interval.
   - Construction date = the project-wide schedule-file date for that event (same for every unit — schedule dates aren't tracked per-tower).
   - Whichever side actually wins the earlier/later comparison becomes **both** that row's expected date **and** its CLP/TLP classification — a unit booked early might resolve to "After 36 Months of Booking" (TLP), while a unit booked late resolves to "40th Floor Slab" (CLP), for the exact same milestone text.
   - Found and fixed a real bug during this: a "Which ever is earlier" typo (space instead of one word) in ~7 Trump rows bypassed hybrid detection entirely, producing a nonsensical Nov 2030 expected date for OC Application (real schedule date: Oct 2029). Now normalized before the whichever check.
   - Headline `kpi.all` totals are unaffected (reclassification only); the TLP/CLP split shifted meaningfully, most dramatically for Sky Arc since its dominant milestone pattern is this exact hybrid form across ~805 rows per construction event (TLP: ₹495.86 Cr → ₹1,481.47 Cr; CLP: ₹1,366.08 Cr → ₹380.47 Cr).

11. **"Expected Collection per Month" / "Milestone-wise Expected Collection" rebuilt to be genuinely forward-looking (20 Jul 2026, all 3 projects).** Previously this table/chart included already-resolved historical billing (entries as far back as Nov'23), which isn't "expected" anything — it already happened. Now:
   - Already-billed milestone rows (`Demand Amount W/O Tax > 0`) are excluded entirely from this table — that money is already reflected in the headline Demand/Received/Outstanding KPIs.
   - A single **"Overdue / Outstanding Payments"** entry, valued at exactly `kpi.all.totalOutstanding`, is added to the current month — unpaid already-billed money is expected to be collected now, not stuck showing at its original (past) due date.
   - Each unit's own advance (money collected but not yet billed against anything, per §3 above) is applied **FIFO against that same unit's own future milestones**, in chronological order — a unit's advance can only offset its own next bill, never another unit's.
   - Any not-yet-billed milestone whose estimated date has already passed is clamped up to the current month, rather than left showing in a stale past month.
   - Verified for all 3 projects: zero milestone-table entries with an expected date before the current month, and the Overdue entry exactly equals `kpi.all.totalOutstanding` in every case.

12. **Sky Arc's Total Sales Value card now uses strictly `Booking Status == "ACTIVE"` (20 Jul 2026), excluding Temporary Surrender.** Sky Arc's PDRN Booking Status column (column E) has 3 distinct values: ACTIVE (848 rows), TEMPORARY SURRENDER (42 rows), CANCELLED (125 rows) — Edition and Trump only ever have ACTIVE/CANCELLED/blank, no equivalent third status. The existing classification bundled Temporary Surrender in with ACTIVE for tower/inventory counting purposes; per instruction, the Total Sales Value card's Sold/Unsold/Demand Raised/Collected/Outstanding now come from strictly-ACTIVE rows only. Scope is intentionally narrow: **Booked Area, Avg Rate (area component), and Total Units were not touched** — those correctly stay INVR-based per Sky Arc's "Approach 2" methodology (a separate, deliberate decision from an earlier session), and Sky Arc's INVR data doesn't distinguish Temporary Surrender at all, so no equivalent adjustment applies there. A new `bookingStatusRaw` field (preserves the exact original Booking Status text) was added to PDRN parsing in both `rebuild_overview.py` and `rebuild_edition_json.py`, and the frontend's `pA`/`pAAll` filters now require it to be strictly `'ACTIVE'` — a no-op for Edition/Trump, but correctly excludes Sky Arc's Temporary Surrender rows from PDRN-derived live calculations (this also affects the Achieved-summary badges on the trend charts, for consistency).

13. **Sky Arc's BSP column was wrong: "Total Basic Selling Price," not "Total BSP Net Value" (20 Jul 2026, Sky Arc only).** After item 12 above still didn't reconcile against a user-provided reference figure, and a fresh `skyarc_pdrn.XLSX` was uploaded, careful column-by-column checking found the actual root cause: Sky Arc's correct BSP source is **`"Total Basic Selling Price"`**, a genuinely different column from `"Total BSP Net Value"` (which remains correct for Edition and Trump — verified their existing figures independently unchanged). Confirmed via an **exact match (diff = 0.00)** against the reference value. Also: the fresh PDRN file has no Temporary Surrender rows at all anymore (all resolved to ACTIVE or CANCELLED; new split 888 ACTIVE / 127 CANCELLED) — item 12's exclusion logic still applies and is now effectively a no-op for Sky Arc too, until/unless Temporary Surrender reappears in a future refresh.
   - `rebuild_overview.py`'s `PROJECTS` config now has a per-project `bspCol` override (defaults to `"Total BSP Net Value"`; Sky Arc set to `"Total Basic Selling Price"`) so this is scoped to Sky Arc only, not a global column change.
   - Current Sky Arc figures (888 strictly-ACTIVE rows): Total BSP ₹4,439.8 Cr, Total Project Value ₹4,778.75 Cr, Demand Raised ₹1,860.81 Cr, Collected ₹1,612.62 Cr, Outstanding ₹250.01 Cr, Avg Rate ₹18,460/sqft (Area unchanged, still INVR-based).
- **Chart Range slider + Booking Date filter removed (17 Jul 2026):** the top-level "Chart Range" (Nov'23→Mar'27) slider above the 2x2 trend chart grid, and the "Booking Date" (dd-mm-yyyy – dd-mm-yyyy) filter in the filter strip, were both removed per instruction. The 4 trend charts' own individual per-chart scrollers are unaffected.
- **Month/Quarter toggle added (17 Jul 2026):** a single toggle next to the "Tower Wise Sales" switch controls all 4 trend charts (Units/TSV/Area/Rate) together, switching between monthly bars and quarter-aggregated bars. This wires up state (`uMode`/`tsvMode`/`rMode`/`suMode`, now unified into one `chartGranularity` value) and a `toQuarterly()` helper that already existed in the code but had no UI trigger before. Selecting Quarter mode clears and locks (greys out, lock icon) the Month filter, since filtering to one specific month while viewing quarter-aggregated bars doesn't make sense; FY and Quarter filters remain usable in both modes. Switching back to Month re-enables the Month filter immediately.
  - Fixed two bugs found immediately after shipping this: (1) leftover Chart-Range-slider filter logic was silently filtering out every row in Quarter mode (its date parser only recognizes month labels, not quarter labels), making all 4 charts render blank; (2) quarters were grouped by calendar year (Jan-Mar/Apr-Jun/Jul-Sep/Oct-Dec), so one fiscal year's data displayed as "Q2'25, Q3'25, Q4'25, Q1'26" - crossing two year labels. `toQuarterly()` now uses the same fiscal-year convention as the `FY_QUARTERS` filter elsewhere (Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar), so all 4 quarters of one FY share one year label (Q1'26...Q4'26 for Apr'25-Mar'26).

---

## 8. Things to check whenever you touch this dashboard

1. If you refresh a project's PDRN/INVR files → re-run that project's Overview rebuild (`rebuild_overview.py` for Sky Arc/Trump, or `rebuild_edition_json.py` for Edition-only), then re-run that project's `*_dapp_kpi.py` if you also refreshed DAPP.
2. After running `rebuild_overview.py`, verify the other two projects' `kpiExtra`/`towerData`/`cancelledUnitStatus` are byte-identical to before (it processes all 3 projects at once) — a change there when you only meant to touch one project is a red flag.
3. Check `kpi.all.totalDemandWoTax == kpi.tlp.X + kpi.clp.X` (and received/outstanding) after any `*_dapp_kpi.py` run — if it doesn't reconcile exactly, something is being double-counted or dropped.
4. Confirm milestone grand total ≠ headline Demand KPI (that gap is expected — see §4) but is in a sane ballpark relative to Total BSP.
5. Update this document.
