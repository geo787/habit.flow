from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import json
import asyncio
import random

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest
)
from fastapi import Request

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALG = 'HS256'
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Server-defined fixed packages — never trust frontend amounts
PRO_PLAN = {"id": "pro_monthly", "name": "FocusFlow Pro (monthly)", "amount": 7.99, "currency": "usd"}
BOOSTER_PACKS = {
    "small_spark": {"id": "small_spark", "name": "Small Spark", "xp": 100, "amount": 1.99, "color": "yellow"},
    "focus_surge": {"id": "focus_surge", "name": "Focus Surge", "xp": 250, "amount": 2.99, "color": "teal"},
    "flow_state": {"id": "flow_state", "name": "Flow State", "xp": 600, "amount": 4.99, "color": "purple"},
}

app = FastAPI(title="FocusFlow API")
api = APIRouter(prefix="/api")

# ---------- Helpers ----------
def utcnow():
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": utcnow() + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def level_for_xp(xp: int) -> dict:
    # Levels 1-10, each requires 100 more xp than previous
    titles = ["Getting Started", "Spark", "Builder", "Momentum", "Steady",
              "Focused", "Strong", "Rising", "Master", "Flow Master"]
    thresholds = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200]
    level = 1
    for i, t in enumerate(thresholds):
        if xp >= t:
            level = i + 1
    cur_threshold = thresholds[level - 1]
    next_threshold = thresholds[level] if level < 10 else thresholds[-1] + 800
    return {
        "level": level,
        "title": titles[min(level - 1, 9)],
        "xp": xp,
        "current_threshold": cur_threshold,
        "next_threshold": next_threshold,
        "progress": (xp - cur_threshold) / (next_threshold - cur_threshold) if next_threshold > cur_threshold else 1.0,
    }

# ---------- Models ----------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class OnboardingReq(BaseModel):
    struggles: List[str]
    focus_length: int = 15
    buddy: str = "blob"
    notifications: bool = False

class TaskCreate(BaseModel):
    title: str
    emoji_tag: Optional[str] = None  # 😰 / 😴 / ⚡
    day: Optional[str] = None  # YYYY-MM-DD

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    emoji_tag: Optional[str] = None
    day: Optional[str] = None
    completed: Optional[bool] = None
    microsteps: Optional[List[dict]] = None
    order: Optional[int] = None

class MoodCreate(BaseModel):
    mood: int  # 1..5
    energy: int  # 1..5
    note: Optional[str] = None

class FocusSessionReq(BaseModel):
    duration_min: int
    completed: bool = True
    sound: Optional[str] = None
    body_doubling: bool = False

class AIBreakdownReq(BaseModel):
    task: str

class AIEmpathyReq(BaseModel):
    task: str

class ShopPurchaseReq(BaseModel):
    item_id: str

# ---------- Auth ----------
@api.post("/auth/register")
async def register(req: RegisterReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": req.email.lower(),
        "name": req.name,
        "password_hash": hash_password(req.password),
        "xp": 0,
        "streak": 0,
        "grace_days_used": 0,
        "last_active_date": None,
        "buddy": "blob",
        "focus_length": 15,
        "struggles": [],
        "onboarded": False,
        "settings": {"reduce_motion": False, "high_contrast": False, "sound": "lofi", "notif_window": [10, 18]},
        "inventory": [],
        "badges": [],
        "is_pro": False,
        "created_at": iso(utcnow()),
    }
    await db.users.insert_one(user)
    token = create_token(user_id)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    user["level_info"] = level_for_xp(user.get("xp", 0))
    return user

@api.post("/auth/onboarding")
async def onboarding(req: OnboardingReq, user=Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "struggles": req.struggles,
            "focus_length": req.focus_length,
            "buddy": req.buddy,
            "settings.notifications": req.notifications,
            "onboarded": True,
        }}
    )
    return {"ok": True}

