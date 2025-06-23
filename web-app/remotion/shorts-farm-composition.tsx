import { AbsoluteFill, useVideoConfig, Sequence, Video, Img, CalculateMetadataFunction, Audio } from 'remotion';
import { z } from 'zod';
import React from 'react';
import { Subtitles } from './subtitles';

const DialogueTurnSchema = z.object({
    characterId: z.string(),
    line: z.string(),
    voiceUrl: z.string().optional(),
    characterExpression: z.string(),
    characterAssetUrl: z.string().optional(),
    audioDuration: z.number().optional(), // in seconds
});

const SceneSchema = z.object({
    sceneNumber: z.number(),
    contentImageUrl: z.string().optional(),
    contentImageToGenerate: z.string().optional(),
    dialogues: z.array(DialogueTurnSchema),
});

const CaptionSchema = z.object({
    text: z.string(),
    startMs: z.number(),
    endMs: z.number(),
    timestampMs: z.number(),
    confidence: z.number().nullable(),
});

const RenderDataSchema = z.object({
    script: z.object({
        _id: z.string(),
        _creationTime: z.number(),
        projectId: z.string(),
        scenes: z.array(SceneSchema),
        captions: z.optional(z.array(CaptionSchema)),
    }),
    backgroundUrl: z.string().nullable(),
});

// --- Zod Schema for Composition Props ---
export const ShortsFarmSchema = z.object({
    renderData: RenderDataSchema,
});

type ShortsFarmProps = z.infer<typeof ShortsFarmSchema>;

const DIALOGUE_BUFFER_SECONDS = 0.5; // 0.5 second pause between dialogues

export const calculateShortsFarmMetadata: CalculateMetadataFunction<ShortsFarmProps> = async ({ props }) => {
    const { renderData } = props;
    const fps = 30; // Assuming 30 fps, can be grabbed from useVideoConfig if needed inside component

    if (!renderData) {
        return {
            durationInFrames: 60 * fps, // Default to 60 seconds
            props,
        };
    }

    let totalDurationSeconds = 0;
    renderData.script.scenes.forEach((scene) => {
        scene.dialogues.forEach((dialogue) => {
            // Use actual audio duration if available, otherwise estimate
            const dialogueDuration = dialogue.audioDuration ?? (dialogue.line.length * 0.1); // fallback estimation
            totalDurationSeconds += dialogueDuration + DIALOGUE_BUFFER_SECONDS;
        });
    });

    return {
        props: props,
        durationInFrames: Math.ceil(totalDurationSeconds * fps),
    };
};

export const ShortsFarmComposition: React.FC<z.infer<typeof ShortsFarmSchema>> = ({ renderData }) => {
    const { fps } = useVideoConfig();

    if (!renderData) {
        return <AbsoluteFill style={{ backgroundColor: 'red', color: 'white', fontSize: 40, textAlign: 'center', padding: 20 }}>Error: renderData is missing. Please check the props passed to the composition.</AbsoluteFill>;
    }

    const { script, backgroundUrl } = renderData;

    // --- Character Positioning Logic ---
    const characterIds = Array.from(new Set(script.scenes.flatMap(s => s.dialogues.map(d => d.characterId))));
    const characterPositions = new Map<string, 'left' | 'right'>();
    if (characterIds[0]) characterPositions.set(characterIds[0], 'left');
    if (characterIds[1]) characterPositions.set(characterIds[1], 'right');
    // --- End Character Positioning Logic ---

    let cumulativeFrames = 0;

    const scenesWithTiming = script.scenes.map(scene => {
        const dialoguesWithTiming = scene.dialogues.map(dialogue => {
            const startFrame = cumulativeFrames;
            const durationSeconds = dialogue.audioDuration ?? (dialogue.line.length * 0.1);
            const durationInFrames = Math.ceil(durationSeconds * fps);

            cumulativeFrames = startFrame + durationInFrames + Math.ceil(DIALOGUE_BUFFER_SECONDS * fps);

            return {
                ...dialogue,
                startFrame,
                durationInFrames,
            };
        });
        return { ...scene, dialogues: dialoguesWithTiming };
    });

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {backgroundUrl && (
                <Video muted loop src={backgroundUrl} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
            )}

            {scenesWithTiming.map((scene) => (
                <React.Fragment key={scene.sceneNumber}>
                    {scene.dialogues.map((dialogue, i) => (
                        <Sequence key={`${scene.sceneNumber}-${i}`} from={dialogue.startFrame} durationInFrames={dialogue.durationInFrames}>
                            {scene.contentImageUrl && i === 0 && ( // Show image at the start of the first dialogue of a scene
                                <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <Img src={scene.contentImageUrl} style={{ height: '40%', zIndex: 0 }} />
                                </AbsoluteFill>
                            )}
                            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
                                {dialogue.characterAssetUrl && (
                                    <Img
                                        src={dialogue.characterAssetUrl}
                                        style={{
                                            height: '30%',
                                            zIndex: 1,
                                            position: 'absolute',
                                            bottom: '20%',
                                            ...(characterPositions.get(dialogue.characterId) === 'left' ? { left: '15%' } : { right: '15%' }),
                                        }}
                                    />
                                )}
                                {dialogue.voiceUrl && <Audio src={dialogue.voiceUrl} />}
                            </AbsoluteFill>
                        </Sequence>
                    ))}
                </React.Fragment>
            ))}

            <AbsoluteFill style={{
                bottom: '10%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 50px',
                zIndex: 100, // Highest z-index for subtitles
            }}>
                <Subtitles
                    captions={script.captions ?? []}
                    linesPerPage={3}
                    subtitlesZoomMeasurerSize={10}
                    subtitlesLineHeight={98}
                    fps={fps}
                />
            </AbsoluteFill>
        </AbsoluteFill>
    );
}; 