#!/usr/bin/env python3
"""Wipe OKR data and seed demo data of a fictional pharma company.

Company: Vitalis Therapeutics (entirely fictional).

What is wiped (FK-safe order):
    kr_snapshots, initiatives, key_results, objectives, cycles, teams, managers

What is preserved: users, settings, _meta_columns.

Idempotent: re-running resets the database to the same deterministic dataset
(all UUIDs are uuid5-derived, no randomness).
"""
import argparse
import sqlite3
import sys
import uuid
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "okr.db"

NS = uuid.UUID("7f3d9c1a-2b4e-4d6f-8a10-5c9e2b7d1f04")


def uid(kind, key):
    return str(uuid.uuid5(NS, f"{kind}:{key}"))


# ── Snapshot timeline (weekly points across the Q3 cycle) ────────────────────
WEEKS = [
    "2026-07-01", "2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27",
    "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-22",
]

# Progress-fraction shapes for chartable KRs (each ends at 1.0 = current value)
SHAPES = {
    "linear":  (0.00, 0.15, 0.30, 0.45, 0.60, 0.72, 0.85, 0.94, 1.00),
    "fast":    (0.00, 0.25, 0.45, 0.60, 0.70, 0.78, 0.85, 0.93, 1.00),
    "plateau": (0.00, 0.50, 0.80, 0.90, 0.92, 0.93, 0.94, 0.95, 1.00),
    "dip":     (0.00, 0.30, 0.50, 0.40, 0.55, 0.70, 0.85, 0.95, 1.00),
    "late":    (0.00, 0.05, 0.10, 0.20, 0.35, 0.50, 0.65, 0.85, 1.00),
}

DEFAULT_LU = "2026-08-22 09:30:00"
STALE_LU = "2026-08-03 16:45:00"

# ── Reference data ────────────────────────────────────────────────────────────

TEAMS = {
    "clinical": "Clinical Development",
    "regulatory": "Regulatory Affairs",
    "commercial": "Commercial and Market Access",
    "manufacturing": "Manufacturing and Supply Chain",
    "quality": "Quality Assurance",
    "research": "Research and Discovery",
    "medical": "Medical Affairs",
}

MANAGERS = {
    "marsh": "Dr. Elena Marsh",
    "whitfield": "James Whitfield",
    "nair": "Dr. Priya Nair",
    "callahan": "Robert Callahan",
    "lindqvist": "Dr. Sofia Lindqvist",
    "chen": "Michael Chen",
    "okafor": "Dr. Amara Okafor",
    "reilly": "Thomas Reilly",
}

CYCLES = [
    # key, name, status, start, end, created_at
    ("q2", "Q2 2026", "completed", "2026-04-01", "2026-06-30", "2026-03-20 10:00:00"),
    ("q3", "Q3 2026", "in_progress", "2026-07-01", "2026-09-30", "2026-06-18 10:00:00"),
    ("q4", "Q4 2026", "draft", "2026-10-01", "2026-12-31", "2026-08-10 11:00:00"),
]

WIKI = "https://wiki.vitalis.example"

# ── Objective tree definition ─────────────────────────────────────────────────
# Objective: {name, team, mgr, doc, krs: [...], inits: [...], children: [...]}
# KR: {name, init, curr, tgt, unit, source, conf, doc, desc, shape, series, lu}
# Initiative: {name, what, impact, doc, status}


def kr(name, init, curr, tgt, unit="", source="manual", conf="medium",
       doc="", desc="", shape=None, series=None, lu=None):
    return dict(name=name, init=init, curr=curr, tgt=tgt, unit=unit,
                source=source, conf=conf, doc=doc, desc=desc,
                shape=shape, series=series, lu=lu)


def initv(name, what="", impact="", doc="", status="backlog"):
    return dict(name=name, what=what, impact=impact, doc=doc, status=status)