# ---------- Streak / XP helper ----------
async def award_xp_and_streak(user_id: str, xp: int):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    today = utcnow().date().isoformat()
    last = user.get("last_active_date")
    streak = user.get("streak", 0)
    grace = user.get("grace_days_used", 0)
    badges = list(user.get("badges", []))

    if last == today:
        pass  # already counted today
    else:
        if last is None:
            streak = 1
            grace = 0
        else:
            try:
                last_d = datetime.fromisoformat(last).date()
            except Exception:
                last_d = utcnow().date()
            diff = (utcnow().date() - last_d).days
            if diff == 1:
                streak += 1
                grace = 0
            elif diff == 2 and grace < 2:
                streak += 1
                grace += 1
            elif diff > 1:
                streak = 1
                grace = 0

    new_xp = user.get("xp", 0) + xp

    # Auto badges
    def add_badge(slug, name):
        if not any(b["slug"] == slug for b in badges):
            badges.append({"slug": slug, "name": name, "earned_at": iso(utcnow())})

    if new_xp >= 50:
        add_badge("first_focus", "First Focus")
    if streak >= 5:
        add_badge("streak_5", "5-Day Streak")
    if streak >= 14:
        add_badge("streak_14", "Two Week Hero")

    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "xp": new_xp,
            "streak": streak,
            "grace_days_used": grace,
            "last_active_date": today,
            "badges": badges,
        }}
    )
    return {"xp": new_xp, "streak": streak, "level_info": level_for_xp(new_xp), "badges": badges}

# ---------- Tasks ----------
@api.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    items = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).sort("order", 1).to_list(500)
    return items

@api.post("/tasks")
async def create_task(req: TaskCreate, user=Depends(get_current_user)):
    count = await db.tasks.count_documents({"user_id": user["id"]})
    task = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": req.title,
        "emoji_tag": req.emoji_tag,
        "day": req.day,
        "completed": False,
        "microsteps": [],
        "order": count,
        "created_at": iso(utcnow()),
    }
    await db.tasks.insert_one(task)
    task.pop("_id", None)
    return task

@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, req: TaskUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump(exclude_unset=True).items()}
    if not updates:
        raise HTTPException(400, "No updates")
    awarded = None
    if updates.get("completed"):
        awarded = await award_xp_and_streak(user["id"], 15)
    await db.tasks.update_one({"id": task_id, "user_id": user["id"]}, {"$set": updates})
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    return {"task": task, "reward": awarded}

@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    return {"ok": True}

@api.post("/tasks/reorder")
async def reorder_tasks(payload: dict, user=Depends(get_current_user)):
    ids = payload.get("ids", [])
    for idx, tid in enumerate(ids):
        await db.tasks.update_one({"id": tid, "user_id": user["id"]}, {"$set": {"order": idx}})
    return {"ok": True}

# ---------- Mood ----------
@api.post("/mood")
async def add_mood(req: MoodCreate, user=Depends(get_current_user)):
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "mood": req.mood,
        "energy": req.energy,
        "note": req.note,
        "created_at": iso(utcnow()),
    }
    await db.moods.insert_one(entry)
    reward = await award_xp_and_streak(user["id"], 5)
    entry.pop("_id", None)
    return {"entry": entry, "reward": reward}

@api.get("/mood")
async def list_mood(user=Depends(get_current_user)):
    items = await db.moods.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(60)
    return items

# ---------- Focus sessions ----------
@api.post("/focus/session")
async def end_focus(req: FocusSessionReq, user=Depends(get_current_user)):
    # Free-tier daily limit: 3 sessions/day (Pro is unlimited)
    if not user.get("is_pro", False):
        today_iso = utcnow().date().isoformat()
        used = await db.focus_sessions.count_documents({
            "user_id": user["id"],
            "created_at": {"$gte": today_iso},
        })
        if used >= 3:
            raise HTTPException(402, "Free tier limit: 3 focus sessions/day. Upgrade to Pro for unlimited.")
    xp_gain = req.duration_min if req.completed else 5
    if req.body_doubling and req.completed:
        xp_gain += 10
    sess = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "duration_min": req.duration_min,
        "completed": req.completed,
        "sound": req.sound,
        "body_doubling": req.body_doubling,
        "created_at": iso(utcnow()),
    }
    await db.focus_sessions.insert_one(sess)
    reward = await award_xp_and_streak(user["id"], xp_gain)
    sess.pop("_id", None)
    return {"session": sess, "reward": reward, "xp_gained": xp_gain}

