"""Extract the committed R10 oracle; never access a user account or generate a plan."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
COMMIT = "589d527e615cae85869835681499b0e4d28fed3f"
SOURCE = "docs/training/recovery/evidence/R10-after-programmes.json"


def committed(path):
    return subprocess.check_output(["git", "show", f"{COMMIT}:{path}"], cwd=ROOT)


def main():
    raw = committed(SOURCE)
    weeks = [w for w in json.loads(raw) if w["scenario"] == "original-five-day"]
    assert [w["week"] for w in weeks] == [1, 2, 3, 4]
    catalog = json.loads(committed("app/src/lib/training/catalog/exercises.v1.json"))
    by_id = {e["id"]: e for e in catalog}
    aliases = {"upper_pectorals": "pectorals", "lower_pectorals": "pectorals",
               "gastrocnemius": "calves", "soleus": "calves", "upper_traps": "traps"}
    days = []
    totals = {}
    for day in weeks[0]["sessions"]:
        exercises = []
        for exercise in day["exercises"]:
            sets = exercise["sets"]
            owner = by_id[exercise["id"]]["musclesPrimary"][0]
            owner = aliases.get(owner, owner)
            totals[owner] = totals.get(owner, 0) + len(sets)
            exercises.append({"id": exercise["id"], "owner": owner,
                              "workingSets": len(sets), "prescription": sets,
                              "loadReason": exercise["reason"]})
        days.append({"day": day["day"], "template": day["template"],
                     "estimatedMinutes": day["estimatedMinutes"],
                     "workingSets": sum(e["workingSets"] for e in exercises),
                     "exercises": exercises})
    assert totals == weeks[0]["totals"]
    assert all(w["sessions"] == weeks[0]["sessions"] for w in weeks)
    result = {
        "status": "COMMITTED_FIXTURE_RECONCILED_ONLY; ANDROID_AND_LIVE_PARITY_UNVERIFIED",
        "sourceCommit": COMMIT, "sourcePath": SOURCE,
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "profileKind": "Synthetic representative; not an identified saved operator profile",
        "fixtureDate": "2026-10-12", "fixtureProfileRevision": "Not a database revision",
        "policyVersion": "weekly-20261014-v2",
        "goals": {"build_muscle": 46, "build_strength": 46, "lose_fat": 8, "get_fitter": 0},
        "baselineKg": {"bench_press": 80, "squat": 100, "deadlift": 120, "overhead_press": 50, "row": 70},
        "baselineReps": {"bench_press": 8, "squat": 5, "deadlift": 5, "overhead_press": 8, "row": 8},
        "experience": "advanced", "mode": "strength", "frequency": "twice",
        "skillWork": False, "constraints": [], "daysJs": [1, 2, 3, 4, 5],
        "equipment": ["barbell", "dumbbells", "bench", "rack", "floor", "cable_machine", "pull_up_bar",
                      "leg_press_machine", "hack_squat_machine", "chest_press_machine", "t_bar_row_machine",
                      "dip_station", "ez_bar"],
        "weeksIdenticalAbsentNewHistory": True, "weeklyExclusiveRegionSets": totals, "days": days,
        "unknownLiveFields": ["profile revision", "programme id/version", "persisted day ids",
                              "started session snapshot", "performed sets", "effective guidance"],
        "policyFindingsStillOpen": ["R10-P01", "D-P2-01", "D-P2-02", "D-P2-03", "D-P2-04", "D-P2-05", "D-P2-06"],
    }
    output = Path(__file__).with_name("R11-representative-five-day.json")
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("Committed R10 extract: four identical weeks; exclusive region counts reconcile. No runtime or DB access.")


if __name__ == "__main__":
    main()
