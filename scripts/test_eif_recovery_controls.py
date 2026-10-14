"""Recovery wrapper contracts against real temporary Git repositories, no EIF internals."""
import argparse
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path
from unittest.mock import Mock

import pytest

spec = importlib.util.spec_from_file_location("eif_recovery", Path(__file__).with_name("eif_node.py"))
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


class GitFixture:
    def __init__(self, root):
        self.root = root
        self.controls = root / "docs/eif/phase2-controls"
        self.controls.mkdir(parents=True)
        self.criteria = ["C1: Keep commas, and semicolons; within one criterion.", "C2: Prove independent review."]
        self.node = {"revision": 2, "acceptance_state": "accepted", "acceptance_criteria": self.criteria}
        self.control = {
            "acceptance_file": "docs/eif/phase2-controls/N0068-acceptance.txt",
            "source_paths": ["scripts/product.py"], "required_journeys": ["plan-strength"], "visible_change": False,
        }
        (root / "scripts").mkdir()
        (root / "scripts/product.py").write_text("print('unchanged')\n", encoding="utf-8")
        (self.controls / "N0068-acceptance.txt").write_text("\n".join(self.criteria) + "\n", encoding="utf-8")
        write_json(self.controls / "registry.json", {"version": 1, "nodes": {"N-0068": self.control}})
        (self.controls / "evidence.md").write_text("Observed contract test outcome.\n", encoding="utf-8")
        self.git("init", "--initial-branch=" + w.WORKING_BRANCH)
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "core.autocrlf", "false")
        remote = root.parent / "remote.git"
        subprocess.run(["git", "init", "--bare", str(remote)], check=True, capture_output=True)
        self.git("remote", "add", "origin", str(remote))
        self.commit()
        self.reviewed = self.git("rev-parse", "HEAD").strip()
        evidence = self.ref("evidence.md")
        self.packet = {
            "version": 1, "node": "N-0068", "reviewed_commit": self.reviewed,
            "criteria_sha256": w._criteria_digest(self.criteria), "executor_session": "executor-1",
            "reviewer": {"session": "reviewer-2", "model": "test-model", "result": "verified", "reviewed_commit": self.reviewed},
            "criteria": [{"id": f"C{i+1}", "criterion": c, "outcome": "satisfied", "evidence": [evidence]} for i, c in enumerate(self.criteria)],
            "journeys": [{"id": "plan-strength", "outcome": "satisfied", "evidence": [evidence]}],
        }
        (self.controls / "review.md").write_text("Separate reviewer checked each criterion and journey.\n", encoding="utf-8")
        self.save_packet()

    def git(self, *args):
        result = subprocess.run(["git", *args], cwd=self.root, capture_output=True, text=True)
        assert result.returncode == 0, result.stderr
        return result.stdout

    def commit(self, push=True):
        self.git("add", "--", "scripts/product.py", "docs/eif/phase2-controls")
        self.git("commit", "--allow-empty", "-m", "Test evidence")
        if push:
            self.git("push", "origin", w.WORKING_BRANCH)

    def ref(self, name):
        path = self.controls / name
        return {"path": path.relative_to(self.root).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}

    def save_packet(self, push=True):
        receipt = {
            "version": 1, "node": "N-0068", "reviewed_commit": self.reviewed,
            "criteria_sha256": w._criteria_digest(self.criteria),
            "outcomes_sha256": w._digest(json.dumps({"criteria": self.packet["criteria"], "journeys": self.packet["journeys"]}, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()),
            "executor_session": "executor-1", "reviewer_session": "reviewer-2", "reviewer_model": "test-model",
            "result": "verified", "report": self.ref("review.md"),
        }
        write_json(self.controls / "review.json", receipt)
        self.packet["reviewer"]["artifact"] = self.ref("review.json")
        write_json(self.controls / "N-0068.json", self.packet)
        self.commit(push=push)

    def check(self):
        return w._completion("N-0068", self.node, self.reviewed, None)

    def approval(self, kind, **extra):
        path = self.controls / "approval.json"
        write_json(path, {
            "version": 1, "node": "N-0068", "kind": kind, "approved": True,
            "criteria_sha256": w._criteria_digest(self.criteria), "reviewed_commit": self.reviewed,
            "approver_role": "operator", "approver": "Test operator", "statement": "Explicit fixture approval.", **extra,
        })
        return path.relative_to(self.root).as_posix()


@pytest.fixture
def repo(tmp_path, monkeypatch):
    root = tmp_path / "repo"
    root.mkdir()
    fixture = GitFixture(root)
    monkeypatch.setattr(w, "ROOT", root)
    monkeypatch.setattr(w, "CONTROLS", fixture.controls)
    return fixture


def test_pushed_separate_review_and_all_criteria_pass_without_mutation(repo):
    before = repo.git("rev-parse", "HEAD")
    result = repo.check()
    assert result["outcomes"] == {"C1": "satisfied", "C2": "satisfied", "plan-strength": "satisfied"}
    assert repo.git("rev-parse", "HEAD") == before
    assert repo.git("status", "--porcelain") == ""


@pytest.mark.parametrize("change", ["missing-criterion", "unverified", "same-reviewer", "missing-journey", "stale-text", "empty-evidence"])
def test_false_completion_contracts_are_rejected(repo, change):
    if change == "missing-criterion":
        repo.packet["criteria"].pop()
    elif change == "unverified":
        repo.packet["criteria"][0]["outcome"] = "unverified"
    elif change == "same-reviewer":
        repo.packet["reviewer"]["session"] = "executor-1"
    elif change == "missing-journey":
        repo.packet["journeys"] = []
    elif change == "stale-text":
        repo.packet["criteria"][0]["criterion"] = "A weaker requirement"
    else:
        repo.packet["criteria"][0]["evidence"] = []
    repo.save_packet()
    with pytest.raises(w.WrapperError):
        repo.check()


def test_ledger_criteria_drift_is_rejected(repo):
    repo.node["acceptance_criteria"] = ["Different scope"]
    with pytest.raises(w.WrapperError, match="acceptance criteria differ"):
        repo.check()


def test_unpushed_packet_cannot_close(repo):
    repo.packet["note"] = "A new packet not on origin"
    repo.save_packet(push=False)
    with pytest.raises(w.WrapperError, match="merge-base"):
        repo.check()


def test_new_source_commit_requires_review_again(repo):
    (repo.root / "scripts/product.py").write_text("print('changed')\n", encoding="utf-8")
    repo.commit()
    with pytest.raises(w.WrapperError, match="source changed"):
        repo.check()


def test_uncommitted_source_rejected_without_touching_it(repo):
    path = repo.root / "scripts/product.py"
    path.write_text("print('dirty')\n", encoding="utf-8")
    with pytest.raises(w.WrapperError, match="uncommitted"):
        repo.check()
    assert "dirty" in path.read_text()


def test_hash_and_committed_bytes_reject_replaced_evidence(repo):
    (repo.controls / "evidence.md").write_text("Changed after review.\n", encoding="utf-8")
    with pytest.raises(w.WrapperError, match="changed artifact"):
        repo.check()


def test_review_receipt_cannot_be_reused_for_changed_outcomes(repo):
    repo.packet["criteria"][0]["evidence"].append(repo.ref("review.md"))
    write_json(repo.controls / "N-0068.json", repo.packet)
    repo.commit()
    with pytest.raises(w.WrapperError, match="exact outcomes"):
        repo.check()


def test_waiver_preserves_disposition_and_requires_specific_operator_receipt(repo):
    receipt = repo.approval("waiver", waived_ids=["C1"])
    repo.packet["criteria"][0].update(outcome="waived", waiver={
        "receipt": repo.ref("approval.json"), "reason": "Fixture unavailable", "residual_limitation": "Unmeasured behavior"})
    repo.save_packet()
    assert repo.check()["outcomes"]["C1"] == "waived"
    repo.packet["criteria"][1].update(outcome="waived", waiver=repo.packet["criteria"][0]["waiver"])
    repo.save_packet()
    with pytest.raises(w.WrapperError, match="does not cover"):
        repo.check()


def test_registry_cannot_be_weakened_after_review(repo):
    repo.control["required_journeys"] = []
    write_json(repo.controls / "registry.json", {"version": 1, "nodes": {"N-0068": repo.control}})
    repo.commit()
    with pytest.raises(w.WrapperError, match="committed bytes"):
        repo.check()


@pytest.mark.parametrize("path", ["../outside.md", ".eif/runtime/engine.py", ".git/config", "app/.env", "C:/outside.md"])
def test_protected_artifact_paths_are_rejected(path):
    with pytest.raises(w.WrapperError):
        w._repo_path(path)


def test_complete_never_implicitly_accepts_pending_work():
    ledger = Mock()
    ledger.node.return_value = {"revision": 0, "acceptance_state": "pending"}
    with pytest.raises(w.WrapperError, match="scope acceptance pending"):
        w.cmd_complete(ledger, argparse.Namespace(node="N-0011", commit="abc1234"))
    ledger.event.assert_not_called()


@pytest.mark.parametrize("kind,payload", [("node.status", {"to": "complete"}), ("node.accept", {})])
def test_raw_event_cannot_bypass_typed_acceptance_or_completion(tmp_path, kind, payload):
    path = tmp_path / "event.json"
    write_json(path, payload)
    ledger = Mock()
    with pytest.raises(w.WrapperError):
        w.cmd_event(ledger, argparse.Namespace(node="N-0068", event_type=kind, payload_file=str(path), note="bypass"))
    ledger.event.assert_not_called()


def test_add_keeps_punctuation_and_criterion_boundaries(tmp_path):
    path = tmp_path / "criteria.txt"
    path.write_text("One, with comma; and semicolon.\nTwo.\n", encoding="utf-8")
    ledger = Mock(dry_run=False)
    ledger.node.return_value = {"revision": 0}
    w.cmd_add(ledger, argparse.Namespace(acceptance=str(path), id="N-0090", title="Contract", klass="feature", risk="R2", depends_on="", touches_existing=True))
    assert "--criteria" not in ledger.add_node.call_args.args[0]
    assert ledger.event.call_args.args[1]["acceptance_criteria"] == ["One, with comma; and semicolon.", "Two."]


def test_sync_exact_criteria_uses_explicit_uncommitted_scope_receipt(repo):
    receipt = repo.approval("scope-acceptance")
    ledger = Mock()
    ledger.node.return_value = {"revision": 5, "acceptance_criteria": ["mangled"]}
    w.cmd_sync_criteria(ledger, argparse.Namespace(node="N-0068", receipt=receipt))
    assert ledger.event.call_args.args[0] == "node.patch"
    assert ledger.event.call_args.args[1]["acceptance_criteria"] == repo.criteria
    assert "working artifact" in ledger.event.call_args.args[2]


def test_await_approval_does_not_mistake_text_for_render(tmp_path, monkeypatch):
    monkeypatch.setattr(w, "ROOT", tmp_path)
    monkeypatch.setattr(w, "AWAITING", tmp_path / "awaiting.md")
    renders = tmp_path / "renders"
    renders.mkdir()
    (renders / "passed.txt").write_text("Passed")
    ledger = Mock(dry_run=False)
    ledger.node.return_value = {"revision": 1, "title": "Visible change"}
    w.cmd_await_approval(ledger, argparse.Namespace(node="N-0068", renders="renders"))
    note = ledger.event.call_args.args[1]["note"]
    assert "UNABLE_TO_VERIFY" in note
    assert "not approval or rendered verification" in note


def test_public_parser_keeps_status_help_and_exposes_contract_commands():
    parser = w.build_parser()
    assert parser.parse_args(["status"]).fn == w.cmd_status
    assert parser.parse_args(["help", "event"]).command == ["event"]
    assert parser.parse_args(["check-completion", "N-0068", "--commit", "abc1234"]).packet is None


def test_untracked_source_directory_addition_requires_review(repo):
    repo.control["source_paths"] = ["scripts"]
    write_json(repo.controls / "registry.json", {"version": 1, "nodes": {"N-0068": repo.control}})
    repo.commit()
    repo.reviewed = repo.git("rev-parse", "HEAD").strip()
    repo.packet["reviewed_commit"] = repo.reviewed
    repo.packet["reviewer"]["reviewed_commit"] = repo.reviewed
    repo.save_packet()
    (repo.root / "scripts/unreviewed.py").write_text("unreviewed source\n", encoding="utf-8")
    with pytest.raises(w.WrapperError, match="untracked"):
        repo.check()


def test_changed_committed_waiver_cannot_reuse_review(repo):
    repo.approval("waiver", waived_ids=["C1"])
    repo.packet["criteria"][0].update(outcome="waived", waiver={
        "receipt": repo.ref("approval.json"), "reason": "Unavailable", "residual_limitation": "Untested"})
    repo.save_packet()
    receipt = json.loads((repo.controls / "approval.json").read_text())
    receipt["approver"] = "Different operator"
    write_json(repo.controls / "approval.json", receipt)
    repo.commit()
    with pytest.raises(w.WrapperError, match="changed artifact"):
        repo.check()


def test_blanket_journey_na_cannot_complete(repo):
    repo.packet["journeys"][0]["outcome"] = "not-applicable"
    repo.save_packet()
    with pytest.raises(w.WrapperError, match="unverified outcome"):
        repo.check()


def test_pending_scope_cannot_pass_read_only_check(repo):
    repo.node["acceptance_state"] = "pending"
    with pytest.raises(w.WrapperError, match="scope acceptance pending"):
        repo.check()


@pytest.mark.parametrize("field,value", [("approved", False), ("approver_role", "executor"), ("statement", ""), ("criteria_sha256", "0" * 64)])
def test_fake_scope_approval_rejected_before_ledger_mutation(repo, field, value):
    receipt = repo.approval("scope-acceptance")
    data = json.loads((repo.root / receipt).read_text())
    data[field] = value
    write_json(repo.root / receipt, data)
    repo.commit()
    ledger = Mock()
    ledger.node.return_value = repo.node
    with pytest.raises(w.WrapperError, match="approval receipt"):
        w.cmd_accept(ledger, argparse.Namespace(node="N-0068", receipt=receipt))
    ledger.event.assert_not_called()


@pytest.mark.parametrize("field", ["acceptance", "acceptance_state", "acceptance_criteria", "status", "verification"])
def test_raw_patch_cannot_replace_recovery_gate_fields(tmp_path, field):
    path = tmp_path / "event.json"
    write_json(path, {field: "complete"})
    ledger = Mock()
    with pytest.raises(w.WrapperError, match="explicitly reviewed"):
        w.cmd_event(ledger, argparse.Namespace(node="N-0068", event_type="node.patch", payload_file=str(path), note="bypass"))
    ledger.event.assert_not_called()


def test_review_report_cannot_support_its_own_criterion(repo):
    repo.packet["criteria"][0]["evidence"] = [repo.ref("review.md")]
    repo.save_packet()
    with pytest.raises(w.WrapperError, match="circular"):
        repo.check()


def test_explicit_committed_scope_receipt_accepts_with_provenance(repo):
    receipt = repo.approval("scope-acceptance")
    repo.commit()
    ledger = Mock()
    ledger.node.return_value = repo.node
    assert w.cmd_accept(ledger, argparse.Namespace(node="N-0068", receipt=receipt)) == 0
    assert ledger.event.call_args.args[0] == "node.accept"
    assert "sha256=" in ledger.event.call_args.args[2]


def test_waiver_id_string_cannot_authorize_criterion_by_substring(repo):
    repo.approval("waiver", waived_ids="C10")
    repo.packet["criteria"][0].update(outcome="waived", waiver={
        "receipt": repo.ref("approval.json"), "reason": "Unavailable", "residual_limitation": "Untested"})
    repo.save_packet()
    with pytest.raises(w.WrapperError):
        repo.check()
