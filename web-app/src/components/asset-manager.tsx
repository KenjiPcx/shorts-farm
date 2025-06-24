import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetPreviewModal } from "./asset-preview-modal";
import { EditAssetModal } from "./edit-asset-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { TrashIcon, PencilIcon } from "lucide-react";

type Asset = Doc<"assets"> & { url?: string | null };

const assetTypeConfig = {
  "character-asset": {
    accept: "image/png,image/jpeg,image/gif",
    extensions: ["png", "jpg", "jpeg", "gif"],
  },
  "background-asset": {
    accept: "video/mp4,video/webm",
    extensions: ["mp4", "webm"],
  },
  "sound-effect": {
    accept: "audio/mpeg,audio/wav",
    extensions: ["mp3", "wav"],
  },
};

export function AssetManager() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadAssetType, setUploadAssetType] = useState<"character-asset" | "background-asset" | "sound-effect">("character-asset");
  const [filterAssetType, setFilterAssetType] = useState<"character-asset" | "background-asset" | "sound-effect" | "all">("all");
  const [newAsset, setNewAsset] = useState({
    name: "",
    description: "",
    file: null as File | null,
  });
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<Id<"characters"> | "">("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const characters = useQuery(api.characters.getAll);

  // Fetch all assets once
  const allAssets = useQuery(api.assets.getAssets, {});

  // Filter assets on the frontend
  const assets = useMemo(() => {
    if (!allAssets) return [];
    if (filterAssetType === 'all') {
      return allAssets;
    }
    return allAssets.filter(asset => asset && asset.type === filterAssetType);
  }, [allAssets, filterAssetType]);

  const generatePresignedUploadUrl = useMutation(api.assets.generatePresignedUploadUrl);
  const createAsset = useMutation(api.assets.createAsset);
  const deleteAsset = useMutation(api.assets.deleteAsset);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_FILE_SIZE_MB = 200;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setNewAsset({ ...newAsset, file: null });
        return;
      }

      const config = assetTypeConfig[uploadAssetType];
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension && config.extensions.includes(extension)) {
        setNewAsset({ ...newAsset, file });
      } else {
        alert(
          `Invalid file type for ${uploadAssetType}. Please upload one of the following: ${config.extensions.join(
            ", "
          )}`
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setNewAsset({ ...newAsset, file: null });
      }
    }
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsPreviewOpen(true);
  };

  const handleEditClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedAsset) {
      await deleteAsset({ assetId: selectedAsset._id });
      setIsDeleteAlertOpen(false);
      setSelectedAsset(null);
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedAsset(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.file || !newAsset.name.trim() || !newAsset.description.trim()) return;

    setIsUploading(true);
    try {
      // 1. Generate a pre-signed URL for upload
      const { presignedUrl, publicUrl } = await generatePresignedUploadUrl({
        fileName: newAsset.file.name,
        fileType: newAsset.file.type,
      });

      // 2. Upload the file to Tigris
      const response = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": newAsset.file.type },
        body: newAsset.file,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file to Tigris: ${await response.text()}`);
      }

      // 3. Create asset record in Convex
      await createAsset({
        url: publicUrl,
        name: newAsset.name.trim(),
        description: newAsset.description.trim(),
        type: uploadAssetType,
        characterId:
          uploadAssetType === "character-asset" && selectedCharacterId
            ? selectedCharacterId
            : undefined,
      });

      // Reset form
      setNewAsset({ name: "", description: "", file: null });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to upload asset:", error);
      alert(`Failed to upload asset: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
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
        <div>
          <Label htmlFor="filterAssetType">Filter by type</Label>
          <Select
            value={filterAssetType}
            onValueChange={(value) =>
              setFilterAssetType(
                value as
                | "character-asset"
                | "background-asset"
                | "sound-effect"
                | "all"
              )
            }
          >
            <SelectTrigger id="filterAssetType" className="mt-1 w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              <SelectItem value="character-asset">Character Assets</SelectItem>
              <SelectItem value="background-asset">Background Assets</SelectItem>
              <SelectItem value="sound-effect">Sound Effects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Upload New Asset</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetName">Name</Label>
              <Input
                type="text"
                id="assetName"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                placeholder="Asset name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="assetType">Type</Label>
              <Select
                value={uploadAssetType}
                onValueChange={(value) => {
                  const assetType = value as "character-asset" | "background-asset" | "sound-effect";
                  setUploadAssetType(assetType);
                  if (assetType !== "character-asset") {
                    setSelectedCharacterId("");
                  }
                }}
              >
                <SelectTrigger id="assetType" className="mt-1 w-full">
                  <SelectValue placeholder="Asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character-asset">Character Asset</SelectItem>
                  <SelectItem value="background-asset">Background Asset</SelectItem>
                  <SelectItem value="sound-effect">Sound Effect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {uploadAssetType === "character-asset" && (
            <div>
              <Label htmlFor="characterSelect">Character (Optional)</Label>
              <Select
                value={selectedCharacterId}
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedCharacterId("");
                  } else {
                    setSelectedCharacterId(value as Id<"characters">);
                  }
                }}
              >
                <SelectTrigger id="characterSelect" className="mt-1 w-full">
                  <SelectValue placeholder="Select a character" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {characters?.map((character) => (
                    <SelectItem key={character._id} value={character._id}>
                      {character.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="assetDescription">Description</Label>
            <Textarea
              id="assetDescription"
              rows={2}
              value={newAsset.description}
              onChange={(e) =>
                setNewAsset({ ...newAsset, description: e.target.value })
              }
              placeholder="Describe this asset..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="assetFile">File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              id="assetFile"
              onChange={handleFileChange}
              accept={assetTypeConfig[uploadAssetType].accept}
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={isUploading || !newAsset.file || !newAsset.name.trim() || !newAsset.description.trim()}
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
          </Button>
        </form>
      </div>

      {/* Assets Grid */}
      {assets && assets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset._id} className="group bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 relative">
              <div
                onClick={() => handleAssetClick(asset)}
                className="cursor-pointer p-4"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`p-2 rounded-lg ${getAssetTypeColor(
                      asset.type
                    )}`}
                  >
                    {getAssetTypeIcon(asset.type)}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {asset.type.replace("-", " ")}
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
              <div className="absolute bottom-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditClick(asset); }}>
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteClick(asset); }}>
                  <TrashIcon className="h-4 w-4 text-red-500" />
                </Button>
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
      <AssetPreviewModal
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        assetUrl={selectedAsset?.url || null}
        assetType={selectedAsset?.type || ""}
      />
      <EditAssetModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        asset={selectedAsset}
      />
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              asset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}