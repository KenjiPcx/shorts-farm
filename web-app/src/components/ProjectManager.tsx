import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function ProjectManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    topic: "",
    castId: "" as Id<"casts"> | "",
  });

  const projects = useQuery(api.queries.getMyProjects);
  const casts = useQuery(api.queries.getCasts);
  const createProject = useMutation(api.queries.createProject);
  const deleteProject = useMutation(api.queries.deleteProject);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.topic.trim()) return;

    try {
      await createProject({
        topic: newProject.topic.trim(),
        castId: newProject.castId || undefined,
      });
      setNewProject({ topic: "", castId: "" });
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleDeleteProject = async (projectId: Id<"projects">) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }

    try {
      await deleteProject({ projectId });
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "gathering":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900";
      case "planning":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900";
      case "writing":
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900";
      case "generating":
        return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900";
      case "rendering":
        return "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900";
      case "done":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
      case "error":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "gathering":
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case "planning":
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case "writing":
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case "generating":
        return (
          <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case "rendering":
        return (
          <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case "done":
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Projects</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage your brainrot educational content projects
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Project
        </button>
      </div>

      {/* Create Project Form */}
      {isCreating && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label htmlFor="projectTopic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Topic
              </label>
              <input
                type="text"
                id="projectTopic"
                value={newProject.topic}
                onChange={(e) => setNewProject({ ...newProject, topic: e.target.value })}
                placeholder="e.g., React Hooks, Machine Learning Basics, TypeScript Generics"
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="projectCast" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Character Cast (Optional)
              </label>
              <select
                id="projectCast"
                value={newProject.castId}
                onChange={(e) => setNewProject({ ...newProject, castId: e.target.value as Id<"casts"> | "" })}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="">Select a cast...</option>
                {casts?.map((cast) => (
                  <option key={cast._id} value={cast._id}>
                    {cast.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!newProject.topic.trim()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Create Project
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewProject({ topic: "", castId: "" });
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      {projects && projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              casts={casts || []}
              onDelete={() => handleDeleteProject(project._id)}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your first project to start generating content.
          </p>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ 
  project, 
  casts,
  onDelete,
  getStatusColor,
  getStatusIcon
}: { 
  project: {
    _id: Id<"projects">;
    topic: string;
    userId: string;
    castId?: Id<"casts">;
    status: "gathering" | "planning" | "writing" | "generating" | "rendering" | "done" | "error";
    plan?: string;
    scriptId?: Id<"scripts">;
    videoId?: Id<"videos">;
    _creationTime: number;
  };
  casts: { _id: Id<"casts">; name: string; _creationTime: number }[];
  onDelete: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}) {
  const cast = project.castId ? casts.find(c => c._id === project.castId) : null;

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {project.topic}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {getStatusIcon(project.status)}
                <span className="ml-1 capitalize">{project.status}</span>
              </span>
            </div>
            {cast && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Cast: {cast.name}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Created {new Date(project._creationTime).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{getProgressPercentage(project.status)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage(project.status)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getProgressPercentage(status: string): number {
  switch (status) {
    case "gathering": return 10;
    case "planning": return 25;
    case "writing": return 50;
    case "generating": return 75;
    case "rendering": return 90;
    case "done": return 100;
    case "error": return 0;
    default: return 0;
  }
}