import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`;

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-white font-semibold">Gym Nutrition</Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <NavLink to="/" className={linkClass} end>
                Home
              </NavLink>
              <NavLink to="/calculator" className={linkClass}>
                Calculator
              </NavLink>
              <NavLink to="/foods" className={linkClass}>
                Foods
              </NavLink>
              <NavLink to="/meal-planner" className={linkClass}>
                Meal Planner
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}