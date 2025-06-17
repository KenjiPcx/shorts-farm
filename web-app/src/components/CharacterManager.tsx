import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Props {
  castId: Id<"casts">;
}

export function CharacterManager({ castId }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    description: "",
  });

  const cast = useQuery(api.queries.getCasts)?.find(c => c._id === castId);
  const characters = useQuery(api.queries.getCharactersByCast, { castId });
  const createCharacter = useMutation(api.queries.createCharacter);
  const deleteCharacter = useMutation(api.queries.deleteCharacter);

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharacter.name.trim() || !newCharacter.description.trim()) return;

    try {
      await createCharacter({
        name: newCharacter.name.trim(),
        description: newCharacter.description.trim(),
        castId,
      });
      setNewCharacter({ name: "", description: "" });
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create character:", error);
    }
  };

  const handleDeleteCharacter = async (characterId: Id<"characters">) => {
    if (!confirm("Are you sure you want to delete this character?")) {
      return;
    }

    try {
      await deleteCharacter({ characterId });
    } catch (error) {
      console.error("Failed to delete character:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Characters in {cast?.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage the characters in this cast
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Character
        </button>
      </div>

      {/* Create Character Form */}
      {isCreating && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleCreateCharacter} className="space-y-4">
            <div>
              <label htmlFor="characterName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Character Name
              </label>
              <input
                type="text"
                id="characterName"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                placeholder="e.g., Gojo Satoru, Naruto Uzumaki"
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="characterDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="characterDescription"
                rows={3}
                value={newCharacter.description}
                onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                placeholder="Describe the character's personality, role, and teaching style..."
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!newCharacter.name.trim() || !newCharacter.description.trim()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Add Character
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewCharacter({ name: "", description: "" });
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Characters List */}
      {characters && characters.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <CharacterCard
              key={character._id}
              character={character}
              onDelete={() => handleDeleteCharacter(character._id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No characters yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add characters to this cast to get started.
          </p>
        </div>
      )}
    </div>
  );
}

function CharacterCard({ 
  character, 
  onDelete 
}: { 
  character: {
    _id: Id<"characters">;
    name: string;
    description: string;
    castId: Id<"casts">;
    assets?: Id<"assets">[];
    _creationTime: number;
  };
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {character.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
              {character.description}
            </p>
          </div>
          <button
            onClick={onDelete}
            className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM6 6v12h12V6H6zM9 8v8M15 8v8" />
          </svg>
          Assets: {character.assets?.length || 0}
        </div>
      </div>
    </div>
  );
}