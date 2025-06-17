import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CastManager } from "./CastManager";
import { ProjectManager } from "./ProjectManager";
import { AssetManager } from "./AssetManager";

type Tab = "projects" | "casts" | "assets";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const projects = useQuery(api.queries.getMyProjects);
  const casts = useQuery(api.queries.getCasts);

  const tabs = [
    { id: "projects", name: "Projects", count: projects?.length || 0 },
    { id: "casts", name: "Casts", count: casts?.length || 0 },
    { id: "assets", name: "Assets", count: 0 },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome to Brainrot Academy
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create and manage your AI-powered educational content with anime characters
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex space-x-4">
                <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {projects?.length || 0}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Active Projects</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {casts?.length || 0}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Character Casts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }
                `}
              >
                {tab.name}
                {tab.count > 0 && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "projects" && <ProjectManager />}
          {activeTab === "casts" && <CastManager />}
          {activeTab === "assets" && <AssetManager />}
        </div>
      </div>
    </div>
  );
}