Q3_TREE = dict(
    name="Vitalis Therapeutics Company OKR",
    team=None, mgr="marsh", doc=f"{WIKI}/company-okr",
    krs=[
        kr("Corporate revenue growth vs. plan", 0, 118, 115, "%",
           source="api", conf="high", desc="Aggregated from the finance data warehouse nightly."),
        kr("Company OKRs on track", 0, 62, 80, "%", conf="medium",
           doc=f"{WIKI}/okr/health", desc="Share of key results at 70%+ progress."),
    ],
    children=[
        # ── Goal 1: launch ────────────────────────────────────────────────
        dict(
            name="Successfully launch Cardiovex in the US and EU",
            team="commercial", mgr="whitfield", doc=f"{WIKI}/cardiovex/launch-plan",
            krs=[
                kr("Cardiovex net revenue in launch markets", 0, 35, 30, "$M",
                   conf="high", shape="fast",
                   desc="Net sales across US, DE, FR, GB, IT, ES."),
                kr("Unique prescribers writing Cardiovex", 1200, 4200, 5000, "physicians",
                   source="api", conf="medium", shape="linear"),
                kr("Share of voice vs. class leaders", 8, 21, 25, "%",
                   conf="medium", shape="late"),
            ],
            inits=[
                initv("Cardiovex global launch playbook",
                      "Codify the launch sequence across markets, roles and materials.",
                      "Single source of truth for every launch workstream.",
                      f"{WIKI}/cardiovex/playbook", "completed"),
                initv("Launch war-room (weekly)",
                      "Cross-functional cadence tracking the top-10 launch risks.",
                      "Faster escalation and resolution of launch blockers.",
                      "", "in_progress"),
                initv("KOL advisory board series",
                      "Six advisory boards with top-tier cardiologists in the US and EU.",
                      "Peer advocacy fueling early prescriptions.",
                      "", "completed"),
            ],
            children=[
                dict(
                    name="Secure FDA and EMA approvals",
                    team="regulatory", mgr="nair", doc=f"{WIKI}/reg/cardiovex",
                    krs=[
                        kr("FDA approval milestone", 0, 1, 1, "approval",
                           conf="high", doc=f"{WIKI}/reg/fda-approval"),
                        kr("EMA CHMP positive opinion", 0, 0.8, 1, "approval",
                           conf="medium", desc="Day-180 list of outstanding issues received."),
                        kr("Aligned US/EU product labelling", 0, 3, 3, "dossiers",
                           conf="high"),
                    ],
                    inits=[
                        initv("Pre-submission FDA meeting", "", "", "", "completed"),
                        initv("EMA rolling submission",
                              "Submit MAA modules as they are finalised.",
                              "Compresses approval timeline by ~6 weeks.", "", "in_progress"),
                        initv("Labelling negotiations with health authorities", "", "",
                              "", "in_progress"),
                    ],
                ),
                dict(
                    name="Build payer access and reimbursement",
                    team="commercial", mgr="callahan",
                    krs=[
                        kr("Covered lives under top-10 US payers", 5, 9, 40, "%",
                           conf="low", shape="linear",
                           desc="Tier 1/2 coverage weighted by covered lives."),
                        kr("EU5 countries with pricing decisions", 0, 6, 12, "countries",
                           conf="low", shape="dip"),
                        kr("Negotiated payer contracts", 3, 9, 25, "payers",
                           conf="low", shape="dip", lu=STALE_LU),
                    ],
                    inits=[
                        initv("Value dossier and HEOR evidence package",
                              "Assemble the global value dossier with budget-impact models.",
                              "Strengthens payer negotiations in all markets.",
                              f"{WIKI}/heor/dossier", "completed"),
                        initv("Payer advisory panels (US/EU)", "", "", "", "completed"),
                        initv("Risk-share agreements with national payers", "", "",
                              "", "in_progress"),
                        initv("EU country-by-country price negotiations", "", "",
                              "", "in_progress"),
                    ],
                ),
                dict(
                    name="Equip the field force for launch",
                    team="commercial", mgr="callahan",
                    krs=[
                        kr("Reps certified on Cardiovex", 0, 185, 200, "reps",
                           conf="medium", shape="plateau"),
                        kr("Target HCP segments mapped in CRM", 0, 100, 100, "%",
                           source="api", conf="high", shape="fast"),
                        kr("Territory launch kits shipped", 0, 42, 45, "territories",
                           conf="high"),
                    ],
                    inits=[
                        initv("Sales force training curriculum", "", "", "", "completed"),
                        initv("CRM targeting and segmentation upgrade", "", "",
                              f"{WIKI}/crm/segments", "completed"),
                        initv("Launch incentive program",
                              "Quarterly bonus scheme tied to territory scripts.",
                              "Scrapped: budget reallocated to payer negotiations.",
                              "", "cancelled"),
                    ],
                ),
                dict(
                    name="Drive early adoption in cardiology",
                    team="medical", mgr="okafor",
                    krs=[
                        kr("Weekly cardiology scripts", 0, 1180, 1000, "scripts/wk",
                           source="api", conf="high", shape="fast",
                           desc="Overachieving: volume already exceeds the launch target."),
                        kr("New prescribing accounts", 0, 670, 1000, "accounts",
                           source="api", conf="medium", shape="linear"),
                        kr("MSL scientific exchanges delivered", 40, 310, 350, "exchanges",
                           conf="medium", shape="linear"),
                        kr("Advisory boards with cardiology societies", 0, 3, 4, "events",
                           conf="medium"),
                    ],
                    inits=[
                        initv("Cardiovascular congress presence (ESC/AHA)", "", "",
                              "", "in_progress"),
                        initv("Peer-to-peer speaker program", "", "", "", "in_progress"),
                        initv("Early-experience registry (500 patients)", "", "",
                              "", "in_progress"),
                        initv("Digital HCP engagement pilot", "", "", "", "backlog"),
                    ],
                ),
            ],
        ),
        # ── Goal 2: R&D pipeline ──────────────────────────────────────────
        dict(
            name="Advance the next-generation R&D pipeline",
            team="research", mgr="lindqvist", doc=f"{WIKI}/rd/pipeline",
            krs=[
                kr("Pipeline value (NPV) added this cycle", 0, 1.8, 2.5, "$B",
                   conf="medium", shape="linear"),
                kr("Late-stage assets advancing on schedule", 0, 3, 4, "assets",
                   conf="low"),
            ],
            inits=[
                initv("Quarterly portfolio review board", "", "", "", "in_progress"),
                initv("External innovation scouting",
                      "Systematic biotech partnership pipeline.", "", "", "in_progress"),
            ],
            children=[
                dict(
                    name="Deliver a clean Phase III readout for ALX-204",
                    team="clinical", mgr="chen", doc=f"{WIKI}/trials/alx204",
                    krs=[
                        kr("Patients dosed in ALX-204 pivotal study", 800, 1370, 1400,
                           "patients", source="api", conf="medium", shape="linear",
                           desc="EDC feed from the clinical data platform."),
                        kr("Sites activated across North America and EU", 120, 158, 160,
                           "sites", conf="medium", shape="plateau"),
                        kr("Critical data queries open over 30 days", 48, 22, 15,
                           "queries", source="api", conf="low", shape="dip"),
                        kr("Independent DSMB review cycles passed", 0, 3, 3, "reviews",
                           conf="high"),
                    ],
                    inits=[
                        initv("ALX-204 blinded data review committee", "", "",
                              "", "in_progress"),
                        initv("Site performance remediation plan", "", "",
                              "", "completed"),
                        initv("Statistical analysis plan pre-specification", "", "",
                              "", "completed"),
                    ],
                ),
                dict(
                    name="Complete Phase II enrollment for VT-388",
                    team="clinical", mgr="lindqvist",
                    krs=[
                        kr("Patients randomized in VT-388 Phase II", 0, 416, 400,
                           "patients", source="api", conf="high", shape="fast",
                           desc="Enrollment closed ahead of schedule; cohort overfilled."),
                        kr("Screen-fail rate", 38, 19, 20, "%",
                           source="api", conf="high", shape="linear"),
                        kr("Enrollment sites in emerging markets", 0, 24, 30, "sites",
                           conf="medium", shape="linear"),
                    ],
                    inits=[
                        initv("Decentralized trial elements (e-consent, home nursing)",
                              "", "", "", "in_progress"),
                        initv("Patient advocacy recruitment partnership", "", "",
                              "", "completed"),
                    ],
                ),
                dict(
                    name="Replenish the early-discovery portfolio",
                    team="research", mgr="lindqvist",
                    krs=[
                        kr("New drug discovery programs initiated", 0, 2, 6, "programs",
                           conf="low", lu=STALE_LU),
                        kr("Indications licensed in", 0, 1, 3, "licenses",
                           conf="low", lu=STALE_LU),
                        kr("Hit-to-lead campaigns completed", 0, 3, 8, "campaigns",
                           conf="medium"),
                    ],
                    inits=[
                        initv("AI-assisted target identification platform", "", "",
                              f"{WIKI}/rd/ai-targets", "in_progress"),
                        initv("In-licensing deal flow with CROs", "", "", "", "backlog"),
                        initv("Repurposing screen for legacy assets", "", "", "", "backlog"),
                    ],
                ),
                dict(
                    name="Cut clinical trial cycle times",
                    team="clinical", mgr="chen",
                    krs=[
                        kr("Median study startup time", 42, 35, 28, "days",
                           source="api", conf="medium", shape="linear"),
                        kr("Median database lock time", 51, 38, 25, "days",
                           conf="medium", shape="late"),
                        kr("First-patient-in after greenlight", 118, 96, 70, "days",
                           source="api", conf="low", shape="linear"),
                    ],
                    inits=[
                        initv("Country submission parallelization", "", "",
                              "", "in_progress"),
                        initv("eTMF automation rollout", "", "", "", "in_progress"),
                    ],
                ),
                dict(
                    # Deliberately has NO key results (empty-KR state)
                    name="Expand translational medicine capabilities",
                    team="research", mgr="lindqvist",
                    krs=[],
                    inits=[
                        initv("Biomarker lab expansion (Boston hub)", "", "",
                              "", "in_progress"),
                        initv("Companion diagnostic partnership", "", "", "", "backlog"),
                    ],
                ),
            ],
        ),
        # ── Goal 3: operations ────────────────────────────────────────────
        dict(
            name="Achieve operational excellence in manufacturing and quality",
            team="manufacturing", mgr="reilly", doc=f"{WIKI}/ops/excellence",
            krs=[
                kr("Right-first-time batch releases", 71, 82, 90, "%",
                   conf="medium", shape="linear"),
                kr("Cost of quality as share of revenue", 12.5, 9.8, 8, "%",
                   conf="low", shape="late"),
            ],
            inits=[
                initv("Site excellence program kickoff", "", "", "", "in_progress"),
            ],
            children=[
                dict(
                    name="Zero critical findings in regulatory inspections",
                    team="quality", mgr="reilly",
                    krs=[
                        kr("FDA pre-approval inspection passed", 0, 1, 1, "inspection",
                           conf="high", doc=f"{WIKI}/quality/fda-pai"),
                        kr("EMA GMP audit at Dublin site", 0, 0, 1, "audit",
                           conf="medium", desc="Scheduled for the last week of September."),
                        kr("Critical and major observations (all inspections)", 6, 2, 0,
                           "findings", source="api", conf="low"),
                    ],
                    inits=[
                        initv("Mock inspection readiness program", "", "",
                              "", "completed"),
                        initv("CAPA effectiveness checks automation", "", "",
                              "", "in_progress"),
                    ],
                ),
                dict(
                    name="Scale up the Dublin biologics site",
                    team="manufacturing", mgr="reilly",
                    krs=[
                        kr("Tech transfer batches at commercial scale", 0, 5, 9, "batches",
                           conf="medium", shape="linear"),
                        kr("Batch yield at Dublin", 55, 68, 75, "%",
                           source="api", conf="medium", shape="linear"),
                        kr("Operators trained and certified", 0, 124, 150, "FTE",
                           conf="high", shape="plateau"),
                    ],
                    inits=[
                        initv("Single-use bioreactor conversion", "", "",
                              f"{WIKI}/dublin/sub", "in_progress"),
                        initv("Serialization line 3 commissioning", "", "",
                              "", "in_progress"),
                        initv("Dublin site ISO 50001 energy audit", "", "",
                              "", "completed"),
                        initv("Legacy ERP integration",
                              "Hook the site ERP into the corporate quality system.",
                              "Deferred to the 2027 IT roadmap.", "", "cancelled"),
                    ],
                ),
                dict(
                    name="Digitise quality management",
                    team="quality", mgr="chen",
                    krs=[
                        kr("LIMS rollout across labs", 20, 55, 100, "%",
                           conf="medium", shape="linear"),
                        kr("Paper records eliminated", 0, 38, 70, "%",
                           conf="medium", shape="linear"),
                        kr("Regulatory intelligence briefs published", 0, 12, 0, "briefs",
                           conf="medium",
                           desc="Qualitative KR tracked without a numeric target (shows N/A)."),
                    ],
                    inits=[
                        initv("LIMS vendor selection and rollout waves", "", "",
                              "", "in_progress"),
                        initv("QMS migration to cloud", "", "", "", "backlog"),
                    ],
                ),
                dict(
                    name="Improve supply reliability",
                    team="manufacturing", mgr="reilly",
                    krs=[
                        kr("Out-of-stock incidents at wholesalers", 9, 4, 1, "incidents",
                           source="api", conf="low", shape="dip"),
                        kr("OOS batches", 850, 520, 300, "ppm",
                           source="api", conf="medium", shape="linear"),
                        kr("Median batch release time", 18, 14, 10, "days",
                           source="api", conf="medium", shape="linear"),
                    ],
                    inits=[
                        initv("Demand sensing ML pilot", "", "", "", "in_progress"),
                        initv("Dual sourcing for 5 critical raw materials", "", "",
                              "", "completed"),
                        initv("Finished-goods safety stock redesign", "", "",
                              "", "completed"),
                        initv("Supplier audit cadence uplift", "", "",
                              "", "in_progress"),
                    ],
                ),
            ],
        ),
    ],
)

