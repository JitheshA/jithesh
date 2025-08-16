import { useState } from "react";
import axios from "axios";

const API = "/api";

export default function Calculator() {
  const [form, setForm] = useState({
    age: 28,
    sex: "male",
    height_cm: 175,
    weight_kg: 75,
    activity_level: "moderate",
    goal: "maintain",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "age" || name.includes("_cm") || name.includes("_kg") ? Number(value) : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/calc/tdee`, form);
      setResult(data);
    } catch (err) {
      setError("Failed to calculate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-4">TDEE & Macros Calculator</h1>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded">
        <label className="flex flex-col">
          <span className="text-sm text-gray-300 mb-1">Age</span>
          <input className="p-2 rounded bg-gray-800 text-white" type="number" name="age" value={form.age} onChange={onChange} required />
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-gray-300 mb-1">Sex</span>
          <select className="p-2 rounded bg-gray-800 text-white" name="sex" value={form.sex} onChange={onChange}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-gray-300 mb-1">Height (cm)</span>
          <input className="p-2 rounded bg-gray-800 text-white" type="number" name="height_cm" value={form.height_cm} onChange={onChange} required />
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-gray-300 mb-1">Weight (kg)</span>
          <input className="p-2 rounded bg-gray-800 text-white" type="number" name="weight_kg" value={form.weight_kg} onChange={onChange} required />
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-gray-300 mb-1">Activity Level</span>
          <select className="p-2 rounded bg-gray-800 text-white" name="activity_level" value={form.activity_level} onChange={onChange}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="very_active">Very Active</option>
            <option value="extra_active">Extra Active</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-gray-300 mb-1">Goal</span>
          <select className="p-2 rounded bg-gray-800 text-white" name="goal" value={form.goal} onChange={onChange}>
            <option value="cut">Cut</option>
            <option value="maintain">Maintain</option>
            <option value="lean_bulk">Lean Bulk</option>
            <option value="bulk">Bulk</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded">
            {loading ? "Calculating..." : "Calculate"}
          </button>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
      </form>

      {result && (
        <div className="mt-6 bg-gray-800 text-white p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm">BMR</p>
              <p className="text-lg">{result.bmr} kcal</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">TDEE</p>
              <p className="text-lg">{result.tdee} kcal</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Target Calories</p>
              <p className="text-lg">{result.target_calories} kcal</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Activity Multiplier</p>
              <p className="text-lg">{result.activity_multiplier}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-gray-400 text-sm">Protein</p>
              <p className="text-lg">{result.protein_g} g</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Carbs</p>
              <p className="text-lg">{result.carbs_g} g</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Fat</p>
              <p className="text-lg">{result.fat_g} g</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}