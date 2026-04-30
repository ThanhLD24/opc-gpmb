"""
S4-BE-01 — POST /api/v1/ho-so/{ho_so_id}/chi-tra/{ct_id}/ban-giao integration test.

This is a lightweight runnable script (no pytest required — project doesn't ship pytest).
Run with backend already up on http://localhost:8000:

    cd backend && .venv/bin/python3 tests/test_ban_giao.py

Covers:
    - 200 happy path (admin) — chi_tra.status=da_phe_duyet -> da_ban_giao + ho.status=da_ban_giao + audit log entry
    - 409 wrong-status (try ban_giao on a record already da_ban_giao)
    - 422 invalid date (future date, > 30d back, malformed string)
    - 403 wrong role (gddh, ke_toan)
"""
from __future__ import annotations

import os
import sys
import json
from datetime import date, datetime, timedelta

import httpx

API = os.environ.get("API_BASE", "http://localhost:8000/api/v1")

USERS = {
    "admin": "Admin@123",
    "cbcq": "Cbcq@123",
    "ketoan": "Ketoan@123",
    "gddh": "Gddh@123",
}


def login(client: httpx.Client, username: str) -> str:
    r = client.post(
        f"{API}/auth/login",
        json={"username": username, "password": USERS[username]},
    )
    r.raise_for_status()
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def find_ho_so_by_code(client: httpx.Client, token: str, code: str) -> dict:
    r = client.get(f"{API}/ho-so", headers=auth(token), params={"page_size": 100})
    r.raise_for_status()
    items = r.json()["items"]
    for hs in items:
        if hs.get("code") == code or hs.get("ma_ho_so") == code:
            return hs
    raise RuntimeError(f"ho_so {code} not found")


def list_chi_tra(client: httpx.Client, token: str, ho_so_id: str, status: str | None = None) -> list:
    params = {"page_size": 100}
    if status:
        params["status"] = status
    r = client.get(f"{API}/ho-so/{ho_so_id}/chi-tra", headers=auth(token), params=params)
    r.raise_for_status()
    return r.json()["items"]


def get_audit(client: httpx.Client, token: str, ho_so_id: str, chi_tra_id: str) -> list:
    r = client.get(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/audit", headers=auth(token)
    )
    r.raise_for_status()
    return r.json()


def get_ho(client: httpx.Client, token: str, ho_so_id: str, ho_id: str) -> dict:
    """Find a household by id within a ho_so list (no direct GET /ho/{id} shortcut)."""
    r = client.get(
        f"{API}/ho-so/{ho_so_id}/ho",
        headers=auth(token),
        params={"page_size": 500},
    )
    r.raise_for_status()
    for h in r.json()["items"]:
        if h["id"] == ho_id:
            return h
    raise RuntimeError(f"ho {ho_id} not found in ho_so {ho_so_id}")


