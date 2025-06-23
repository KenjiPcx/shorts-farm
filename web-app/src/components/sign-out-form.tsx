import { useAuthActions } from "@convex-dev/auth/react";

export const SignOutForm = () => {
  const { signOut } = useAuthActions();

  return (
    <button
      type="button"
      className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
      onClick={() => void signOut()}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-labelledby="logoutIconTitle">
        <title id="logoutIconTitle">Sign out</title>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Sign out
    </button>
  );
};
