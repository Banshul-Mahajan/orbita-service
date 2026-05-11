from dataclasses import dataclass
from typing import List

WEIGHTS = {
    "seo":    0.35,
    "geo":    0.30,
    "eeat":   0.20,
    "schema": 0.15,
}

SEVERITY_ORDER = {"error": 0, "warning": 1, "info": 2}


@dataclass
class ComposedResult:
    overall_score: int
    all_issues:    List[dict]


def compose_score(seo, geo, eeat, schema) -> ComposedResult:
    overall = round(
        seo.score    * WEIGHTS["seo"]    +
        geo.score    * WEIGHTS["geo"]    +
        eeat.score   * WEIGHTS["eeat"]   +
        schema.score * WEIGHTS["schema"]
    )

    all_issues: List[dict] = []

    for issue in seo.issues:
        all_issues.append({
            "severity": issue.severity,
            "message":  issue.message,
            "fix":      issue.fix,
            "category": "seo",
        })

    for issue in geo.issues:
        all_issues.append({
            "severity": issue.severity,
            "message":  issue.message,
            "fix":      issue.fix,
            "category": "geo",
        })

    all_issues.extend(eeat.issues)
    all_issues.extend(schema.issues)

    all_issues.sort(key=lambda x: SEVERITY_ORDER.get(x["severity"], 3))

    return ComposedResult(overall_score=overall, all_issues=all_issues)
