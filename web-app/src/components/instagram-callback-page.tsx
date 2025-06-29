import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function InstagramCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const exchangeCodeForToken = useAction(api.instagramAuth.exchangeCodeForToken);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        let hasProcessed = false;

        const handleCallback = async () => {
            if (hasProcessed) return; // Prevent duplicate processing

            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const error = searchParams.get('error');

            if (error) {
                setStatus('error');
                setMessage(`Instagram authorization failed: ${error}`);
                return;
            }

            if (!code || !state) {
                setStatus('error');
                setMessage('Missing authorization code or account ID');
                return;
            }

            hasProcessed = true; // Mark as processed

            try {
                // Extract accountId from the prefixed state (remove 'ig_' prefix)
                const accountId = state.startsWith('ig_') ? state.slice(3) : state;

                const result = await exchangeCodeForToken({
                    code,
                    accountId: accountId as Id<"accounts">,
                });

                if (result.success) {
                    setStatus('success');
                    setUsername(result.username);
                    setMessage(`Successfully connected Instagram account @${result.username}!`);

                    // Clear the URL to prevent reprocessing
                    window.history.replaceState({}, document.title, '/auth/instagram/callback');

                    // Auto-redirect after 3 seconds
                    setTimeout(() => {
                        navigate('/');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage('Failed to connect Instagram account');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'An unexpected error occurred');
            }
        };

        handleCallback();
    }, [searchParams, exchangeCodeForToken, navigate]);

    const handleContinue = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
                        {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
                        Instagram Connection
                    </CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Connecting your Instagram account...'}
                        {status === 'success' && 'Account connected successfully!'}
                        {status === 'error' && 'Connection failed'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    {status === 'loading' && (
                        <p className="text-sm text-muted-foreground">
                            Please wait while we set up your Instagram account...
                        </p>
                    )}

                    {status === 'success' && (
                        <div className="space-y-2">
                            <p className="text-sm text-green-600">{message}</p>
                            {username && (
                                <p className="text-xs text-muted-foreground">
                                    You can now automatically post to @{username}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Redirecting to automation manager...
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <p className="text-sm text-red-600">{message}</p>
                    )}

                    {status !== 'loading' && (
                        <Button onClick={handleContinue} className="w-full">
                            {status === 'success' ? 'Continue to Automation Manager' : 'Back to Automation Manager'}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 