Q2_TREE = dict(
    name="Vitalis Therapeutics Company OKR",
    team=None, mgr="marsh", doc=f"{WIKI}/company-okr",
    krs=[],
    children=[
        dict(
            name="Complete ALX-204 submission groundwork",
            team="clinical", mgr="chen", doc=f"{WIKI}/trials/alx204/q2",
            krs=[
                kr("Patients dosed by end of Q2", 0, 800, 800, "patients",
                   source="api", conf="high",
                   series=[("2026-04-01", 0), ("2026-05-01", 310),
                           ("2026-06-01", 610), ("2026-06-30", 800)]),
                kr("FDA IND amendments submitted on time", 0, 12, 12, "submissions",
                   conf="high",
                   series=[("2026-04-01", 0), ("2026-05-01", 4),
                           ("2026-06-01", 8), ("2026-06-30", 12)]),
                kr("VT-388 healthy-volunteer study closed", 0, 1, 1, "study",
                   conf="high",
                   series=[("2026-04-01", 0), ("2026-05-01", 0),
                           ("2026-06-01", 0), ("2026-06-30", 1)]),
            ],
            inits=[
                initv("VT-388 SAD/MAD study report", "", "", "", "completed"),
                initv("ALX-204 site activation sprint", "", "", "", "completed"),
            ],
        ),
    ],
)

