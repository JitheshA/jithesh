from fastapi import FastAPI, APIRouter, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Optional MongoDB connection (fallback to in-memory if not configured)
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'app')
client: Optional[AsyncIOMotorClient] = None
_db = None

if MONGO_URL:
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        _db = client[DB_NAME]
    except Exception as e:
        client = None
        _db = None

# In-memory datastore fallback
IN_MEMORY_STORE: Dict[str, List[dict]] = {
    'status_checks': [],
    'meals': [],
}

# Create the main app without a prefix
app = FastAPI(title="Gym Nutrition API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str


class FoodItem(BaseModel):
    id: str
    name: str
    serving_size_g: float = 100.0
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


class MealItem(BaseModel):
    food_id: str
    quantity_g: float

class MealCreate(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD
    items: List[MealItem]

class Meal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    items: List[MealItem]
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float


class TdeeInput(BaseModel):
    age: int
    sex: str  # 'male' | 'female'
    height_cm: float
    weight_kg: float
    activity_level: str  # sedentary, light, moderate, very_active, extra_active
    goal: str = 'maintain'  # cut | maintain | lean_bulk | bulk

class TdeeResult(BaseModel):
    bmr: float
    activity_multiplier: float
    tdee: float
    target_calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


# Sample foods database (per 100g)
FOODS: List[FoodItem] = [
    FoodItem(id="chicken_breast", name="Chicken Breast (cooked)", serving_size_g=100, calories=165, protein_g=31, carbs_g=0, fat_g=3.6),
    FoodItem(id="salmon", name="Salmon (cooked)", serving_size_g=100, calories=208, protein_g=20, carbs_g=0, fat_g=13),
    FoodItem(id="beef_lean", name="Beef 90% Lean (cooked)", serving_size_g=100, calories=250, protein_g=26, carbs_g=0, fat_g=15),
    FoodItem(id="rice_white", name="Rice, White (cooked)", serving_size_g=100, calories=130, protein_g=2.4, carbs_g=28, fat_g=0.3),
    FoodItem(id="rice_brown", name="Rice, Brown (cooked)", serving_size_g=100, calories=123, protein_g=2.7, carbs_g=25.6, fat_g=1),
    FoodItem(id="oats", name="Oats (dry)", serving_size_g=100, calories=389, protein_g=16.9, carbs_g=66.3, fat_g=6.9),
    FoodItem(id="quinoa", name="Quinoa (cooked)", serving_size_g=100, calories=120, protein_g=4.4, carbs_g=21.3, fat_g=1.9),
    FoodItem(id="sweet_potato", name="Sweet Potato (cooked)", serving_size_g=100, calories=86, protein_g=1.6, carbs_g=20.1, fat_g=0.1),
    FoodItem(id="banana", name="Banana", serving_size_g=100, calories=89, protein_g=1.1, carbs_g=23, fat_g=0.3),
    FoodItem(id="apple", name="Apple", serving_size_g=100, calories=52, protein_g=0.3, carbs_g=14, fat_g=0.2),
    FoodItem(id="broccoli", name="Broccoli (cooked)", serving_size_g=100, calories=55, protein_g=3.7, carbs_g=11.1, fat_g=0.6),
    FoodItem(id="olive_oil", name="Olive Oil", serving_size_g=100, calories=884, protein_g=0, carbs_g=0, fat_g=100),
    FoodItem(id="peanut_butter", name="Peanut Butter", serving_size_g=100, calories=588, protein_g=25, carbs_g=20, fat_g=50),
    FoodItem(id="almonds", name="Almonds", serving_size_g=100, calories=579, protein_g=21, carbs_g=22, fat_g=50),
    FoodItem(id="milk_2pct", name="Milk 2%", serving_size_g=100, calories=50, protein_g=3.4, carbs_g=5, fat_g=2),
    FoodItem(id="greek_yogurt", name="Greek Yogurt, Nonfat", serving_size_g=100, calories=59, protein_g=10, carbs_g=3.6, fat_g=0.4),
    FoodItem(id="cottage_cheese", name="Cottage Cheese, Low-Fat", serving_size_g=100, calories=98, protein_g=11.1, carbs_g=3.4, fat_g=4.3),
    FoodItem(id="eggs", name="Eggs (whole)", serving_size_g=100, calories=155, protein_g=13, carbs_g=1.1, fat_g=11),
    FoodItem(id="tuna", name="Tuna (canned in water)", serving_size_g=100, calories=132, protein_g=29, carbs_g=0, fat_g=1),
    FoodItem(id="whey_protein", name="Whey Protein Powder", serving_size_g=30, calories=120, protein_g=24, carbs_g=3, fat_g=1.5),
]

FOOD_INDEX: Dict[str, FoodItem] = {f.id: f for f in FOODS}


def calculate_meal_totals(items: List[MealItem]) -> Dict[str, float]:
    total_calories = 0.0
    total_protein_g = 0.0
    total_carbs_g = 0.0
    total_fat_g = 0.0

    for item in items:
        food = FOOD_INDEX.get(item.food_id)
        if not food:
            continue
        factor = item.quantity_g / food.serving_size_g
        total_calories += food.calories * factor
        total_protein_g += food.protein_g * factor
        total_carbs_g += food.carbs_g * factor
        total_fat_g += food.fat_g * factor

    return {
        'total_calories': round(total_calories, 1),
        'total_protein_g': round(total_protein_g, 1),
        'total_carbs_g': round(total_carbs_g, 1),
        'total_fat_g': round(total_fat_g, 1),
    }


def get_activity_multiplier(activity_level: str) -> float:
    mapping = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'very_active': 1.725,
        'extra_active': 1.9,
    }
    return mapping.get(activity_level, 1.2)


def calculate_tdee_and_macros(payload: TdeeInput) -> TdeeResult:
    is_male = payload.sex.lower() == 'male'
    if is_male:
        bmr = 10 * payload.weight_kg + 6.25 * payload.height_cm - 5 * payload.age + 5
    else:
        bmr = 10 * payload.weight_kg + 6.25 * payload.height_cm - 5 * payload.age - 161

    activity_multiplier = get_activity_multiplier(payload.activity_level.lower())
    tdee = bmr * activity_multiplier

    # Goal adjustment
    goal = payload.goal.lower()
    adjustment = 0
    if goal == 'cut':
        adjustment = -500
    elif goal == 'lean_bulk':
        adjustment = 250
    elif goal == 'bulk':
        adjustment = 500
    target_calories = max(1200.0, tdee + adjustment)

    # Macro allocation
    protein_g = 2.0 * payload.weight_kg  # 2 g/kg
    fat_g = 0.8 * payload.weight_kg      # 0.8 g/kg
    protein_kcal = protein_g * 4
    fat_kcal = fat_g * 9
    remaining_kcal = max(0.0, target_calories - protein_kcal - fat_kcal)
    carbs_g = remaining_kcal / 4

    return TdeeResult(
        bmr=round(bmr, 1),
        activity_multiplier=round(activity_multiplier, 3),
        tdee=round(tdee, 1),
        target_calories=round(target_calories, 1),
        protein_g=round(protein_g, 1),
        carbs_g=round(carbs_g, 1),
        fat_g=round(fat_g, 1),
    )


# Routes
@api_router.get("/")
async def root():
    return {"message": "Gym Nutrition API is live"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(client_name=input.client_name)
    if _db is not None:
        _ = await _db.status_checks.insert_one(status_obj.model_dump())
    else:
        IN_MEMORY_STORE['status_checks'].append(status_obj.model_dump())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if _db is not None:
        status_checks = await _db.status_checks.find().to_list(1000)
        return [StatusCheck(**status_check) for status_check in status_checks]
    else:
        return [StatusCheck(**s) for s in IN_MEMORY_STORE['status_checks']]


@api_router.get("/foods", response_model=List[FoodItem])
async def list_foods(q: Optional[str] = Query(default=None, description="Search query")):
    if not q:
        return FOODS
    query_lower = q.lower()
    return [f for f in FOODS if query_lower in f.name.lower() or query_lower in f.id.lower()]


@api_router.post("/meal", response_model=Meal)
async def create_meal(meal: MealCreate):
    totals = calculate_meal_totals(meal.items)
    saved = Meal(
        user_id=meal.user_id,
        date=meal.date,
        items=meal.items,
        total_calories=totals['total_calories'],
        total_protein_g=totals['total_protein_g'],
        total_carbs_g=totals['total_carbs_g'],
        total_fat_g=totals['total_fat_g'],
    )

    if _db is not None:
        _ = await _db.meals.insert_one(saved.model_dump())
    else:
        IN_MEMORY_STORE['meals'].append(saved.model_dump())

    return saved


@api_router.get("/meals", response_model=List[Meal])
async def get_meals(user_id: str, date: Optional[str] = None):
    results: List[Meal] = []
    if _db is not None:
        query: Dict[str, str] = {'user_id': user_id}
        if date:
            query['date'] = date
        docs = await _db.meals.find(query).to_list(1000)
        results = [Meal(**doc) for doc in docs]
    else:
        for m in IN_MEMORY_STORE['meals']:
            if m['user_id'] == user_id and (date is None or m['date'] == date):
                results.append(Meal(**m))
    return results


@api_router.post("/calc/tdee", response_model=TdeeResult)
async def calc_tdee(input: TdeeInput):
    return calculate_tdee_and_macros(input)


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
