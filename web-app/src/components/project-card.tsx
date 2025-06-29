import React, { useState } from 'react';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PlayIcon, RotateCcwIcon, RefreshCwIcon, Clapperboard, Mic, ListChecks, FileText, StopCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import RenderProgressDisplay from './render-progress-display';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ProjectWithVideoUrl = NonNullable<ReturnType<typeof useQuery<typeof api.projects.getMyProjects>>>[number] & { thumbnailUrl?: string | null };

const statusStyles: Record<string, string> = {
    gathering: 'bg-blue-500',
    planning: 'bg-yellow-500',
    writing: 'bg-orange-500',
    "generating-voices": 'bg-purple-500',
    rendering: 'bg-pink-500',
    done: 'bg-green-500',
    error: 'bg-red-500',
};

const statusProgress: Record<string, number> = {
    gathering: 15,
    planning: 30,
    writing: 50,
    "generating-voices": 70,
    rendering: 90,
    done: 100,
    error: 100,
};

interface ProjectCardProps {
    project: ProjectWithVideoUrl;
    currentUser: any;
    getCharacterName: (characterId: Id<"characters">) => string;
    getCastName: (castId: Id<"casts">) => string;
    setPreviewProject: (project: ProjectWithVideoUrl | null) => void;
}

export function ProjectCard({ project, currentUser, getCharacterName, getCastName, setPreviewProject }: ProjectCardProps) {
    const [isGeneratingSocials, setIsGeneratingSocials] = useState(false);
    const generateSocials = useAction(api.social.generateSocials);
    const rerunVideoCreation = useMutation(api.workflow.rerunVideoCreation);
    const rerunVideoCreationFromScratch = useMutation(api.workflow.rerunVideoCreationFromScratch);
    const rerenderVideo = useMutation(api.workflow.rerenderVideo);
    const stopWorkflow = useMutation(api.workflow.stopWorkflow);

    const handleGenerateSocials = async () => {
        setIsGeneratingSocials(true);
        try {
            await generateSocials({ projectId: project._id });
        } catch (error) {
            console.error("Failed to generate socials", error);
            alert("Failed to generate social content. Please try again.");
        } finally {
            setIsGeneratingSocials(false);
        }
    };

    return (
        <Card className="overflow-visible relative">
            <div className="flex justify-between">
                <div className="flex-grow pr-12 min-w-0">
                    <CardHeader>
                        <CardTitle className='flex justify-between items-start'>
                            <span>{project.topic}</span>
                            <Badge className={`${statusStyles[project.status]}`}>{project.status}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground space-y-2 mb-4">
                            {project.user && (
                                <p><strong>Owner:</strong> {project.user}</p>
                            )}
                            {project.castId && (
                                <p><strong>Cast:</strong> {getCastName(project.castId)}</p>
                            )}
                            {project.urls && project.urls.length > 0 && (
                                <div>
                                    <strong>Source URLs:</strong>
                                    <ul className="list-disc pl-5">
                                        {project.urls.map((url, i) => <li key={i}><a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline block truncate">{url}</a></li>)}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {project.status !== 'done' && project.status !== 'error' && project.status !== 'rendering' && (
                            <Progress value={statusProgress[project.status]} className="w-full mb-4" />
                        )}

                        <div className="space-y-2">
                            {project.plan && (
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="p-0 h-auto font-semibold">
                                            <ListChecks className="h-4 w-4 mr-2" />
                                            View Plan
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-2">
                                        <div className="space-y-2 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
                                            {project.plan.map(scene => (
                                                <div key={scene.sceneNumber} className="p-2 border-l-2">
                                                    <p className='font-bold'>Scene {scene.sceneNumber}</p>
                                                    {scene.contentImageUrl ? <img src={scene.contentImageUrl} alt="Scene Image" className="w-1/2" /> : ''}
                                                    {scene.dialoguePlan.map((dialogue, i) => (
                                                        <p key={i}><strong>{getCharacterName(dialogue.characterId)}:</strong> {dialogue.lineDescription}</p>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {project.script && (
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="p-0 h-auto font-semibold">
                                            <FileText className="h-4 w-4 mr-2" />
                                            View Script
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-2">
                                        <div className="space-y-2 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
                                            {project.script.scenes.map(scene => (
                                                <div key={scene.sceneNumber} className="p-2 border-l-2">
                                                    <p className='font-bold'>Scene {scene.sceneNumber}</p>
                                                    {scene.dialogues.map((dialogue, i) => (
                                                        <p key={i}><strong>{getCharacterName(dialogue.characterId)}:</strong> {dialogue.line}</p>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {project.script?.scenes.some(s => s.dialogues.some(d => d.voiceUrl)) && (
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="p-0 h-auto font-semibold">
                                            <Mic className="h-4 w-4 mr-2" />
                                            View Generated Voices
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-2">
                                        <div className="space-y-4 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
                                            {project.script.scenes.map(scene => (
                                                <div key={scene.sceneNumber}>
                                                    <p className='font-bold mb-2'>Scene {scene.sceneNumber}</p>
                                                    <div className="space-y-2">
                                                        {scene.dialogues.map((dialogue, i) => (
                                                            dialogue.voiceUrl && (
                                                                <div key={i} className="flex items-center space-x-2">
                                                                    <p className="font-medium w-32 truncate">{getCharacterName(dialogue.characterId)}:</p>
                                                                    <audio src={dialogue.voiceUrl} controls className="h-8 w-full" />
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {(project.thumbnailUrl || project.socialMediaCopy) && (
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="p-0 h-auto font-semibold">
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            Posting Resources
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-2">
                                        {isGeneratingSocials ? (
                                            <div className="space-y-4 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <p>Generating social media content...</p>
                                            </div>
                                        ) : <div className="space-y-4 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
                                            {project.thumbnailUrl && (
                                                <div>
                                                    <h4 className="font-semibold mb-2">Thumbnail</h4>
                                                    <img src={project.thumbnailUrl} alt="Generated thumbnail" className="rounded-lg max-w-xs" />
                                                </div>
                                            )}

                                            {project.socialMediaCopy && (
                                                <div>
                                                    <h4 className="font-semibold mb-2">Social Media Post</h4>
                                                    <Textarea value={project.socialMediaCopy} readOnly className="bg-gray-50 dark:bg-gray-800/50" />
                                                </div>
                                            )}
                                        </div>
                                        }
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            <RenderProgressDisplay project={project} />

                        </div>

                        {project.status === 'error' && (
                            <p className="text-red-500 mt-2">Something went wrong during generation.</p>
                        )}
                    </CardContent>
                </div>
                {currentUser?._id === project.userId && <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 flex flex-col space-y-2 p-2 border bg-white dark:bg-gray-900 dark:border-gray-800 rounded-lg shadow-lg">
                    <TooltipProvider>
                        {(project.status === 'done' || project.status === 'error') && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleGenerateSocials}
                                        disabled={isGeneratingSocials}
                                    >
                                        {isGeneratingSocials ? (
                                            <RefreshCwIcon className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <ImageIcon className="h-5 w-5" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Generate Thumbnail & Social Copy</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {(project.status === 'rendering' || project.status === 'done' || project.status === 'error') && project.script && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setPreviewProject(project)}>
                                        <PlayIcon className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Preview Composition</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {(project.status === 'done' || project.status === 'error' || project.status === 'rendering') && project.script && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => rerenderVideo({ projectId: project._id })}>
                                        <Clapperboard className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Rerender video</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {project.status === 'error' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => rerunVideoCreation({ projectId: project._id })}>
                                        <RefreshCwIcon className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Rerun from failed step</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => rerunVideoCreationFromScratch({ projectId: project._id })}>
                                    <RotateCcwIcon className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Rerun from scratch</p>
                            </TooltipContent>
                        </Tooltip>
                        {project.workflowId && project.status !== 'done' && project.status !== 'error' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => stopWorkflow({
                                            workflowId: project.workflowId!,
                                            projectId: project._id
                                        })}
                                    >
                                        <StopCircle className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Stop workflow</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </TooltipProvider>
                </div>}
            </div>
        </Card>
    );
} 