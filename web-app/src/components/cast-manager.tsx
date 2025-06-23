import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CharacterManager } from "./character-manager";

export function CastManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCast, setSelectedCast] = useState<Id<"casts"> | null>(null);
  const [newCastName, setNewCastName] = useState("");

  const casts = useQuery(api.casts.getCasts);
  const createCast = useMutation(api.casts.createCast);
  const deleteCast = useMutation(api.casts.deleteCast);

  const handleCreateCast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCastName.trim()) return;

    try {
      await createCast({ name: newCastName.trim() });
      setNewCastName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create cast:", error);
    }
  };

  const handleDeleteCast = async (castId: Id<"casts">) => {
    if (!confirm("Are you sure you want to delete this cast? This will also delete all associated characters.")) {
      return;
    }

    try {
      await deleteCast({ castId });
      if (selectedCast === castId) {
        setSelectedCast(null);
      }
    } catch (error) {
      console.error("Failed to delete cast:", error);
    }
  };

  if (selectedCast) {
    return (
      <div>
        <button
          onClick={() => setSelectedCast(null)}
          className="mb-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          ← Back to Casts
        </button>
        <CharacterManager />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Character Casts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your anime character casts for different scenarios
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Cast
        </button>
      </div>

      {/* Create Cast Form */}
      {isCreating && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleCreateCast} className="space-y-4">
            <div>
              <label htmlFor="castName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cast Name
              </label>
              <input
                type="text"
                id="castName"
                value={newCastName}
                onChange={(e) => setNewCastName(e.target.value)}
                placeholder="e.g., Jujutsu Kaisen, Naruto, My Hero Academia"
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                autoFocus
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!newCastName.trim()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Create Cast
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewCastName("");
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Casts Grid */}
      {casts && casts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {casts.map((cast) => (
            <CastCard
              key={cast._id}
              cast={cast}
              onSelect={() => setSelectedCast(cast._id)}
              onDelete={() => handleDeleteCast(cast._id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No casts yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first character cast.
          </p>
        </div>
      )}
    </div>
  );
}

function CastCard({
  cast,
  onSelect,
  onDelete
}: {
  cast: { _id: Id<"casts">; name: string; _creationTime: number };
  onSelect: () => void;
  onDelete: () => void;
}) {
  const characters = useQuery(api.characters.getCharactersByCast, { castId: cast._id });

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {cast.name}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={onSelect}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
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
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {characters ? (
            `${characters.length} character${characters.length !== 1 ? 's' : ''}`
          ) : (
            'Loading...'
          )}
        </div>
        <div className="mt-4">
          <button
            onClick={onSelect}
            className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 font-medium py-2 px-4 rounded-md text-sm transition-colors"
          >
            Manage Characters
          </button>
        </div>
      </div>
    </div>
  );
}