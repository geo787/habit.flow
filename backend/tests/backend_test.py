import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://habit-flow-435.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

UNIQUE = uuid.uuid4().hex[:8]
TEST_EMAIL = f"test_{UNIQUE}@focus.com"
TEST_PASS = "test123"
TEST_NAME = "Pytest User"

state = {}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# --- Auth ---
def test_register(s):
    r = s.post(f"{API}/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASS, "name": TEST_NAME})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and d["user"]["email"] == TEST_EMAIL
    state["token"] = d["token"]
    state["user_id"] = d["user"]["id"]


def auth_headers():
    return {"Authorization": f"Bearer {state['token']}"}


def test_login(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_invalid(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me(s):
    r = s.get(f"{API}/auth/me", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert "level_info" in d and d["email"] == TEST_EMAIL


def test_me_no_token(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_onboarding(s):
    r = s.post(f"{API}/auth/onboarding", json={"struggles": ["focus"], "focus_length": 20, "buddy": "blob", "notifications": True}, headers=auth_headers())
    assert r.status_code == 200
    me = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    assert me.get("onboarded") is True


# --- Tasks CRUD ---
def test_create_task(s):
    r = s.post(f"{API}/tasks", json={"title": "TEST_task1", "emoji_tag": "⚡"}, headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert d["title"] == "TEST_task1"
    state["task_id"] = d["id"]


def test_list_tasks(s):
    r = s.get(f"{API}/tasks", headers=auth_headers())
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert state["task_id"] in ids


def test_complete_task_awards_xp(s):
    me_before = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    xp_before = me_before["xp"]
    r = s.patch(f"{API}/tasks/{state['task_id']}", json={"completed": True}, headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert d["task"]["completed"] is True
    assert d["reward"]["xp"] >= xp_before + 15


def test_delete_task(s):
    r = s.delete(f"{API}/tasks/{state['task_id']}", headers=auth_headers())
    assert r.status_code == 200
    items = s.get(f"{API}/tasks", headers=auth_headers()).json()
    assert state["task_id"] not in [t["id"] for t in items]


# --- Mood ---
def test_mood_create_and_list(s):
    r = s.post(f"{API}/mood", json={"mood": 4, "energy": 3, "note": "ok"}, headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["entry"]["mood"] == 4
    g = s.get(f"{API}/mood", headers=auth_headers())
    assert g.status_code == 200 and len(g.json()) >= 1


# --- Focus ---
def test_focus_session_xp(s):
    me = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    xp_before = me["xp"]
    r = s.post(f"{API}/focus/session", json={"duration_min": 15, "completed": True, "body_doubling": True}, headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    # 15 + 10 body doubling
    assert d["xp_gained"] == 25
    me2 = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    assert me2["xp"] >= xp_before + 25


# --- Body Double ---
def test_rooms(s):
    r = s.get(f"{API}/body-double/rooms")
    assert r.status_code == 200
    d = r.json()
    assert len(d["rooms"]) == 4
    assert all("live" in r and r["live"] > 0 for r in d["rooms"])


# --- Shop ---
def test_shop_items(s):
    r = s.get(f"{API}/shop/items", headers=auth_headers())
    assert r.status_code == 200
    items = r.json()
    assert len(items) > 0 and "owned" in items[0]
    state["cheap_item"] = min(items, key=lambda x: x["cost"])["id"]


def test_shop_purchase_insufficient(s):
    # Buy expensive item
    items = s.get(f"{API}/shop/items", headers=auth_headers()).json()
    expensive = max(items, key=lambda x: x["cost"])["id"]
    r = s.post(f"{API}/shop/purchase", json={"item_id": expensive}, headers=auth_headers())
    # User should not have enough XP for the most expensive
    assert r.status_code == 400


def test_shop_purchase_success(s):
    # Award enough XP via focus sessions
    for _ in range(5):
        s.post(f"{API}/focus/session", json={"duration_min": 30, "completed": True, "body_doubling": True}, headers=auth_headers())
    items = s.get(f"{API}/shop/items", headers=auth_headers()).json()
    cheap = min(items, key=lambda x: x["cost"])
    r = s.post(f"{API}/shop/purchase", json={"item_id": cheap["id"]}, headers=auth_headers())
    assert r.status_code == 200, r.text
    assert cheap["id"] in r.json()["inventory"]


# --- AI ---
def test_ai_breakdown(s):
    r = s.post(f"{API}/ai/breakdown", json={"task": "Clean my room"}, headers=auth_headers(), timeout=60)
    assert r.status_code == 200, r.text
    steps = r.json()["steps"]
    assert 3 <= len(steps) <= 5


def test_ai_affirmation(s):
    r = s.get(f"{API}/ai/affirmation", headers=auth_headers(), timeout=60)
    assert r.status_code == 200
    assert isinstance(r.json()["affirmation"], str) and len(r.json()["affirmation"]) > 0


def test_ai_empathy(s):
    r = s.post(f"{API}/ai/empathy", json={"task": "Write a paper"}, headers=auth_headers(), timeout=60)
    assert r.status_code == 200
    assert isinstance(r.json()["message"], str) and len(r.json()["message"]) > 0


# --- Progress ---
def test_progress(s):
    r = s.get(f"{API}/progress/summary", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    for k in ("week_sessions", "tasks_completed_total", "streak", "level_info", "badges"):
        assert k in d


# --- Settings ---
def test_settings(s):
    r = s.patch(f"{API}/settings", json={"reduce_motion": True, "focus_length": 25}, headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert d["settings"]["reduce_motion"] is True
    assert d["focus_length"] == 25
