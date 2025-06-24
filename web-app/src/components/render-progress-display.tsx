import { useRenderProgress } from "@/hooks/use-render-progress";
import { Progress } from "./ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";
import { ProjectWithScript } from "../../convex/projects";

const RenderProgressDisplay = ({ project }: { project: ProjectWithScript }) => {
    const renderProgress = useRenderProgress(project);
    const finalVideoUrl = project.videoUrl ?? (renderProgress.status === 'done' ? renderProgress.url : null);

    if (project.status === 'done' && finalVideoUrl) {
        return (
            <Collapsible className="mt-4 w-full">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex items-center justify-start p-0 h-auto text-sm font-semibold text-green-500 hover:text-green-600">
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Render Complete! View Video
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                    <video src={finalVideoUrl} controls className="w-1/2 rounded-lg" />
                </CollapsibleContent>
            </Collapsible>
        )
    }

    if (project.status !== 'rendering' || renderProgress.status === 'initial') {
        return null;
    }

    if (renderProgress.status === 'rendering') {
        return (
            <div className="mt-4 space-y-1">
                <p className="text-sm text-blue-400">Rendering video... {Math.round(renderProgress.progress * 100)}%</p>
                <Progress value={renderProgress.progress * 100} className="w-full" />
            </div>
        )
    }

    if (renderProgress.status === 'error') {
        return <p className="text-sm text-red-500 mt-4">Render failed: {renderProgress.error.message}</p>
    }

    return null;
}

export default RenderProgressDisplay; 