@api.get("/focus/sessions")
async def list_sessions(user=Depends(get_current_user)):
    items = await db.focus_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items

# ---------- Body doubling (mock) ----------
ROOMS = [
    {"id": "deep-work", "name": "Deep Work Den", "vibe": "Silent focus, lofi beats", "sound": "lofi"},
    {"id": "cozy-cafe", "name": "Cozy Café", "vibe": "Soft chatter, ambient hum", "sound": "cafe"},
    {"id": "rain-room", "name": "Rainy Window", "vibe": "Gentle rainfall", "sound": "rain"},
    {"id": "library", "name": "Quiet Library", "vibe": "Pages turning softly", "sound": "silence"},
]

@api.get("/body-double/rooms")
async def list_rooms():
    rooms = []
    base = utcnow().hour
    for r in ROOMS:
        # mocked live count, varies softly per hour
        seed = sum(ord(c) for c in r["id"]) + base
        random.seed(seed)
        live = random.randint(120, 1800)
        rooms.append({**r, "live": live})
    total = sum(r["live"] for r in rooms)
    return {"rooms": rooms, "total_live": total}

# ---------- Reward shop ----------
SHOP_ITEMS = [
    {"id": "theme-sunset", "name": "Sunset Theme", "kind": "theme", "cost": 100, "icon": "🌅"},
    {"id": "theme-forest", "name": "Forest Theme", "kind": "theme", "cost": 120, "icon": "🌲"},
    {"id": "theme-ocean", "name": "Ocean Theme", "kind": "theme", "cost": 150, "icon": "🌊"},
    {"id": "buddy-cat", "name": "Cat Buddy", "kind": "buddy", "cost": 200, "icon": "🐱"},
    {"id": "buddy-fox", "name": "Fox Buddy", "kind": "buddy", "cost": 250, "icon": "🦊"},
    {"id": "card-pack-1", "name": "Affirmation Card Pack", "kind": "card", "cost": 80, "icon": "💌"},
    {"id": "sound-rain", "name": "Premium Rain Sounds", "kind": "sound", "cost": 90, "icon": "🌧️"},
    {"id": "sound-forest", "name": "Forest Sound Pack", "kind": "sound", "cost": 90, "icon": "🍃"},
]

@api.get("/shop/items")
async def shop_items(user=Depends(get_current_user)):
    inv = set(user.get("inventory", []))
    return [{**it, "owned": it["id"] in inv} for it in SHOP_ITEMS]

@api.post("/shop/purchase")
async def shop_purchase(req: ShopPurchaseReq, user=Depends(get_current_user)):
    item = next((i for i in SHOP_ITEMS if i["id"] == req.item_id), None)
    if not item:
        raise HTTPException(404, "Item not found")
    if item["id"] in user.get("inventory", []):
        raise HTTPException(400, "Already owned")
    if user.get("xp", 0) < item["cost"]:
        raise HTTPException(400, "Not enough XP")
    new_xp = user.get("xp", 0) - item["cost"]
    inv = list(user.get("inventory", [])) + [item["id"]]
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"xp": new_xp, "inventory": inv}}
    )
    return {"ok": True, "xp": new_xp, "inventory": inv}

