import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Player } from "@remotion/player";
import { ShortsFarmComposition, ShortsFarmSchema } from "../../remotion/shorts-farm-composition";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { z } from "zod";
import { useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";
import { DURATION_IN_FRAMES, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "../../remotion/constants";

interface VideoPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: Id<"projects">;
}

export function VideoPreviewModal({
    isOpen,
    onClose,
    projectId,
}: VideoPreviewModalProps) {
    const script = useQuery(
        api.scripts.getScriptByProjectId,
        projectId ? { projectId: projectId } : "skip"
    );

    const backgroundAssets = useQuery(api.assets.getBackgroundAssets, projectId ? {} : "skip");
    const randomBackgroundAsset = useMemo(() => {
        return backgroundAssets?.[Math.floor(Math.random() * backgroundAssets.length)];
    }, [backgroundAssets]);

    const inputProps: z.infer<typeof ShortsFarmSchema> | null = useMemo(() => {
        if (!script) {
            return null;
        }
        return {
            renderData: {
                script,
                backgroundUrl: randomBackgroundAsset?.url ?? null,
            },
        };
    }, [script, projectId, randomBackgroundAsset]);

    if (!projectId || !inputProps) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Video Preview</DialogTitle>
                </DialogHeader>
                <div className="aspect-video">
                    {inputProps ? (
                        <Player
                            component={ShortsFarmComposition}
                            inputProps={inputProps}
                            durationInFrames={DURATION_IN_FRAMES}
                            fps={VIDEO_FPS}
                            compositionHeight={VIDEO_HEIGHT}
                            compositionWidth={VIDEO_WIDTH}
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                            controls
                            autoPlay
                            loop
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Spinner />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
} 