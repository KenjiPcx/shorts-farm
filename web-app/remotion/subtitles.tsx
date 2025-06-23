import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { Word } from './word';
import { Caption, createTikTokStyleCaptions } from '@remotion/captions';

export const Subtitles: React.FC<{
    captions: Caption[];
    linesPerPage: number;
    subtitlesZoomMeasurerSize: number;
    subtitlesLineHeight: number;
    fps: number;
}> = ({
    captions,
    fps,
}) => {
        const frame = useCurrentFrame();

        const { pages } = useMemo(() => createTikTokStyleCaptions({
            captions: captions.map((c, i) => ({
                ...c,
                text: `${i === 0 ? "" : " "}${c.text}`,
            })),
            combineTokensWithinMilliseconds: 1500, // Show 1-2 words at a time
        }), [captions]);

        const currentPage = pages.find((p) => {
            const startFrame = p.startMs / 1000 * fps;
            const endFrame = (p.startMs + p.durationMs) / 1000 * fps;
            return frame >= startFrame && frame < endFrame;
        });

        if (!currentPage) {
            return null;
        }

        return (
            <div
                className="w-[80%] mx-auto flex justify-center items-center"
                style={{
                    wordWrap: 'break-word',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                }}
            >
                <div>
                    {currentPage.tokens.map((token, i) => {
                        const item = {
                            id: i,
                            start: token.fromMs / 1000 * fps,
                            end: token.toMs / 1000 * fps,
                            text: token.text.trim(),
                        }
                        return <Word key={item.id} frame={frame} item={item} />
                    })}
                </div>
            </div>
        );
    };

declare global {
    interface Array<T> {
        findLastIndex(
            predicate: (value: T, index: number, obj: T[]) => unknown,
            thisArg?: unknown
        ): number;
    }
}