# ---------- AI ----------
def _llm_chat(session_id: str, system_prompt: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("openai", "gpt-5.2")

@api.post("/ai/breakdown")
async def ai_breakdown(req: AIBreakdownReq, user=Depends(get_current_user)):
    if not user.get("is_pro", False):
        raise HTTPException(402, "AI task breakdown is a Pro feature. Upgrade to unlock.")
    sys_prompt = (
        "You are a kind, ADHD-friendly assistant. Break a big task into 3-5 tiny, "
        "concrete micro-steps. Each step must be small (≤15 min), specific, and start "
        "with an action verb. Return ONLY a JSON array of strings, no commentary."
    )
    chat = _llm_chat(f"breakdown-{user['id']}-{uuid.uuid4()}", sys_prompt)
    try:
        resp = await chat.send_message(UserMessage(text=f"Task: {req.task}"))
        text = resp.strip()
        # Try to extract JSON array
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1:
            arr = json.loads(text[start:end + 1])
        else:
            arr = [s.strip("- ").strip() for s in text.split("\n") if s.strip()]
        steps = [{"id": str(uuid.uuid4()), "title": s, "done": False} for s in arr if s][:5]
        return {"steps": steps}
    except Exception as e:
        logging.exception("ai breakdown failed")
        raise HTTPException(500, f"AI breakdown failed: {e}")

@api.get("/ai/affirmation")
async def ai_affirmation(user=Depends(get_current_user)):
    sys_prompt = (
        "You write ADHD-positive daily affirmations. Warm, kind, never toxic positivity, "
        "never shaming. 1 sentence, ≤20 words. Address the user directly."
    )
    chat = _llm_chat(f"affirm-{user['id']}-{utcnow().date().isoformat()}", sys_prompt)
    try:
        resp = await chat.send_message(UserMessage(text=f"Write an affirmation for {user.get('name','friend')}."))
        return {"affirmation": resp.strip().strip('"')}
    except Exception:
        logging.exception("affirmation failed")
        return {"affirmation": "You showed up today, and that already counts. Be gentle with yourself."}

@api.post("/ai/empathy")
async def ai_empathy(req: AIEmpathyReq, user=Depends(get_current_user)):
    sys_prompt = (
        "You respond with warmth and ADHD-aware empathy. Validate the user's feeling about "
        "a task that feels hard, then give ONE small actionable tip. 2 short sentences max."
    )
    chat = _llm_chat(f"empathy-{user['id']}-{uuid.uuid4()}", sys_prompt)
    try:
        resp = await chat.send_message(UserMessage(text=f"This task feels hard: {req.task}"))
        return {"message": resp.strip()}
    except Exception:
        logging.exception("empathy failed")
        raise HTTPException(500, "AI empathy unavailable")

# ---------- Progress / wrapped ----------
@api.get("/progress/summary")
async def progress_summary(user=Depends(get_current_user)):
    week_ago = (utcnow() - timedelta(days=7)).isoformat()
    sessions = await db.focus_sessions.count_documents({"user_id": user["id"], "created_at": {"$gte": week_ago}})
    tasks_done = await db.tasks.count_documents({"user_id": user["id"], "completed": True})
    moods = await db.moods.find({"user_id": user["id"], "created_at": {"$gte": week_ago}}, {"_id": 0}).to_list(100)
    avg_mood = round(sum(m["mood"] for m in moods) / len(moods), 1) if moods else None
    avg_energy = round(sum(m["energy"] for m in moods) / len(moods), 1) if moods else None
    return {
        "week_sessions": sessions,
        "tasks_completed_total": tasks_done,
        "avg_mood": avg_mood,
        "avg_energy": avg_energy,
        "streak": user.get("streak", 0),
        "level_info": level_for_xp(user.get("xp", 0)),
        "badges": user.get("badges", []),
    }

# ---------- Settings ----------
class SettingsReq(BaseModel):
    reduce_motion: Optional[bool] = None
    high_contrast: Optional[bool] = None
    sound: Optional[str] = None
    focus_length: Optional[int] = None
    buddy: Optional[str] = None

@api.patch("/settings")
async def update_settings(req: SettingsReq, user=Depends(get_current_user)):
    updates = {}
    s = req.model_dump(exclude_unset=True)
    for key in ("reduce_motion", "high_contrast", "sound"):
        if key in s:
            updates[f"settings.{key}"] = s[key]
    if "focus_length" in s:
        updates["focus_length"] = s["focus_length"]
    if "buddy" in s:
        updates["buddy"] = s["buddy"]
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return fresh

@api.get("/")
async def root():
    return {"message": "FocusFlow API alive"}

# ---------- Free-tier session usage ----------
@api.get("/focus/usage")
async def focus_usage(user=Depends(get_current_user)):
    today_iso = utcnow().date().isoformat()
    used = await db.focus_sessions.count_documents({
        "user_id": user["id"],
        "created_at": {"$gte": today_iso},
    })
    limit = 999 if user.get("is_pro", False) else 3
    return {"used": used, "limit": limit, "is_pro": user.get("is_pro", False)}

# ---------- Booster Packs ----------
@api.get("/shop/boosters")
async def list_boosters():
    return list(BOOSTER_PACKS.values())

class BoosterCheckoutReq(BaseModel):
    pack_id: str
    origin_url: str

@api.post("/shop/booster/checkout")
async def booster_checkout(req: BoosterCheckoutReq, http_request: Request, user=Depends(get_current_user)):
    pack = BOOSTER_PACKS.get(req.pack_id)
    if not pack:
        raise HTTPException(400, "Invalid pack")
    # MOCK PAYMENT: instantly grant XP (no real Stripe charge for boosters per spec)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"xp": pack["xp"]}})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    new_xp = fresh.get("xp", 0)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "kind": "booster_mock",
        "pack_id": pack["id"],
        "amount": pack["amount"],
        "currency": "usd",
        "xp_granted": pack["xp"],
        "payment_status": "paid_mock",
        "created_at": iso(utcnow()),
    })
    return {"ok": True, "xp": new_xp, "xp_granted": pack["xp"], "pack": pack}

