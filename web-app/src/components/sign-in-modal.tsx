import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { ChromeIcon, GithubIcon } from "lucide-react";

export function SignInModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { signIn } = useAuthActions();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Sign In to Continue</DialogTitle>
                    <DialogDescription>
                        Choose your preferred provider to create an account and start making videos.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4 py-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => void signIn("github")}
                    >
                        <GithubIcon className="mr-2 h-5 w-5" />
                        Sign in with GitHub
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => void signIn("google")}
                    >
                        <ChromeIcon className="mr-2 h-5 w-5" />
                        Sign in with Google
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 