Q4_TREE = dict(
    name="Vitalis Therapeutics Company OKR",
    team=None, mgr="marsh", doc=f"{WIKI}/company-okr",
    krs=[],
    children=[
        dict(
            name="Prepare the 2027 strategic portfolio",
            team="research", mgr="marsh",
            krs=[
                kr("2027 portfolio scenarios built", 0, 0, 3, "scenarios",
                   conf="medium", lu="2026-08-10 11:20:00"),
                kr("Late-stage assets in the 2027 plan", 0, 0, 5, "assets",
                   conf="medium", lu="2026-08-10 11:20:00"),
                kr("Board-approved R&D budget", 0, 0, 1, "approval",
                   conf="high", lu="2026-08-10 11:20:00"),
            ],
            inits=[
                initv("Long-range planning workshops", "", "", "", "backlog"),
                initv("Therapeutic area deep-dives", "", "", "", "backlog"),
                initv("Competitor landscape 2027+", "", "", "", "backlog"),
            ],
        ),
    ],
)

TREES = {"q2": Q2_TREE, "q3": Q3_TREE, "q4": Q4_TREE}


# ── Snapshot series generation ────────────────────────────────────────────────

def _round_like(k, v):
    ints = (float(k["init"]).is_integer() and float(k["curr"]).is_integer()
            and float(k["tgt"]).is_integer())
    return int(round(v)) if ints else round(v, 1)


