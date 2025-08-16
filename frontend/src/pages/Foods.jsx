import { useEffect, useState } from "react";
import axios from "axios";

const API = "/api";

export default function Foods() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFoods = async (q = "") => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/foods`, { params: q ? { q } : {} });
      setFoods(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods("");
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Food Database</h1>
      <div className="flex gap-2 mb-4">
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
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Food</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Serving (g)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Calories</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Protein (g)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Carbs (g)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fat (g)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {foods.map((f) => (
                <tr key={f.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2">{f.name}</td>
                  <td className="px-4 py-2">{f.serving_size_g}</td>
                  <td className="px-4 py-2">{f.calories}</td>
                  <td className="px-4 py-2">{f.protein_g}</td>
                  <td className="px-4 py-2">{f.carbs_g}</td>
                  <td className="px-4 py-2">{f.fat_g}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}