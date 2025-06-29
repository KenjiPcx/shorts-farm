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
import { VideoPreviewModal } from './video-preview-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectCard } from './project-card';



type ProjectWithVideoUrl = NonNullable<ReturnType<typeof useQuery<typeof api.projects.getMyProjects>>>[number] & { thumbnailUrl?: string | null };

export function ProjectManager() {
  const currentUser = useQuery(api.auth.currentUser);
  const myProjects = useQuery(api.projects.getMyProjects);
  const allProjects = useQuery(api.projects.getAllProjects);
  const casts = useQuery(api.casts.getCasts);
  const characters = useQuery(api.characters.getAll);
  const startVideoCreation = useMutation(api.workflow.startVideoCreation);
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
          <TooltipProvider>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={projectFilter === 'mine' ? 'secondary' : 'ghost'} onClick={() => setProjectFilter('mine')}>My Projects</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View only your projects</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={projectFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setProjectFilter('all')}>All Projects</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>See what others are generating to get inspiration</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        <div className="space-y-4">
          {projects?.map(project => (
            <ProjectCard
              key={project._id}
              project={project}
              currentUser={currentUser}
              getCharacterName={getCharacterName}
              getCastName={getCastName}
              setPreviewProject={setPreviewProject}
            />
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