def kr_snapshots(k, cycle_key):
    """Return [(recorded_at, value)] for a KR definition."""
    src = k["source"]
    if k.get("series"):
        return [(f"{d} 10:00:00", v) for d, v in k["series"]]
    if k.get("shape") and cycle_key == "q3":
        shape = SHAPES[k["shape"]]
        pts = []
        for d, w in zip(WEEKS, shape):
            v = k["init"] + (k["curr"] - k["init"]) * w
            pts.append((f"{d} 10:00:00", _round_like(k, v)))
        pts[-1] = (pts[-1][0], _round_like(k, k["curr"]))
        return pts
    # Fallback: initial point + current point
    if cycle_key == "q3":
        return [(f"{WEEKS[0]} 10:00:00", _round_like(k, k["init"])),
                (f"{WEEKS[-1]} 10:00:00", _round_like(k, k["curr"]))]
    if cycle_key == "q2":
        return [(f"2026-04-01 10:00:00", _round_like(k, k["init"])),
                ("2026-06-30 10:00:00", _round_like(k, k["curr"]))]
    return [("2026-08-10 11:20:00", _round_like(k, k["curr"]))]


def kr_last_updated(k, cycle_key):
    if k.get("lu"):
        return k["lu"]
    if cycle_key == "q2":
        return "2026-06-30 17:00:00"
    return DEFAULT_LU


