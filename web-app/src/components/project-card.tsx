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
import { PlayIcon, RotateCcwIcon, RefreshCwIcon, Clapperboard, Mic, ListChecks, FileText, StopCircle, Image as ImageIcon, Loader2, Instagram, Send, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import RenderProgressDisplay from './render-progress-display';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishingProgress, setPublishingProgress] = useState<string>("");
    const [selectedAccountId, setSelectedAccountId] = useState<Id<"accounts"> | null>(null);
    const [showRepublishWarning, setShowRepublishWarning] = useState(false);
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const generateSocials = useAction(api.social.generateSocials);
    const rerunVideoCreation = useMutation(api.workflow.rerunVideoCreation);
    const rerunVideoCreationFromScratch = useMutation(api.workflow.rerunVideoCreationFromScratch);
    const rerenderVideo = useMutation(api.workflow.rerenderVideo);
    const stopWorkflow = useMutation(api.workflow.stopWorkflow);
    const publishToInstagram = useAction(api.posting.postToInstagram);
    const deleteProject = useMutation(api.projects.deleteProject);

    // Get user's Instagram accounts
    const myAccounts = useQuery(api.accounts.getMyAccounts);
    const connectedInstagramAccounts = myAccounts?.filter(account => {
        const instagramPlatform = account.platforms.find(p => p.platform === 'instagram');
        return instagramPlatform?.credentials?.accessToken &&
            instagramPlatform?.credentials?.expiresAt &&
            instagramPlatform.credentials.expiresAt > Date.now();
    }) || [];

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

    const checkForRepublish = () => {
        // Check if project has been published before
        const hasBeenPublished = project.publishedMediaIds &&
            project.publishedMediaIds.some((media: any) => media.platform === 'instagram');

        if (hasBeenPublished) {
            setShowRepublishWarning(true);
        } else {
            handleActualPublish();
        }
    };

    const handleActualPublish = async () => {
        if (!selectedAccountId) {
            alert("Please select an Instagram account.");
            return;
        }

        setIsPublishing(true);
        setPublishingProgress("Uploading video to Instagram...");

        try {
            // Simulate progress updates (in real implementation, the backend would send these)
            setTimeout(() => setPublishingProgress("Processing video..."), 1000);
            setTimeout(() => setPublishingProgress("Waiting for Instagram approval..."), 30000);
            setTimeout(() => setPublishingProgress("Publishing to feed..."), 90000);

            await publishToInstagram({
                projectId: project._id,
                accountId: selectedAccountId
            });

            setPublishingProgress("Successfully published!");
            setTimeout(() => {
                alert("Successfully published to Instagram!");
                setIsPublishModalOpen(false);
                setSelectedAccountId(null);
                setPublishingProgress("");
            }, 1000);
        } catch (error) {
            console.error("Failed to publish to Instagram", error);
            alert("Failed to publish to Instagram. Please try again.");
            setPublishingProgress("");
        } finally {
            setTimeout(() => setIsPublishing(false), 1000);
        }
    };

    const handlePublishToInstagram = () => {
        checkForRepublish();
    };

    const handleDeleteProject = async () => {
        try {
            await deleteProject({ projectId: project._id });
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error("Failed to delete project", error);
            alert("Failed to delete project. Please try again.");
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
                            {project.accountId && project.account && (
                                <p><strong>Auto Account:</strong> <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs font-medium">🤖 {project.account.displayName}</span></p>
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
                        {project.status === 'done' && project.videoUrl && connectedInstagramAccounts.length > 0 && (
                            <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
                                <DialogTrigger asChild>
                                    <div>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={isPublishing}
                                                >
                                                    {isPublishing ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <Send className="h-5 w-5" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Publish to Instagram</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Publish to Instagram</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Label>Select Instagram Account</Label>
                                        <Popover open={accountDropdownOpen} onOpenChange={setAccountDropdownOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={accountDropdownOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {selectedAccountId ? (
                                                        (() => {
                                                            const account = connectedInstagramAccounts.find(acc => acc._id === selectedAccountId);
                                                            const instagramPlatform = account?.platforms.find(p => p.platform === 'instagram');
                                                            return (
                                                                <div className="flex items-center space-x-2">
                                                                    <Instagram className="h-4 w-4" />
                                                                    <div className="flex flex-col items-start">
                                                                        <span className="font-medium">{account?.displayName}</span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            @{instagramPlatform?.credentials?.username}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        "Select account..."
                                                    )}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search accounts..." />
                                                    <CommandList>
                                                        <CommandEmpty>No accounts found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {connectedInstagramAccounts.map((account) => {
                                                                const instagramPlatform = account.platforms.find(p => p.platform === 'instagram');
                                                                return (
                                                                    <CommandItem
                                                                        key={account._id}
                                                                        value={`${account.displayName} @${instagramPlatform?.credentials?.username}`}
                                                                        onSelect={() => {
                                                                            setSelectedAccountId(account._id);
                                                                            setAccountDropdownOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={`mr-2 h-4 w-4 ${selectedAccountId === account._id ? "opacity-100" : "opacity-0"}`}
                                                                        />
                                                                        <div className="flex items-center space-x-2">
                                                                            <Instagram className="h-4 w-4" />
                                                                            <div>
                                                                                <p className="font-medium">{account.displayName}</p>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    @{instagramPlatform?.credentials?.username}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </CommandItem>
                                                                );
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {project.socialMediaCopy && (
                                            <div>
                                                <Label>Caption Preview</Label>
                                                <Textarea
                                                    value={project.socialMediaCopy}
                                                    readOnly
                                                    className="mt-2 bg-gray-50 dark:bg-gray-800/50"
                                                    rows={3}
                                                />
                                            </div>
                                        )}

                                        {/* Publishing Progress */}
                                        {isPublishing && publishingProgress && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                                <div className="flex items-center space-x-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                                    <span className="text-sm text-blue-800 dark:text-blue-200">
                                                        {publishingProgress}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setIsPublishModalOpen(false);
                                                    setSelectedAccountId(null);
                                                    setPublishingProgress("");
                                                }}
                                                disabled={isPublishing}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handlePublishToInstagram}
                                                disabled={!selectedAccountId || isPublishing}
                                            >
                                                {isPublishing ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Publishing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-4 w-4 mr-2" />
                                                        Publish Now
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Republish Warning Modal */}
                        <Dialog open={showRepublishWarning} onOpenChange={setShowRepublishWarning}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>⚠️ Already Published</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        This video has already been published to Instagram. Publishing again will create a duplicate post.
                                    </p>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                            <strong>Previous Publications:</strong>
                                        </p>
                                        <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                                            {project.publishedMediaIds?.filter((media: any) => media.platform === 'instagram').map((media: any, index: number) => (
                                                <li key={index}>
                                                    • Instagram: Media ID {media.mediaId}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowRepublishWarning(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                setShowRepublishWarning(false);
                                                handleActualPublish();
                                            }}
                                        >
                                            Publish Anyway
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Delete Project</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>}
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete the project and all its associated data. This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteProject}
                            >
                                Delete Project
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
} 