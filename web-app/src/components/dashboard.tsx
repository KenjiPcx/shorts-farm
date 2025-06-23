import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectManager } from "./project-manager";
import { CastManager } from "./cast-manager";
import { CharacterManager } from "./character-manager";
import { AssetManager } from "./asset-manager";

export function Dashboard() {
  return (
    <Tabs defaultValue="projects" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="casts">Casts</TabsTrigger>
        <TabsTrigger value="characters">Characters</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
      </TabsList>
      <TabsContent value="projects">
        <ProjectManager />
      </TabsContent>
      <TabsContent value="casts">
        <CastManager />
      </TabsContent>
      <TabsContent value="characters">
        <CharacterManager />
      </TabsContent>
      <TabsContent value="assets">
        <AssetManager />
      </TabsContent>
    </Tabs>
  );
}