# ---------- Stripe Pro checkout ----------
class ProCheckoutReq(BaseModel):
    origin_url: str

@api.post("/checkout/pro/session")
async def create_pro_checkout(req: ProCheckoutReq, http_request: Request, user=Depends(get_current_user)):
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe not configured")
    host = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host}/api/webhook/stripe"
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    success_url = f"{req.origin_url}/dashboard?upgrade=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/pricing"
    metadata = {"user_id": user["id"], "kind": "pro_subscription", "plan": PRO_PLAN["id"]}
    creq = CheckoutSessionRequest(
        amount=float(PRO_PLAN["amount"]),
        currency=PRO_PLAN["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await sc.create_checkout_session(creq)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "kind": "pro_subscription",
        "session_id": session.session_id,
        "amount": float(PRO_PLAN["amount"]),
        "currency": PRO_PLAN["currency"],
        "metadata": metadata,
        "payment_status": "initiated",
        "created_at": iso(utcnow()),
    })
    return {"url": session.url, "session_id": session.session_id}

@api.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, http_request: Request, user=Depends(get_current_user)):
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe not configured")
    host = str(http_request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host}/api/webhook/stripe")
    try:
        status = await sc.get_checkout_status(session_id)
    except Exception as e:
        msg = str(e).lower()
        if "no such" in msg or "resource_missing" in msg or "not found" in msg:
            raise HTTPException(404, "Checkout session not found")
        raise HTTPException(500, f"Stripe status check failed: {e}")
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if txn and txn.get("payment_status") != "paid":
        if status.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "completed_at": iso(utcnow())}}
            )
            if txn.get("kind") == "pro_subscription":
                await db.users.update_one({"id": txn["user_id"]}, {"$set": {"is_pro": True}})
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe not configured")
    host = str(request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host}/api/webhook/stripe")
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await sc.handle_webhook(body, sig)
    except Exception as e:
        logging.exception("webhook fail")
        raise HTTPException(400, f"Bad webhook: {e}")
    if event.payment_status == "paid" and event.session_id:
        txn = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
        if txn and txn.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "paid", "completed_at": iso(utcnow())}}
            )
            if txn.get("kind") == "pro_subscription":
                await db.users.update_one({"id": txn["user_id"]}, {"$set": {"is_pro": True}})
    return {"ok": True}

# ---------- Waitlist ----------
class WaitlistReq(BaseModel):
    email: EmailStr

@api.post("/waitlist")
async def join_waitlist(req: WaitlistReq):
    existing = await db.waitlist.find_one({"email": req.email.lower()})
    if existing:
        return {"ok": True, "already": True}
    await db.waitlist.insert_one({
        "id": str(uuid.uuid4()),
        "email": req.email.lower(),
        "created_at": iso(utcnow()),
    })
    return {"ok": True, "already": False}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
