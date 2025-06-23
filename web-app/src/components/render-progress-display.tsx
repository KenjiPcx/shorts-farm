import { useRenderProgress } from "@/hooks/use-render-progress";
import { Progress } from "./ui/progress";
import { Doc } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const RenderProgressDisplay = ({ project }: { project: Doc<"projects"> }) => {
    const renderProgress = useRenderProgress(project);
    const video = useQuery(api.videos.getVideoByProjectId, project.status === 'done' ? { projectId: project._id } : "skip");

    console.log("Project status:", project.status);
    console.log("Render progress:", renderProgress);

    if (project.status === 'done' && video?.finalUrl) {
        return (
            <div className="mt-4">
                <p className="text-sm text-green-500 mb-2">Render complete!</p>
                <video src={video?.finalUrl} controls className="w-full rounded-lg" />
            </div>
        )
    }
    if (project.status !== 'rendering' || renderProgress.status === 'initial') {
        return null;
    }
    if (renderProgress.status === 'rendering') {
        return (
            <div>
                <p className="text-sm text-blue-400">Rendering video... {Math.round(renderProgress.progress * 100)}%</p>
                <Progress value={renderProgress.progress * 100} className="w-full mt-1" />
            </div>
        )
    }
    if (renderProgress.status === 'error') {
        return <p className="text-sm text-red-500">Render failed: {renderProgress.error.message}</p>
    }
    if (renderProgress.status === 'done') {
        return (
            <div className="mt-4">
                <p className="text-sm text-green-500 mb-2">Render complete!</p>
                <video src={renderProgress.url} controls className="w-full rounded-lg" />
            </div>
        )
    }
    return null;
}

export default RenderProgressDisplay; 