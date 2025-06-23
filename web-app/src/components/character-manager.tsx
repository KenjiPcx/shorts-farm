import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function CharacterManager() {
  const [selectedCastId, setSelectedCastId] = useState<Id<"casts"> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<Id<"characters"> | null>(null);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    description: "",
    voiceId: "",
    assets: [] as File[],
  });

  const casts = useQuery(api.casts.getCasts);
  const characters = useQuery(
    api.characters.getCharactersByCast,
    selectedCastId ? { castId: selectedCastId } : "skip"
  );
  const createCharacter = useMutation(api.characters.createCharacter);
  const deleteCharacter = useMutation(api.characters.deleteCharacter);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const createAsset = useMutation(api.assets.createAsset);

  const selectedCast = casts?.find(c => c._id === selectedCastId);

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharacter.name.trim() || !newCharacter.description.trim() || !selectedCastId) return;

    try {
      // 1. Create the character record
      const characterId = await createCharacter({
        name: newCharacter.name.trim(),
        description: newCharacter.description.trim(),
        castId: selectedCastId,
        voiceId: newCharacter.voiceId.trim(),
      });

      // 2. Upload assets for the new character
      for (const assetFile of newCharacter.assets) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, { method: "POST", body: assetFile });
        const { storageId } = await response.json();

        await createAsset({
          storageId,
          name: assetFile.name.split('.')[0], // Use filename as asset name
          description: `Asset for ${newCharacter.name}`,
          type: 'character-asset',
          characterId: characterId,
          castId: selectedCastId
        });
      }

      // 3. Reset form
      setNewCharacter({ name: "", description: "", voiceId: "", assets: [] });
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create character:", error);
      alert("Failed to create character. See console for details.");
    }
  };

  const handleDeleteCharacter = async (characterId: Id<"characters">) => {
    if (!confirm("Are you sure you want to delete this character? This cannot be undone.")) {
      return;
    }
    try {
      await deleteCharacter({ characterId });
    } catch (error) {
      console.error("Failed to delete character:", error);
      alert("Failed to delete character. See console for details.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select a Cast</CardTitle>
          <CardDescription>Choose a cast to view and manage its characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(value) => setSelectedCastId(value as Id<"casts">)}>
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder="Select a cast..." />
            </SelectTrigger>
            <SelectContent>
              {casts?.map(cast => (
                <SelectItem key={cast._id} value={cast._id}>{cast.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCastId && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              Managing Characters for: <span className="text-blue-600">{selectedCast?.name}</span>
            </h2>
            <Button onClick={() => setIsCreating(true)}>
              Add Character
            </Button>
          </div>

          {isCreating && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Character</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCharacter} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="characterName">Character Name</Label>
                    <Input id="characterName" value={newCharacter.name} onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })} placeholder="e.g., 'Kyle Broflovski'" autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="characterDescription">Description</Label>
                    <Textarea id="characterDescription" value={newCharacter.description} onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })} placeholder="e.g., 'The smart, often cynical one...'" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voiceId">Voice ID</Label>
                    <Input id="voiceId" value={newCharacter.voiceId} onChange={(e) => setNewCharacter({ ...newCharacter, voiceId: e.target.value })} placeholder="Enter the voice ID for TTS" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assets">Character Assets</Label>
                    <Input id="assets" type="file" multiple onChange={(e) => setNewCharacter({ ...newCharacter, assets: Array.from(e.target.files || []) })} />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" disabled={!newCharacter.name.trim() || !newCharacter.description.trim()}>
                      Save Character
                    </Button>
                    <Button variant="outline" type="button" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters?.map(character => (
              <Card key={character._id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {character.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-full">
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow">{character.description}</p>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setEditingCharacterId(character._id)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCharacter(character._id)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {characters?.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-medium">No characters in this cast yet.</h3>
              <p className="text-sm text-gray-500 mt-1">Click "Add Character" to create one.</p>
            </div>
          )}
        </div>
      )}

      {editingCharacterId && (
        <CharacterEditModal
          characterId={editingCharacterId}
          isOpen={!!editingCharacterId}
          onClose={() => setEditingCharacterId(null)}
        />
      )}
    </div>
  );
}

function CharacterEditModal({ characterId, isOpen, onClose }: { characterId: Id<"characters">, isOpen: boolean, onClose: () => void }) {
  const character = useQuery(api.characters.getWithAssets, { characterId });
  const updateCharacter = useMutation(api.characters.update);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const createAsset = useMutation(api.assets.createAsset);
  const deleteAsset = useMutation(api.assets.deleteAsset);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetDescription, setNewAssetDescription] = useState("");
  const [newAssetFile, setNewAssetFile] = useState<File | null>(null);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setDescription(character.description);
    }
  }, [character]);

  const handleUpdate = async () => {
    await updateCharacter({ characterId, name, description });
    onClose();
  };

  const handleAssetUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!character || !newAssetFile || !newAssetName.trim()) return;

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, { method: "POST", body: newAssetFile });
      const { storageId } = await response.json();

      await createAsset({
        storageId,
        name: newAssetName.trim(),
        description: newAssetDescription.trim(),
        type: 'character-asset',
        characterId: character._id,
        castId: character.castId
      });

      setNewAssetName("");
      setNewAssetDescription("");
      setNewAssetFile(null);
      const fileInput = document.getElementById('asset-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error) {
      console.error(error);
      alert("Failed to upload asset");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssetDelete = async (assetId: Id<"assets">) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    await deleteAsset({ assetId });
  }

  const handleClose = () => onClose();

  if (!character) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Character: {character.name}</DialogTitle>
          <DialogDescription>
            Update details and manage assets for this character.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Voice ID</Label>
            <Input value={character.voiceId || "Not set"} readOnly />
          </div>

          <div>
            <hr className="my-4" />
            <h3 className="text-lg font-medium mb-2">Assets</h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {character.assets.map(asset => (
                <Card key={asset._id} className="relative group">
                  <img src={asset.url} alt={asset.name} className="w-full h-24 object-cover rounded-t-md" />
                  <CardContent className="p-2">
                    <p className="text-sm font-medium truncate" title={asset.name}>{asset.name}</p>
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleAssetDelete(asset._id)}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <form onSubmit={handleAssetUpload} className="space-y-4 border p-4 rounded-md">
              <h4 className="font-medium">Add New Asset</h4>
              <div className="space-y-2">
                <Label htmlFor="asset-name">Asset Name (e.g., "happy")</Label>
                <Input id="asset-name" value={newAssetName} onChange={e => setNewAssetName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-description">Description (optional)</Label>
                <Input id="asset-description" value={newAssetDescription} onChange={e => setNewAssetDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-file-input">Asset File</Label>
                <Input id="asset-file-input" type="file" onChange={(e) => e.target.files && setNewAssetFile(e.target.files[0])} required />
              </div>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload Asset"}
              </Button>
            </form>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpdate}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}