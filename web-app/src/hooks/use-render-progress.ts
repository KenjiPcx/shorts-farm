import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

type Project = Doc<"projects">;

type RenderProgress =
    | {
        status: "initial";
    }
    | {
        status: "rendering";
        progress: number;
    }
    | {
        status: "done";
        url: string;
        size: number;
    }
    | {
        status: "error";
        error: Error;
    };

export const useRenderProgress = (project: Project | null | undefined) => {
    const [renderProgress, setRenderProgress] = useState<RenderProgress>({
        status: "initial",
    });
    const getProgress = useAction(api.remotion.getRenderProgressAction);

    useEffect(() => {
        if (
            project?.status !== "rendering" ||
            !project.renderId ||
            !project.bucketName
        ) {
            setRenderProgress({ status: "initial" });
            return;
        }

        let interval: NodeJS.Timeout;

        const checkProgress = async () => {
            try {
                const result = await getProgress({
                    renderId: project.renderId!,
                    bucketName: project.bucketName!,
                });

                if (result.outputFile) {
                    setRenderProgress({
                        status: "done",
                        url: result.outputFile,
                        size: result.outputSizeInBytes ?? 0,
                    });
                    clearInterval(interval);
                } else if (result.fatalErrorEncountered) {
                    setRenderProgress({
                        status: "error",
                        error: new Error(result.errors[0]?.message ?? "Unknown rendering error"),
                    });
                    clearInterval(interval);
                } else {
                    setRenderProgress({
                        status: "rendering",
                        progress: result.overallProgress,
                    });
                }
            } catch (err) {
                console.error("Failed to get render progress", err);
                setRenderProgress({
                    status: "error",
                    error: err instanceof Error ? err : new Error("Failed to fetch progress"),
                })
                clearInterval(interval);
            }
        };

        // Check immediately and then start polling
        checkProgress();
        interval = setInterval(checkProgress, 5000);

        return () => clearInterval(interval);
    }, [project, getProgress]);

    return renderProgress;
};
