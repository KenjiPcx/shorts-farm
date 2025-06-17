import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function AssetManager() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<"character-asset" | "background-asset" | "sound-effect">("character-asset");
  const [newAsset, setNewAsset] = useState({
    name: "",
    description: "",
    file: null as File | null,
  });

  const assets = useQuery(api.queries.getAssets);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const createAsset = useMutation(api.assets.createAsset);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewAsset({ ...newAsset, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.file || !newAsset.name.trim() || !newAsset.description.trim()) return;

    setIsUploading(true);
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: newAsset.file,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      const { storageId } = await response.json();
      
      // Create asset record
      await createAsset({
        storageId,
        name: newAsset.name.trim(),
        description: newAsset.description.trim(),
        type: selectedType,
      });
      
      // Reset form
      setNewAsset({ name: "", description: "", file: null });
      setIsUploading(false);
    } catch (error) {
      console.error("Failed to upload asset:", error);
      setIsUploading(false);
    }
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case "character-asset":
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "background-asset":
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "sound-effect":
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828 2.829a9 9 0 010-12.728m-9.899-2.122a1 1 0 011.418 0L12 5.364l2.122-2.121a1 1 0 011.414 1.414L13.414 6.778a1 1 0 01-1.414 0L9.879 4.657a1 1 0 010-1.415z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case "character-asset":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900";
      case "background-asset":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
      case "sound-effect":
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Asset Library</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload and manage character assets, backgrounds, and sound effects
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Upload New Asset</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="assetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                type="text"
                id="assetName"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                placeholder="Asset name"
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="assetType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>
              <select
                id="assetType"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="character-asset">Character Asset</option>
                <option value="background-asset">Background Asset</option>
                <option value="sound-effect">Sound Effect</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="assetDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="assetDescription"
              rows={2}
              value={newAsset.description}
              onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
              placeholder="Describe this asset..."
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="assetFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              File
            </label>
            <input
              type="file"
              id="assetFile"
              onChange={handleFileChange}
              accept="image/*,audio/*,video/*"
              className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-400"
            />
          </div>
          
          <button
            type="submit"
            disabled={isUploading || !newAsset.file || !newAsset.name.trim() || !newAsset.description.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Asset
              </>
            )}
          </button>
        </form>
      </div>

      {/* Assets Grid */}
      {assets && assets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset._id} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${getAssetTypeColor(asset.type)}`}>
                    {getAssetTypeIcon(asset.type)}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {asset.type.replace('-', ' ')}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {asset.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {asset.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assets yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload your first asset to get started.
          </p>
        </div>
      )}
    </div>
  );
}