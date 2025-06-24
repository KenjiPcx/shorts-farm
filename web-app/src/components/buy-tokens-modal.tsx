import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";

const pricingTiers = [
    { tokens: 10, price: 20, description: "10 video credits" },
    { tokens: 25, price: 45, description: "~10% off" },
    { tokens: 50, price: 80, description: "~20% off" },
];

export function BuyTokensModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const addTokens = useMutation(api.users.addTokens);
    const [loadingTier, setLoadingTier] = useState<number | null>(null);

    const handleBuy = async (tokens: number) => {
        setLoadingTier(tokens);
        try {
            // In a real app, you'd integrate with a payment provider like Stripe here.
            // For this demo, we'll just add the tokens directly.
            await addTokens({ tokensToAdd: tokens });
            toast.success(`Successfully added ${tokens} tokens!`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add tokens. Please try again.");
        } finally {
            setLoadingTier(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle>Buy More Tokens</DialogTitle>
                    <DialogDescription>
                        Choose a package that suits your needs. Each token lets you create
                        one video.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    {pricingTiers.map((tier) => (
                        <Card key={tier.tokens}>
                            <CardHeader>
                                <CardTitle>${tier.price}</CardTitle>
                                <CardDescription className="font-bold text-lg">{tier.tokens} Tokens</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <p className="text-sm text-muted-foreground">{tier.description}</p>
                                <Button className="w-full mt-4" onClick={() => handleBuy(tier.tokens)} disabled={loadingTier !== null}>
                                    {loadingTier === tier.tokens ? <Spinner /> : 'Buy Now'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
} 