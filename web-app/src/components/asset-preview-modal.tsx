import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AssetPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetUrl: string | null;
    assetType: string;
}

export function AssetPreviewModal({
    isOpen,
    onClose,
    assetUrl,
    assetType,
}: AssetPreviewModalProps) {
    if (!isOpen || !assetUrl) {
        return null;
    }

    const renderPreview = () => {
        switch (assetType) {
            case "character-asset":
                return (
                    <img
                        src={assetUrl}
                        alt="Asset preview"
                        className="w-full rounded-md"
                    />
                );
            case "background-asset":
                return (
                    <video src={assetUrl} controls className="w-full rounded-md" />
                );
            case "sound-effect":
                return <audio src={assetUrl} controls className="w-full" />;
            default:
                return <p>Unsupported asset type for preview.</p>;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Asset Preview</DialogTitle>
                </DialogHeader>
                <div className="mt-4">{renderPreview()}</div>
            </DialogContent>
        </Dialog>
    );
} 