# ── Seeding ───────────────────────────────────────────────────────────────────

def wipe(db):
    for table in ("kr_snapshots", "initiatives", "key_results", "objectives",
                  "cycles", "teams", "managers"):
        db.execute(f"DELETE FROM {table}")


def seed_reference(db):
    for key, name in TEAMS.items():
        db.execute("INSERT INTO teams (id, name) VALUES (?, ?)", (uid("team", key), name))
    for key, name in MANAGERS.items():
        db.execute("INSERT INTO managers (id, name) VALUES (?, ?)",
                   (uid("manager", key), name))
    cycle_ids = {}
    for key, name, status, start, end, created in CYCLES:
        cid = uid("cycle", key)
        cycle_ids[key] = cid
        db.execute(
            "INSERT INTO cycles (id, name, status, start_date, end_date, cycle_length, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (cid, name, status, start, end, "quarter", created))
    return cycle_ids


def seed_objective(db, node, cycle_key, cycle_id, parent_id, position, path):
    oid = uid("obj", f"{cycle_key}/{path}")
    db.execute(
        "INSERT INTO objectives (id, name, parent_id, team_id, manager_id, doc_link, position, cycle_id) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (oid, node["name"], parent_id,
         uid("team", node["team"]) if node.get("team") else None,
         uid("manager", node["mgr"]) if node.get("mgr") else None,
         node.get("doc", "") or "", position,
         cycle_id if parent_id is None else None))

    for pos, k in enumerate(node.get("krs", [])):
        kid = uid("kr", f"{cycle_key}/{path}/{pos}")
        db.execute(
            "INSERT INTO key_results (id, objective_id, name, target_value, current_value, "
            "initial_value, unit, source, doc_link, description, position, confidence, last_updated) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (kid, oid, k["name"], k["tgt"], k["curr"], k["init"], k["unit"],
             k["source"], k.get("doc", "") or "", k.get("desc", "") or "",
             pos, k["conf"], kr_last_updated(k, cycle_key)))
        for i, (recorded_at, value) in enumerate(kr_snapshots(k, cycle_key)):
            db.execute(
                "INSERT INTO kr_snapshots (id, kr_id, value, recorded_at, source) "
                "VALUES (?,?,?,?,?)",
                (uid("snap", f"{kid}/{i}"), kid, value, recorded_at, k["source"]))

    for pos, iv in enumerate(node.get("inits", [])):
        db.execute(
            "INSERT INTO initiatives (id, objective_id, name, what, impact, doc_link, position, status) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (uid("initv", f"{cycle_key}/{path}/{pos}"), oid, iv["name"], iv["what"],
             iv["impact"], iv["doc"], pos, iv["status"]))

    for pos, child in enumerate(node.get("children", [])):
        seed_objective(db, child, cycle_key, cycle_id, oid, pos, f"{path}/{pos}")


