// PATH: src/pages/admin/AdminHomePage.tsx

import { NavLink } from "react-router-dom";
import clsx from "clsx";

function navCardClasses(active: boolean) {
  return clsx(
    "block rounded-2xl border p-4 transition",
    active
      ? "border-primary-300 bg-primary-50 text-primary-700"
      : "border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:bg-slate-50"
  );
}

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Administrative control area for Community Impact.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => navCardClasses(isActive)}
          >
            <div className="text-base font-semibold">Admin Home</div>
            <div className="mt-1 text-sm text-slate-500">
              Overview and admin landing page.
            </div>
          </NavLink>

          <NavLink
            to="/admin/monitoring"
            className={({ isActive }) => navCardClasses(isActive)}
          >
            <div className="text-base font-semibold">Monitoring</div>
            <div className="mt-1 text-sm text-slate-500">
              Read-only monitoring for batch health, allocation, reserves, and
              exceptions.
            </div>
          </NavLink>

          <NavLink
            to="/admin/rewards"
            className={({ isActive }) => navCardClasses(isActive)}
          >
            <div className="text-base font-semibold">Rewards</div>
            <div className="mt-1 text-sm text-slate-500">
              Create and manage rewards.
            </div>
          </NavLink>

          <NavLink
            to="/admin/execution"
            className={({ isActive }) => navCardClasses(isActive)}
          >
            <div className="text-base font-semibold">Execution</div>
            <div className="mt-1 text-sm text-slate-500">
              Execute reward batches and confirm results.
            </div>
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) => navCardClasses(isActive)}
          >
            <div className="text-base font-semibold">Users</div>
            <div className="mt-1 text-sm text-slate-500">
              Manage users and roles.
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
}