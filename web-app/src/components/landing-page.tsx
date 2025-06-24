import { Button } from "./ui/button";
import { ArrowRight, BrainCircuit, Clapperboard, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAuthActions } from "@convex-dev/auth/react";

export function LandingPage() {
    const { signIn } = useAuthActions();

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
            <main className="flex-1">
                {/* Hero Section */}
                <section className="w-full py-20 md:py-32 lg:py-40 bg-white dark:bg-gray-800/20">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
                            <div className="flex flex-col justify-center space-y-4">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-gray-900 dark:text-white">
                                        The Cure for Mindless Scrolling
                                    </h1>
                                    <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                                        Turn any lesson, article, or idea into engaging, short-form educational videos that students actually want to watch.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                                    <Button size="lg" onClick={() => void signIn("github")}>
                                        Create Your First Video (Free)
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-center p-4 w-3/4">
                                <img src="/short demo.png" alt="Brainrot Academy Demo" className="rounded-lg shadow-2xl object-contain" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="w-full py-12 md:py-24 lg:py-32">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                            <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                                Key Features
                            </div>
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                                Everything You Need to Create
                            </h2>
                            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                                Our platform provides a seamless workflow from idea to final render, powered by AI.
                            </p>
                        </div>
                        <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <BrainCircuit className="w-8 h-8 text-blue-500" />
                                    <CardTitle>AI-Powered Scripting</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p>Automatically generate scripts, lesson plans, and dialogue from a simple topic or a URL.</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Zap className="w-8 h-8 text-blue-500" />
                                    <CardTitle>Instant Generation</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p>Go from an idea to a fully-voiced, animated video with subtitles in just a few minutes.</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Clapperboard className="w-8 h-8 text-blue-500" />
                                    <CardTitle>Custom Characters</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p>Create and manage your own cast of characters to give your content a unique and consistent voice.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="flex items-center justify-center h-16 border-t bg-white dark:bg-gray-950">
                <p className="text-sm text-gray-500">
                    © {new Date().getFullYear()} Brainrot Academy. All rights reserved.
                </p>
            </footer>
        </div>
    );
} 