# ── Verification ──────────────────────────────────────────────────────────────

def verify(db):
    errors = []

    def check(cond, msg):
        if not cond:
            errors.append(msg)

    counts = {}
    for t in ("teams", "managers", "cycles", "objectives", "key_results",
              "initiatives", "kr_snapshots"):
        counts[t] = db.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]

    # FK integrity
    check(db.execute(
        "SELECT COUNT(*) FROM key_results WHERE objective_id NOT IN (SELECT id FROM objectives)"
    ).fetchone()[0] == 0, "orphan key_results")
    check(db.execute(
        "SELECT COUNT(*) FROM initiatives WHERE objective_id NOT IN (SELECT id FROM objectives)"
    ).fetchone()[0] == 0, "orphan initiatives")
    check(db.execute(
        "SELECT COUNT(*) FROM kr_snapshots WHERE kr_id NOT IN (SELECT id FROM key_results)"
    ).fetchone()[0] == 0, "orphan kr_snapshots")
    check(db.execute(
        "SELECT COUNT(*) FROM objectives WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM objectives)"
    ).fetchone()[0] == 0, "orphan objectives (parent)")
    check(db.execute(
        "SELECT COUNT(*) FROM objectives WHERE parent_id IS NULL AND cycle_id IS NULL"
    ).fetchone()[0] == 0, "root objective without cycle")

    # Exactly one in_progress cycle
    check(db.execute(
        "SELECT COUNT(*) FROM cycles WHERE status='in_progress'").fetchone()[0] == 1,
        "must be exactly one in_progress cycle")

    # Exactly one root per cycle
    for row in db.execute(
            "SELECT cycle_id, COUNT(*) FROM objectives WHERE parent_id IS NULL GROUP BY cycle_id"):
        check(row[1] == 1, f"cycle {row[0]} has {row[1]} roots (expected 1)")

    # Contiguous positions among siblings (roots are grouped per cycle,
    # children per parent — roots of different cycles all have parent_id NULL)
    def check_positions(table, group_expr, label):
        rows = db.execute(
            f"SELECT {group_expr} AS g, position FROM {table} ORDER BY g, position").fetchall()
        seen = {}
        for r in rows:
            seen.setdefault(r["g"], []).append(r["position"])
        for g, positions in seen.items():
            check(positions == list(range(len(positions))),
                  f"{table}: non-contiguous positions for {label} {g}: {positions}")

    check_positions("objectives",
                    "COALESCE(parent_id, 'cycle:' || cycle_id)", "sibling group")
    check_positions("key_results", "objective_id", "objective")
    check_positions("initiatives", "objective_id", "objective")

    # Every KR has snapshots; latest snapshot == current_value
    for r in db.execute(
            "SELECT k.id, k.current_value, MAX(s.value) AS v, COUNT(s.id) AS n "
            "FROM key_results k LEFT JOIN kr_snapshots s ON s.kr_id = k.id "
            "GROUP BY k.id"):
        # latest by recorded_at, not by value
        last = db.execute(
            "SELECT value FROM kr_snapshots WHERE kr_id=? ORDER BY recorded_at DESC LIMIT 1",
            (r["id"],)).fetchone()
        check(r["n"] >= 1, f"KR {r['id']} has no snapshots")
        if last:
            check(abs(float(last["value"]) - float(r["current_value"])) < 1e-9,
                  f"KR {r['id']}: last snapshot {last['value']} != current {r['current_value']}")

    # Enumerations valid
    check(db.execute(
        "SELECT COUNT(*) FROM key_results WHERE source NOT IN ('manual','api')").fetchone()[0] == 0,
        "invalid kr source")
    check(db.execute(
        "SELECT COUNT(*) FROM key_results WHERE confidence NOT IN ('low','medium','high')").fetchone()[0] == 0,
        "invalid kr confidence")
    check(db.execute(
        "SELECT COUNT(*) FROM initiatives WHERE status NOT IN ('backlog','in_progress','completed','cancelled')").fetchone()[0] == 0,
        "invalid initiative status")
    check(db.execute(
        "SELECT COUNT(*) FROM cycles WHERE status NOT IN ('draft','in_progress','completed')").fetchone()[0] == 0,
        "invalid cycle status")

    return counts, errors


