import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "/api";

export default function MealPlanner() {
  const [foods, setFoods] = useState([]);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]); // { food_id, quantity_g }
  const [userId, setUserId] = useState("demo_user");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchFoods = async (q = "") => {
    const { data } = await axios.get(`${API}/foods`, { params: q ? { q } : {} });
    setFoods(data);
  };

  useEffect(() => {
    fetchFoods("");
  }, []);

  const addItem = (food) => {
    setItems((prev) => [...prev, { food_id: food.id, quantity_g: food.serving_size_g }]);
  };

  const updateQuantity = (idx, quantity) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity_g: Number(quantity) } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const nutrientTotals = useMemo(() => {
    const index = Object.fromEntries(foods.map((f) => [f.id, f]));
    let total = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    for (const it of items) {
      const food = index[it.food_id];
      if (!food) continue;
      const factor = it.quantity_g / food.serving_size_g;
      total.calories += food.calories * factor;
      total.protein_g += food.protein_g * factor;
      total.carbs_g += food.carbs_g * factor;
      total.fat_g += food.fat_g * factor;
    }
    return {
      calories: Math.round(total.calories * 10) / 10,
      protein_g: Math.round(total.protein_g * 10) / 10,
      carbs_g: Math.round(total.carbs_g * 10) / 10,
      fat_g: Math.round(total.fat_g * 10) / 10,
    };
  }, [items, foods]);

  const saveMeal = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = { user_id: userId, date, items };
      const { data } = await axios.post(`${API}/meal`, payload);
      setMessage(`Saved meal with ${data.total_calories} kcal`);
      setItems([]);
    } catch (e) {
      setMessage("Failed to save meal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Meal Planner</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Foods</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods..."
              className="flex-1 p-2 rounded bg-gray-800 text-white"
            />
            <button onClick={() => fetchFoods(query)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded">
              Search
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-800 rounded border border-gray-800">
            {foods.map((f) => (
              <div key={f.id} className="p-3 flex items-center justify-between hover:bg-gray-800/50">
                <div>
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.calories} kcal • P {f.protein_g}g • C {f.carbs_g}g • F {f.fat_g}g (per {f.serving_size_g}g)</p>
                </div>
                <button onClick={() => addItem(f)} className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">Add</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Meal</h2>
          <div className="flex gap-2 mb-3">
            <input value={userId} onChange={(e) => setUserId(e.target.value)} className="p-2 rounded bg-gray-800 text-white" placeholder="User ID" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 rounded bg-gray-800 text-white" />
          </div>
          <div className="rounded border border-gray-800">
            {items.length === 0 ? (
              <p className="text-gray-400 p-3">No items added yet.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left px-3 py-2">Food</th>
                    <th className="text-left px-3 py-2">Quantity (g)</th>
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const food = foods.find((f) => f.id === it.food_id);
                    return (
                      <tr key={`${it.food_id}-${idx}`} className="border-t border-gray-800">
                        <td className="px-3 py-2">{food ? food.name : it.food_id}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={it.quantity_g}
                            onChange={(e) => updateQuantity(idx, e.target.value)}
                            className="w-28 p-1 rounded bg-gray-800 text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeItem(idx)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Calories" value={`${nutrientTotals.calories} kcal`} />
            <Stat label="Protein" value={`${nutrientTotals.protein_g} g`} />
            <Stat label="Carbs" value={`${nutrientTotals.carbs_g} g`} />
            <Stat label="Fat" value={`${nutrientTotals.fat_g} g`} />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button disabled={saving || items.length === 0} onClick={saveMeal} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded">
              {saving ? "Saving..." : "Save Meal"}
            </button>
            {message && <span className="text-gray-300">{message}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-800 text-white p-3 rounded">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}