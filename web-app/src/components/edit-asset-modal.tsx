import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Doc } from "../../convex/_generated/dataModel";

interface EditAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Doc<"assets"> | null;
}

export function EditAssetModal({
    isOpen,
    onClose,
    asset,
}: EditAssetModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const updateAsset = useMutation(api.assets.updateAsset);

    useEffect(() => {
        if (asset) {
            setName(asset.name);
            setDescription(asset.description);
        }
    }, [asset]);

    const handleSubmit = async () => {
        if (!asset) return;
        await updateAsset({ assetId: asset._id, name, description });
        onClose();
    };

    if (!isOpen || !asset) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Asset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 