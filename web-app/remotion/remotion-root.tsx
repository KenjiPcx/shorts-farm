import { Composition } from 'remotion';
import { ShortsFarmComposition, ShortsFarmSchema, calculateShortsFarmMetadata } from './shorts-farm-composition';
import React from 'react';
import { z } from 'zod';

// You can edit the default values here.
const defaultProps: z.infer<typeof ShortsFarmSchema> = {
    renderData: {
        script: {
            _id: "preview_script",
            _creationTime: Date.now(),
            projectId: "preview_project",
            scenes: [
                {
                    "contentImageUrl": "https://langchain-ai.github.io/langgraph/concepts/img/agent_workflow.png",
                    "dialogues": [
                        {
                            "audioDuration": 14.027755102040816,
                            "characterAssetUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/e1680ade-075f-411b-ac4e-7e958a56dda5",
                            "characterExpression": "Default",
                            "characterId": "ks7apxaz98hqdgvc2fm5fg8yrx7j3s9m", "line": "Alright, you guys, so there's this thing called LangGraph. It helps build 'workflows,' which are like, step-by-step plans for AI. And then there are 'agents,' which are more like... well, Anthropic says they're systems that use an LLM to reason through a sequence of actions.",
                            "voiceUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/260f236a-00b5-4efe-989e-99462c1185a7",
                        },
                        {
                            "audioDuration": 8.385306122448979,
                            "characterAssetUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/060ce410-367e-4cba-a5eb-01558d08d268",
                            "characterExpression": "Default",
                            "characterId": "ks74y3z2nx1z6acx1am6a253697j2etx",
                            "line": "Oh, wow, a 'reasoning system.' Can it reason its way into doing my homework? Or, more importantly, can it reason me up some Cheesy Poofs? Because that's what I care about, Kyle.",
                            "voiceUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/692562e0-9ecc-42d2-9c78-4a60145408de",
                        }
                    ],
                    "sceneNumber": 1
                },
                {
                    "contentImageUrl": "https://langchain-ai.github.io/langgraph/tutorials/workflows/img/augmented_llm.png",
                    "dialogues": [
                        {
                            "audioDuration": 10.631836734693875,
                            "characterAssetUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/e1680ade-075f-411b-ac4e-7e958a56dda5",
                            "characterExpression": "Default",
                            "characterId": "ks7apxaz98hqdgvc2fm5fg8yrx7j3s9m", "line": "No, Cartman. Think of 'Augmented LLMs' as the building blocks. They can produce structured outputs, not just text, and they can call 'tools' to get information or perform actions. It's about making them more capable.", "voiceUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/9b77f4fd-ff24-4b6c-af62-18b5bd228e31"
                        },
                        {
                            "audioDuration": 9.613061224489796,
                            "characterAssetUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/060ce410-367e-4cba-a5eb-01558d08d268",
                            "characterExpression": "Default", "characterId": "ks74y3z2nx1z6acx1am6a253697j2etx",
                            "line": "Tools, huh? Can I give it a 'Make Kyle Shut His Freakin' Mouth' tool? Or how about an 'Unlimited Cheesy Poofs Dispenser' tool? That's a tool society *needs*, Kyle!",
                            "voiceUrl": "https://shocking-jellyfish-517.convex.cloud/api/storage/bdbeddef-5d4a-4d8a-aaf4-47e3382480e2"
                        }
                    ],
                    "sceneNumber": 2
                }
            ],
            captions: [
                {
                    text: "No, Cartman. Think of 'Augmented LLMs' as the building blocks. They can produce structured outputs, not just text, and they can call 'tools' to get information or perform actions. It's about making them more capable.",
                    startMs: 0,
                    endMs: 10.494,
                    timestampMs: 0,
                    confidence: 0.95,
                },
                {
                    text: "Tools, huh? Can I give it a 'Make Kyle Shut His Freakin' Mouth' tool? Or how about an 'Unlimited Cheesy Poofs Dispenser' tool? That's a tool society *needs*, Kyle!",
                    startMs: 10.494,
                    endMs: 20.107,
                    timestampMs: 10.494,
                    confidence: 0.95,
                }
            ]
        },
        backgroundUrl: "https://shocking-jellyfish-517.convex.cloud/api/storage/e8b23fce-f102-4950-9451-10f20fe0c894"
    }
};

// You can edit the duration in frames of the video here.
const durationInFrames = 1200; // This will be overridden by calculateMetadata
const fps = 30;

export const RemotionRoot: React.FC = () => {
    return (
        <Composition
            id="ShortsFarm"
            component={ShortsFarmComposition}
            durationInFrames={durationInFrames}
            fps={fps}
            width={1080}
            height={1920}
            schema={ShortsFarmSchema}
            defaultProps={defaultProps}
            calculateMetadata={calculateShortsFarmMetadata}
        />
    );
}; 