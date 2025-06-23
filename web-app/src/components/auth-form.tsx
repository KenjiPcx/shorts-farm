import { useAuthActions } from "@convex-dev/auth/react";

export function AuthForm() {
  const { signIn } = useAuthActions();

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card p-8 rounded-lg shadow-lg border border-border max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-6">Welcome to Brainrot Academy</h2>
        <p className="mb-6 text-muted-foreground">Sign in to access your content management system</p>
        <button
          onClick={() => void signIn("github")}
          type="button"
          className="flex items-center justify-center gap-2 w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-labelledby="githubIconTitle">
            <title id="githubIconTitle">GitHub Logo</title>
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