def progress_summary(db):
    """Mimic the UI progress calc and print a distribution."""
    buckets = {"0%": 0, "1-24%": 0, "25-69%": 0, "70-99%": 0, "100%": 0, "N/A": 0}
    over = 0
    for r in db.execute("SELECT initial_value, current_value, target_value FROM key_results"):
        i, c, t = (float(x) for x in r)
        if i == 0 and t == 0:
            buckets["N/A"] += 1
            continue
        if c > t and t > i:
            over += 1
        p = 100 if i == t else ((c - i) / (t - i)) * 100
        p = min(100, max(0, p))
        if p == 0:
            buckets["0%"] += 1
        elif p < 25:
            buckets["1-24%"] += 1
        elif p < 70:
            buckets["25-69%"] += 1
        elif p < 100:
            buckets["70-99%"] += 1
        else:
            buckets["100%"] += 1
    return buckets, over


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--verify-only", action="store_true",
                        help="Run verification against the existing DB without reseeding")
    args = parser.parse_args()

    db = sqlite3.connect(args.db)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")

    if not args.verify_only:
        wipe(db)
        cycle_ids = seed_reference(db)
        for cycle_key, tree in TREES.items():
            seed_objective(db, tree, cycle_key, cycle_ids[cycle_key], None, 0, "0")
        print("Seeded:")
        for key, cid in cycle_ids.items():
            name = db.execute("SELECT name FROM cycles WHERE id=?", (cid,)).fetchone()["name"]
            n = db.execute("SELECT COUNT(*) FROM objectives WHERE cycle_id=?", (cid,)).fetchone()[0]
            print(f"  {name}: {n} root objective(s)")

    counts, errors = verify(db)
    if errors:
        db.rollback()
        print("VERIFICATION FAILED:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)
    db.commit()

    print("Table counts:", ", ".join(f"{k}={v}" for k, v in counts.items()))
    buckets, over = progress_summary(db)
    print("KR progress distribution:", buckets, f"(over-achievement: {over})")
    print("OK: verification passed.")


if __name__ == "__main__":
    main()
