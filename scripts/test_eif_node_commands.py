"""Wrapper command contracts; no EIF runtime implementation is loaded."""
import argparse
import importlib.util
from pathlib import Path
from unittest.mock import Mock

import pytest

spec = importlib.util.spec_from_file_location("eif_node", Path(__file__).with_name("eif_node.py"))
wrapper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)


def arguments(tmp_path, payload='{"note":"source evidence recorded"}'):
    filename = tmp_path / "event.json"
    filename.write_text(payload, encoding="utf-8")
    return argparse.Namespace(
        event_type="node.stage_note", node="N-0044",
        payload_file=str(filename), note="record a stage note",
    )


def test_event_reads_current_revision_and_preserves_payload(tmp_path):
    ledger = Mock()
    ledger.node.return_value = {"revision": 17}
    wrapper.cmd_event(ledger, arguments(tmp_path))
    ledger.node.assert_called_once_with("N-0044")
    ledger.event.assert_called_once_with(
        "node.stage_note",
        {"note": "source evidence recorded", "node": "N-0044", "expected_revision": 17},
        "N-0044: record a stage note",
    )


@pytest.mark.parametrize("payload", ['[]', '{"node":"N-0001"}', '{"expected_revision":0}', '{'])
def test_event_refuses_invalid_or_caller_supplied_identity(tmp_path, payload):
    ledger = Mock()
    with pytest.raises(wrapper.WrapperError):
        wrapper.cmd_event(ledger, arguments(tmp_path, payload))
    ledger.event.assert_not_called()


def test_event_does_not_allow_programme_events(tmp_path):
    ledger = Mock()
    args = arguments(tmp_path)
    args.event_type = "programme.init"
    with pytest.raises(wrapper.WrapperError):
        wrapper.cmd_event(ledger, args)
    ledger.event.assert_not_called()


def test_quality_rejection_stays_pending_and_propagates(tmp_path, monkeypatch):
    ledger = object.__new__(wrapper.Ledger)
    ledger.run = "R-test"
    ledger.dry_run = False
    ledger._exec = Mock(side_effect=wrapper.WrapperError("QUALITY_GATE"))
    monkeypatch.setattr(wrapper, "PENDING", tmp_path / "pending.md")
    monkeypatch.setattr(wrapper, "PROGRESS", tmp_path / "progress.md")
    with pytest.raises(wrapper.WrapperError, match="QUALITY_GATE"):
        ledger.event("node.status", {"node": "N-0044", "to": "complete"}, "complete")
    assert '"to": "complete"' in wrapper.PENDING.read_text(encoding="utf-8")
    assert "QUALITY_GATE" in wrapper.PENDING.read_text(encoding="utf-8")
    assert not wrapper.PROGRESS.exists()


def test_release_is_noop_without_lease():
    ledger = Mock()
    ledger.node.return_value = {"revision": 4, "lease": None}
    wrapper.cmd_release(ledger, argparse.Namespace(node="N-0044"))
    ledger.event.assert_not_called()


def test_release_only_emits_lease_event():
    ledger = Mock()
    ledger.node.return_value = {"revision": 4, "lease": {"run": "R-test"}}
    wrapper.cmd_release(ledger, argparse.Namespace(node="N-0044"))
    ledger.event.assert_called_once_with(
        "node.lease.release", {"node": "N-0044", "expected_revision": 4},
        "N-0044 lease released",
    )


def test_inspection_only_accepts_read_only_reports():
    with pytest.raises(SystemExit):
        wrapper.build_parser().parse_args(["inspect", "rebuild"])


def test_dry_run_event_never_executes_or_writes(tmp_path, monkeypatch):
    ledger = object.__new__(wrapper.Ledger)
    ledger.dry_run = True
    ledger._exec = Mock()
    monkeypatch.setattr(wrapper, "PENDING", tmp_path / "pending.md")
    monkeypatch.setattr(wrapper, "PROGRESS", tmp_path / "progress.md")
    ledger.event("node.stage_note", {"node": "N-0044", "note": "checked"}, "note")
    ledger._exec.assert_not_called()
    assert not wrapper.PROGRESS.exists()
    assert not wrapper.PENDING.exists()
