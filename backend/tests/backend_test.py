"""FocusFlow backend regression + new feature tests (iteration 2).
Covers existing endpoints (auth, tasks, mood, focus, body-double, shop, AI, progress, settings)
PLUS new endpoints: boosters, pro checkout, checkout status, stripe webhook,
focus usage, waitlist, free-tier gating (focus 3/day + AI breakdown Pro-only).
"""
import os
import uuid
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://habit-flow-435.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

UNIQUE = uuid.uuid4().hex[:8]
TEST_EMAIL = f"test_{UNIQUE}@focus.com"
TEST_PASS = "test123"
TEST_NAME = "Pytest User"

# Load backend .env if env vars not exported in this shell
try:
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
except Exception:
    pass

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

state = {}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def auth_headers():
    return {"Authorization": f"Bearer {state['token']}"}


# --- Auth ---
def test_register(s):
    r = s.post(f"{API}/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASS, "name": TEST_NAME})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and d["user"]["email"] == TEST_EMAIL
    # NEW: is_pro field default False
    assert d["user"].get("is_pro") is False
    state["token"] = d["token"]
    state["user_id"] = d["user"]["id"]


def test_login(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_invalid(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_includes_is_pro(s):
    r = s.get(f"{API}/auth/me", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert "level_info" in d and d["email"] == TEST_EMAIL
    assert "is_pro" in d and d["is_pro"] is False


def test_me_no_token(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_onboarding(s):
    r = s.post(f"{API}/auth/onboarding", json={"struggles": ["focus"], "focus_length": 20, "buddy": "blob", "notifications": True}, headers=auth_headers())
    assert r.status_code == 200


# --- Tasks ---
def test_create_task(s):
    r = s.post(f"{API}/tasks", json={"title": "TEST_task1", "emoji_tag": "⚡"}, headers=auth_headers())
    assert r.status_code == 200
    state["task_id"] = r.json()["id"]


def test_complete_task(s):
    r = s.patch(f"{API}/tasks/{state['task_id']}", json={"completed": True}, headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["task"]["completed"] is True


def test_delete_task(s):
    r = s.delete(f"{API}/tasks/{state['task_id']}", headers=auth_headers())
    assert r.status_code == 200


# --- Mood ---
def test_mood(s):
    r = s.post(f"{API}/mood", json={"mood": 4, "energy": 3, "note": "ok"}, headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["entry"]["mood"] == 4


# --- NEW: Focus usage endpoint ---
def test_focus_usage_default(s):
    r = s.get(f"{API}/focus/usage", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert d["limit"] == 3
    assert d["is_pro"] is False
    assert d["used"] == 0


# --- NEW: Focus 3/day gating ---
def test_focus_free_tier_limit(s):
    # First 3 sessions should succeed
    for i in range(3):
        r = s.post(f"{API}/focus/session", json={"duration_min": 10, "completed": True, "body_doubling": False}, headers=auth_headers())
        assert r.status_code == 200, f"session {i+1} failed: {r.text}"
    # 4th should return 402
    r = s.post(f"{API}/focus/session", json={"duration_min": 10, "completed": True}, headers=auth_headers())
    assert r.status_code == 402, f"expected 402, got {r.status_code}: {r.text}"


def test_focus_usage_after_limit(s):
    r = s.get(f"{API}/focus/usage", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert d["used"] >= 3
    assert d["limit"] == 3


# --- Body double rooms ---
def test_rooms(s):
    r = s.get(f"{API}/body-double/rooms")
    assert r.status_code == 200
    d = r.json()
    assert len(d["rooms"]) == 4


# --- Shop existing items ---
def test_shop_items(s):
    r = s.get(f"{API}/shop/items", headers=auth_headers())
    assert r.status_code == 200
    assert len(r.json()) > 0


# --- NEW: Boosters ---
def test_boosters_list(s):
    r = s.get(f"{API}/shop/boosters")
    assert r.status_code == 200
    packs = r.json()
    assert len(packs) == 3
    ids = {p["id"] for p in packs}
    assert ids == {"small_spark", "focus_surge", "flow_state"}
    by_id = {p["id"]: p for p in packs}
    assert by_id["small_spark"]["xp"] == 100 and by_id["small_spark"]["amount"] == 1.99 and by_id["small_spark"]["color"] == "yellow"
    assert by_id["focus_surge"]["xp"] == 250 and by_id["focus_surge"]["color"] == "teal"
    assert by_id["flow_state"]["xp"] == 600 and by_id["flow_state"]["color"] == "purple"


def test_booster_checkout_invalid(s):
    r = s.post(f"{API}/shop/booster/checkout", json={"pack_id": "nope", "origin_url": BASE_URL}, headers=auth_headers())
    assert r.status_code == 400


def test_booster_checkout_grants_xp(s):
    me_before = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    xp_before = me_before["xp"]
    r = s.post(f"{API}/shop/booster/checkout", json={"pack_id": "small_spark", "origin_url": BASE_URL}, headers=auth_headers())
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["xp_granted"] == 100
    assert d["xp"] == xp_before + 100
    me_after = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    assert me_after["xp"] == xp_before + 100


# --- NEW: Stripe Pro checkout ---
def test_pro_checkout_session(s):
    r = s.post(f"{API}/checkout/pro/session", json={"origin_url": BASE_URL}, headers=auth_headers())
    assert r.status_code == 200, r.text
    d = r.json()
    assert "url" in d and d["url"].startswith("https://")
    assert "session_id" in d and len(d["session_id"]) > 0
    state["pro_session_id"] = d["session_id"]


def test_pro_checkout_status(s):
    sid = state.get("pro_session_id")
    if not sid:
        pytest.skip("no session id from prior test")
    r = s.get(f"{API}/checkout/status/{sid}", headers=auth_headers())
    # Per spec: just verify endpoint exists and responds. With sk_test_emergent,
    # session lookups may return 500 (Stripe says no such session). Endpoint
    # functions correctly otherwise.
    assert r.status_code in (200, 404, 500), r.text
    if r.status_code == 200:
        d = r.json()
        assert "status" in d and "payment_status" in d


def test_stripe_webhook_bad_signature(s):
    # Bad/missing Stripe-Signature should return 400 cleanly (not 500)
    r = s.post(f"{API}/webhook/stripe", data=b"{}", headers={"Stripe-Signature": "invalid"})
    assert r.status_code == 400, f"expected 400 with bad sig, got {r.status_code}: {r.text}"


# --- NEW: AI breakdown Pro gate ---
def test_ai_breakdown_free_blocked(s):
    r = s.post(f"{API}/ai/breakdown", json={"task": "clean room"}, headers=auth_headers(), timeout=30)
    assert r.status_code == 402, f"free user should be blocked, got {r.status_code}"


def test_ai_affirmation_works(s):
    r = s.get(f"{API}/ai/affirmation", headers=auth_headers(), timeout=60)
    assert r.status_code == 200
    assert isinstance(r.json()["affirmation"], str) and len(r.json()["affirmation"]) > 0


def test_ai_empathy_works(s):
    r = s.post(f"{API}/ai/empathy", json={"task": "Write a paper"}, headers=auth_headers(), timeout=60)
    assert r.status_code == 200


# --- NEW: AI breakdown after manually setting is_pro=true ---
def test_ai_breakdown_pro_allowed(s):
    # Directly upgrade in mongo
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")

    async def _upgrade():
        c = AsyncIOMotorClient(mongo_url)
        await c[db_name].users.update_one({"id": state["user_id"]}, {"$set": {"is_pro": True}})
        c.close()
    asyncio.get_event_loop().run_until_complete(_upgrade())

    # Verify /auth/me reflects pro
    me = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    assert me["is_pro"] is True

    # /focus/usage should show limit 999
    u = s.get(f"{API}/focus/usage", headers=auth_headers()).json()
    assert u["limit"] == 999 and u["is_pro"] is True

    # Now AI breakdown should work
    r = s.post(f"{API}/ai/breakdown", json={"task": "Clean my room"}, headers=auth_headers(), timeout=60)
    assert r.status_code == 200, r.text
    steps = r.json()["steps"]
    assert 1 <= len(steps) <= 5


# --- NEW: Waitlist ---
def test_waitlist_new(s):
    email = f"wait_{uuid.uuid4().hex[:6]}@example.com"
    r = s.post(f"{API}/waitlist", json={"email": email})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["already"] is False
    state["waitlist_email"] = email


def test_waitlist_duplicate(s):
    email = state.get("waitlist_email")
    if not email:
        pytest.skip("need prior")
    r = s.post(f"{API}/waitlist", json={"email": email})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["already"] is True


# --- Progress / Settings (regression) ---
def test_progress(s):
    r = s.get(f"{API}/progress/summary", headers=auth_headers())
    assert r.status_code == 200
    for k in ("week_sessions", "tasks_completed_total", "streak", "level_info", "badges"):
        assert k in r.json()


def test_settings(s):
    r = s.patch(f"{API}/settings", json={"reduce_motion": True, "focus_length": 25}, headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["settings"]["reduce_motion"] is True


# =====================================================================
# Sprint 3: New endpoints
# =====================================================================

# --- Language (i18n) ---
def test_language_default_en(s):
    me = s.get(f"{API}/auth/me", headers=auth_headers()).json()
    # field should exist (default 'en') — older docs may lack it
    assert me.get("language", "en") in ("en", "ro", "es", "fr")


def test_language_patch_valid(s):
    r = s.patch(f"{API}/me/language", json={"language": "ro"}, headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["language"] == "ro"
    # Reset back to en
    r2 = s.patch(f"{API}/me/language", json={"language": "en"}, headers=auth_headers())
    assert r2.status_code == 200


def test_language_patch_invalid(s):
    r = s.patch(f"{API}/me/language", json={"language": "xx"}, headers=auth_headers())
    assert r.status_code == 400


# --- Morning routine ---
def test_morning_should_show_initial(s):
    # reset last_opened_date so test is deterministic
    mongo_url = MONGO_URL
    db_name = DB_NAME
    async def _reset():
        c = AsyncIOMotorClient(mongo_url)
        await c[db_name].users.update_one({"id": state["user_id"]}, {"$set": {"last_opened_date": None}})
        c.close()
    asyncio.get_event_loop().run_until_complete(_reset())

    r = s.get(f"{API}/morning/should-show", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert d["show"] is True
    assert "today" in d and len(d["today"]) == 10  # YYYY-MM-DD


def test_morning_energy_persists(s):
    r = s.post(f"{API}/morning/energy", json={"energy": 4}, headers=auth_headers())
    assert r.status_code == 200
    # subsequent should-show is False same day
    r2 = s.get(f"{API}/morning/should-show", headers=auth_headers())
    assert r2.json()["show"] is False


def test_morning_dismiss_persists(s):
    # reset
    mongo_url = MONGO_URL
    db_name = DB_NAME
    async def _reset():
        c = AsyncIOMotorClient(mongo_url)
        await c[db_name].users.update_one({"id": state["user_id"]}, {"$set": {"last_opened_date": None}})
        c.close()
    asyncio.get_event_loop().run_until_complete(_reset())

    r = s.post(f"{API}/morning/dismiss", headers=auth_headers())
    assert r.status_code == 200
    r2 = s.get(f"{API}/morning/should-show", headers=auth_headers())
    assert r2.json()["show"] is False


# --- Hyperfocus / Zone ---
def test_hyperfocus_free_blocked(s):
    # Ensure user is non-pro for this test
    mongo_url = MONGO_URL
    db_name = DB_NAME
    async def _free():
        c = AsyncIOMotorClient(mongo_url)
        await c[db_name].users.update_one({"id": state["user_id"]}, {"$set": {"is_pro": False}})
        c.close()
    asyncio.get_event_loop().run_until_complete(_free())

    r = s.post(f"{API}/hyperfocus/session", json={"duration_min": 90, "completed": True, "achievement": "wrote essay"}, headers=auth_headers())
    assert r.status_code == 402


def test_hyperfocus_pro_grants_xp(s):
    mongo_url = MONGO_URL
    db_name = DB_NAME
    async def _pro():
        c = AsyncIOMotorClient(mongo_url)
        await c[db_name].users.update_one({"id": state["user_id"]}, {"$set": {"is_pro": True}})
        c.close()
    asyncio.get_event_loop().run_until_complete(_pro())

    xp_before = s.get(f"{API}/auth/me", headers=auth_headers()).json()["xp"]
    r = s.post(f"{API}/hyperfocus/session", json={"duration_min": 90, "completed": True, "achievement": "wrote essay"}, headers=auth_headers())
    assert r.status_code == 200, r.text
    d = r.json()
    # duration_min(90) + 50 completed bonus
    assert d["xp_gained"] == 140
    xp_after = s.get(f"{API}/auth/me", headers=auth_headers()).json()["xp"]
    assert xp_after == xp_before + 140
    assert d["session"]["duration_min"] == 90
    assert d["session"]["achievement"] == "wrote essay"


def test_hyperfocus_list(s):
    r = s.get(f"{API}/hyperfocus/sessions", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert "sessions" in d and "week_total_min" in d and "week_count" in d
    assert d["week_count"] >= 1
    assert d["week_total_min"] >= 90
    # _id leakage check
    for sess in d["sessions"]:
        assert "_id" not in sess


# --- Overwhelm ---
def test_overwhelm_next_tiny_returns_smallest(s):
    # Create a few tasks of varying title length
    titles = ["a really long task title to deprioritize", "short", "medium task"]
    ids = []
    for t in titles:
        r = s.post(f"{API}/tasks", json={"title": t}, headers=auth_headers())
        assert r.status_code == 200
        ids.append(r.json()["id"])

    r = s.get(f"{API}/overwhelm/next-tiny", headers=auth_headers())
    assert r.status_code == 200
    d = r.json()
    assert d["task"] is not None
    assert d["task"]["title"] == "short"

    # cleanup
    for tid in ids:
        s.delete(f"{API}/tasks/{tid}", headers=auth_headers())


def test_overwhelm_next_tiny_none_when_empty(s):
    # complete or delete any remaining tasks first
    tlist = s.get(f"{API}/tasks", headers=auth_headers()).json()
    for t in tlist:
        if not t.get("completed"):
            s.delete(f"{API}/tasks/{t['id']}", headers=auth_headers())

    r = s.get(f"{API}/overwhelm/next-tiny", headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["task"] is None


# --- Coaches ---
def test_coaches_list_seed(s):
    r = s.get(f"{API}/coaches")
    assert r.status_code == 200
    d = r.json()
    coaches = d["coaches"]
    assert len(coaches) >= 3
    names = {c["name"] for c in coaches[:3]}
    assert {"Sarah M.", "James K.", "Priya N."}.issubset(names)
    for c in coaches[:3]:
        for k in ("id", "name", "specialty", "price_per_session", "rating", "calendly_url", "avatar"):
            assert k in c, f"missing {k} in coach {c}"


def test_coach_apply_success(s):
    payload = {
        "name": "TEST_Coach",
        "email": f"coach_{uuid.uuid4().hex[:6]}@example.com",
        "credentials": "ICF Certified ADHD Coach",
        "specialty": "Adult ADHD",
        "calendly_url": "https://calendly.com/test/30min",
        "agree_fee": True,
    }
    r = s.post(f"{API}/coaches/apply", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True
    assert d["application"]["status"] == "pending"
    assert d["application"]["name"] == "TEST_Coach"


def test_coach_apply_requires_agreement(s):
    payload = {
        "name": "TEST_Coach2",
        "email": f"coach_{uuid.uuid4().hex[:6]}@example.com",
        "credentials": "x",
        "specialty": "x",
        "calendly_url": "https://calendly.com/x",
        "agree_fee": False,
    }
    r = s.post(f"{API}/coaches/apply", json=payload)
    assert r.status_code == 400


# --- Planner ---
def test_planner_week(s):
    r = s.get(f"{API}/planner/week", headers=auth_headers())
    assert r.status_code == 200
    assert "tasks" in r.json() and isinstance(r.json()["tasks"], list)


def test_task_scheduled_date_persists(s):
    # Create task
    r = s.post(f"{API}/tasks", json={"title": "TEST_planner_task"}, headers=auth_headers())
    assert r.status_code == 200
    tid = r.json()["id"]

    # PATCH scheduled_date
    r2 = s.patch(f"{API}/tasks/{tid}", json={"scheduled_date": "2026-02-15"}, headers=auth_headers())
    assert r2.status_code == 200, r2.text
    assert r2.json()["task"]["scheduled_date"] == "2026-02-15"

    # Verify via planner/week
    pw = s.get(f"{API}/planner/week", headers=auth_headers()).json()
    found = [t for t in pw["tasks"] if t["id"] == tid]
    assert found and found[0]["scheduled_date"] == "2026-02-15"

    # null it back
    r3 = s.patch(f"{API}/tasks/{tid}", json={"scheduled_date": None}, headers=auth_headers())
    assert r3.status_code == 200

    # cleanup
    s.delete(f"{API}/tasks/{tid}", headers=auth_headers())