def assert_eq(actual, expected, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


# ── Test cases ──────────────────────────────────────────────────────────────


def test_403_wrong_role(client: httpx.Client, ho_so_id: str, chi_tra_id: str) -> None:
    print("\n[TEST] 403 — gddh không có quyền bàn giao")
    tok_gddh = login(client, "gddh")
    r = client.post(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao",
        headers=auth(tok_gddh),
        json={"ngay_ban_giao": date.today().isoformat(), "ghi_chu": "should fail"},
    )
    assert_eq(r.status_code, 403, "gddh status_code")
    print(f"  PASS — got 403 ({r.json().get('detail')})")

    print("\n[TEST] 403 — ketoan không có quyền bàn giao")
    tok_kt = login(client, "ketoan")
    r = client.post(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao",
        headers=auth(tok_kt),
        json={"ngay_ban_giao": date.today().isoformat(), "ghi_chu": "should fail"},
    )
    assert_eq(r.status_code, 403, "ketoan status_code")
    print(f"  PASS — got 403 ({r.json().get('detail')})")


def test_422_invalid_date(
    client: httpx.Client, ho_so_id: str, chi_tra_id: str, admin_token: str
) -> None:
    print("\n[TEST] 422 — ngay_ban_giao future")
    future = (date.today() + timedelta(days=1)).isoformat()
    r = client.post(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao",
        headers=auth(admin_token),
        json={"ngay_ban_giao": future, "ghi_chu": "future"},
    )
    assert_eq(r.status_code, 422, "future date status_code")
    print(f"  PASS — got 422 ({r.json().get('detail')})")

    print("\n[TEST] 422 — ngay_ban_giao quá 30 ngày trước")
    too_old = (date.today() - timedelta(days=31)).isoformat()
    r = client.post(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao",
        headers=auth(admin_token),
        json={"ngay_ban_giao": too_old, "ghi_chu": "too old"},
    )
    assert_eq(r.status_code, 422, "too-old date status_code")
    print(f"  PASS — got 422 ({r.json().get('detail')})")

    print("\n[TEST] 422 — ngay_ban_giao malformed")
    r = client.post(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao",
        headers=auth(admin_token),
        json={"ngay_ban_giao": "not-a-date", "ghi_chu": "bad"},
    )
    assert_eq(r.status_code, 422, "malformed date status_code")
    print(f"  PASS — got 422 ({r.json().get('detail')})")


def test_200_happy_path(
    client: httpx.Client, ho_so_id: str, chi_tra_id: str, admin_token: str
) -> str:
    print("\n[TEST] 200 — happy path admin bàn giao")
    note = f"Bàn giao integration test {datetime.utcnow().isoformat()}"
    body = {"ngay_ban_giao": date.today().isoformat(), "ghi_chu": note}
    r = client.post(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao",
        headers=auth(admin_token),
        json=body,
    )
    if r.status_code != 200:
        print("  Response:", r.status_code, r.text)
    assert_eq(r.status_code, 200, "happy path status_code")
    payload = r.json()
    assert_eq(payload["status"], "da_ban_giao", "chi_tra.status")
    assert_eq(payload["ghi_chu"], note, "chi_tra.ghi_chu")
    if not payload.get("ngay_ban_giao_mat_bang"):
        raise AssertionError("ngay_ban_giao_mat_bang must be set")
    ho_id = payload["ho_id"]

    # Verify ho.status = da_ban_giao
    ho = get_ho(client, admin_token, ho_so_id, ho_id)
    assert_eq(ho["status"], "da_ban_giao", "ho.status")
    print(f"  PASS — chi_tra and ho both = da_ban_giao (ho_id={ho_id})")

    # Verify audit log
    entries = get_audit(client, admin_token, ho_so_id, chi_tra_id)
    actions = [e["action"] for e in entries]
    if "ban_giao" not in actions:
        raise AssertionError(
            f"audit entry action=ban_giao missing. Got actions={actions}"
        )
    matching = [e for e in entries if e["action"] == "ban_giao"]
    if not any(e.get("note") == note for e in matching):
        raise AssertionError(
            f"audit entry note mismatch — expected {note!r}, got {[e.get('note') for e in matching]}"
        )
    print(f"  PASS — audit log has ban_giao entry with correct note")
    return chi_tra_id


def test_409_already_handed(
    client: httpx.Client, ho_so_id: str, chi_tra_id: str, admin_token: str
) -> None:
    print("\n[TEST] 409 — re-call ban-giao trên record đã da_ban_giao")
    r = client.post(
        f"{API}/ho-so/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao",
        headers=auth(admin_token),
        json={"ngay_ban_giao": date.today().isoformat(), "ghi_chu": "again"},
    )
    assert_eq(r.status_code, 409, "second ban-giao status_code")
    print(f"  PASS — got 409 ({r.json().get('detail')})")


# ── Driver ──────────────────────────────────────────────────────────────────


def main() -> int:
    with httpx.Client(timeout=30.0) as client:
        admin_token = login(client, "admin")
        # Pick a chi_tra in da_phe_duyet status from HS-202504-002 (clean seeded data)
        hs = find_ho_so_by_code(client, admin_token, "HS-202504-002")
        ho_so_id = hs["id"]

        approved = list_chi_tra(client, admin_token, ho_so_id, status="da_phe_duyet")
        if not approved:
            raise RuntimeError(
                "No da_phe_duyet chi_tra found on HS-202504-002 — "
                "run seed_demo_data.py first"
            )
        ct_for_happy = approved[0]
        print(f"Using chi_tra {ct_for_happy['id']} for happy path test")

        # Use a different da_phe_duyet record for 403/422 tests so it doesn't get consumed
        if len(approved) < 2:
            raise RuntimeError(
                "Need at least 2 da_phe_duyet chi_tra for tests — "
                "re-run seed_demo_data.py"
            )
        ct_for_errors = approved[1]
        print(f"Using chi_tra {ct_for_errors['id']} for error-case tests")

        # Run error tests first (don't mutate state)
        test_403_wrong_role(client, ho_so_id, ct_for_errors["id"])
        test_422_invalid_date(client, ho_so_id, ct_for_errors["id"], admin_token)

        # Happy path mutates state
        test_200_happy_path(client, ho_so_id, ct_for_happy["id"], admin_token)

        # 409 — same record now da_ban_giao, can't bàn giao again
        test_409_already_handed(client, ho_so_id, ct_for_happy["id"], admin_token)

    print("\n" + "=" * 60)
    print("All tests PASSED")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
