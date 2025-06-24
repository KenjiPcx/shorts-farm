import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, PlayIcon, RotateCcwIcon, RefreshCwIcon, Clapperboard, Mic, ListChecks, FileText } from 'lucide-react';
import { VideoPreviewModal } from './video-preview-modal';
import RenderProgressDisplay from './render-progress-display';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

type ProjectWithVideoUrl = NonNullable<ReturnType<typeof useQuery<typeof api.projects.getMyProjects>>>[number];

export function ProjectManager() {
  const myProjects = useQuery(api.projects.getMyProjects);
  const allProjects = useQuery(api.projects.getAllProjects);
  const casts = useQuery(api.casts.getCasts);
  const characters = useQuery(api.characters.getAll);
  const startVideoCreation = useMutation(api.workflow.startVideoCreation);
  const rerunVideoCreation = useMutation(api.workflow.rerunVideoCreation);
  const rerunVideoCreationFromScratch = useMutation(api.workflow.rerunVideoCreationFromScratch);
  const rerenderVideo = useMutation(api.workflow.rerenderVideo);
  const [topic, setTopic] = useState('');
  const [urls, setUrls] = useState('');
  const [selectedCast, setSelectedCast] = useState<Id<"casts"> | null>(null);
  const [previewProject, setPreviewProject] = useState<ProjectWithVideoUrl | null>(null);
  const [projectFilter, setProjectFilter] = useState<'mine' | 'all'>('mine');

  const projects = projectFilter === 'mine' ? myProjects : allProjects;

  const getCharacterName = (characterId: Id<"characters">) => {
    return characters?.find(c => c._id === characterId)?.name ?? 'Unknown Character';
  }

  const getCastName = (castId: Id<"casts">) => {
    return casts?.find(c => c._id === castId)?.name ?? 'Unknown Cast';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!topic && !urls) || !selectedCast) {
      alert('Please provide a topic or URLs, and select a cast.');
      return;
    }
    try {
      await startVideoCreation({
        input: {
          topic: topic,
          urls: urls.split('\n').filter(u => u.trim() !== ''),
          castId: selectedCast,
        },
      });
      setTopic('');
      setUrls('');
      setSelectedCast(null);
    } catch (error) {
      console.error('Failed to start video creation:', error);
      alert(`Failed to start video creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Create New Video</CardTitle>
            <CardDescription>Start a new brainrot video generation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cast">Select Cast</Label>
                <Select onValueChange={(value) => setSelectedCast(value as Id<"casts">)} value={selectedCast || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a character cast..." />
                  </SelectTrigger>
                  <SelectContent>
                    {casts?.map(cast => (
                      <SelectItem key={cast._id} value={cast._id}>{cast.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., 'The basics of AI'" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urls">URLs (one per line - the website you want to convert into a short)</Label>
                <Textarea id="urls" value={urls} onChange={e => setUrls(e.target.value)} placeholder="e.g., https://docs.convex.dev/..." />
              </div>
              <Button type="submit" className="w-full" disabled={!selectedCast || (!topic && !urls)}>
                Generate Video
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Your Projects</h2>
          <div className="flex items-center space-x-2">
            <Button variant={projectFilter === 'mine' ? 'secondary' : 'ghost'} onClick={() => setProjectFilter('mine')}>My Projects</Button>
            <Button variant={projectFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setProjectFilter('all')}>All Projects</Button>
          </div>
        </div>
        <div className="space-y-4">
          {projects?.map(project => (
            <Card key={project._id} className="overflow-visible relative">
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
                      {project.userId && (
                        <p><strong>Owner ID:</strong> {project.userId}</p>
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
                              {/* {project.script.captions && (
                                <div className="mt-4">
                                  <p className='font-bold mb-2'>Captions</p>
                                  <div className="text-sm space-y-1">
                                    {project.script.captions.map((caption, i) => (
                                      <p key={i}>- {caption.text}</p>
                                    ))}
                                  </div>
                                </div>
                              )} */}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                    <RenderProgressDisplay project={project} />

                    {project.status === 'error' && (
                      <p className="text-red-500 mt-2">Something went wrong during generation.</p>
                    )}
                  </CardContent>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 flex flex-col space-y-2 p-2 border bg-white dark:bg-gray-900 dark:border-gray-800 rounded-lg shadow-lg">
                  <TooltipProvider>
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
                  </TooltipProvider>
                </div>
              </div>
            </Card>
          ))}
          {projects?.length === 0 && (
            <Card>
              <CardContent className='pt-6'>
                <p className="text-center text-gray-500">You haven't created any projects yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <VideoPreviewModal
        isOpen={!!previewProject}
        onClose={() => setPreviewProject(null)}
        projectId={previewProject?._id}
      />
    </div>
  );
}