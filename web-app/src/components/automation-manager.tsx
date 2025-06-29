import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Pencil, Instagram, ExternalLink, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MultipleSelector, { type Option } from "@/components/ui/multi-select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

type Account = NonNullable<ReturnType<typeof useQuery<typeof api.accounts.getMyAccounts>>>[number];
type Cast = NonNullable<ReturnType<typeof useQuery<typeof api.casts.getCasts>>>[number];

export function AutomationManager() {
    const myAccounts = useQuery(api.accounts.getMyAccounts);
    const myCasts = useQuery(api.casts.getCasts);
    const [selectedAccountId, setSelectedAccountId] = useState<Id<"accounts"> | null>(null);

    const selectedAccount = myAccounts?.find((a: Account) => a._id === selectedAccountId);

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold">Automation Manager</h1>

            {/* Quickstart Banner */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent>
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">How Daily Automation Works</h3>
                            <p className="text-blue-800 mb-3">
                                Every day at 9:00 AM UTC, our system automatically checks your topic queue and creates one video per account.
                                To get started, connect your Instagram account and add at least one topic to the queue below.
                            </p>
                            <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-lg">
                                <strong>📅 Getting Started:</strong> Add your first topic today and your automation will be triggered tomorrow at 9:00 AM UTC.
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Accounts</CardTitle>
                            <CardDescription>Manage your connected social media accounts.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {myAccounts?.map((account: Account) => (
                                <AccountCard key={account._id} account={account} isSelected={selectedAccountId === account._id} onSelect={setSelectedAccountId} casts={myCasts || []} />
                            ))}
                            <CreateAccountModal casts={myCasts || []} />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    {selectedAccount ? (
                        <TopicQueue account={selectedAccount} />
                    ) : (
                        <Card className="flex items-center justify-center h-full">
                            <CardContent className="text-center">
                                <p className="text-muted-foreground">Select an account to view its topic queue.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

function AccountCard({ account, isSelected, onSelect, casts }: { account: Account, isSelected: boolean, onSelect: (id: Id<"accounts">) => void, casts: Cast[] }) {
    const generateInstagramAuthUrl = useAction(api.instagramAuth.generateInstagramAuthUrl);
    const [isConnecting, setIsConnecting] = useState(false);

    const instagramPlatform = account.platforms.find(p => p.platform === 'instagram');
    const isInstagramConnected = instagramPlatform?.credentials?.accessToken &&
        instagramPlatform?.credentials?.expiresAt &&
        instagramPlatform.credentials.expiresAt > Date.now();

    const handleConnectInstagram = async () => {
        setIsConnecting(true);
        try {
            const authUrl = await generateInstagramAuthUrl({ accountId: account._id });
            window.location.href = authUrl;
        } catch (error) {
            console.error('Failed to generate Instagram auth URL:', error);
            setIsConnecting(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="cursor-pointer flex-grow" onClick={() => onSelect(account._id)}>
                <p className={`font-semibold ${isSelected ? 'text-primary' : ''}`}>{account.displayName}</p>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {account.platforms.map((p) => (
                        <div key={p.platform} className="flex items-center gap-1">
                            {p.platform === 'instagram' && <Instagram className="h-3 w-3" />}
                            <span>{p.platform}</span>
                            {p.platform === 'instagram' && (
                                isInstagramConnected ?
                                    <CheckCircle className="h-3 w-3 text-green-500" /> :
                                    <Clock className="h-3 w-3 text-orange-500" />
                            )}
                        </div>
                    ))}
                </div>
                {instagramPlatform && !isInstagramConnected && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleConnectInstagram();
                        }}
                        disabled={isConnecting}
                    >
                        <Instagram className="h-3 w-3 mr-1" />
                        {isConnecting ? 'Connecting...' : 'Connect Instagram'}
                        <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                )}
            </div>
            <EditAccountModal account={account} casts={casts} />
        </div>
    );
}

function CreateAccountModal({ casts }: { casts: Cast[] }) {
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [castWeights, setCastWeights] = useState<{ castId: string, weight: number }[]>([]);
    const createAccount = useMutation(api.accounts.createAccount);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) {
            alert("Please provide a display name.");
            return;
        }

        await createAccount({
            displayName,
            bio,
            platforms: [{ platform: "instagram", handle: "@" + displayName.toLowerCase().replace(/\s+/g, '') }],
            castWeights: castWeights.map(cw => ({ ...cw, castId: cw.castId as Id<"casts"> }))
        });

        setDisplayName("");
        setBio("");
        setCastWeights([]);
        setIsOpen(false);
    }

    const handleSelectionChange = (options: Option[]) => {
        const newCastWeights = options.map(option => {
            const existing = castWeights.find(cw => cw.castId === option.value);
            return {
                castId: option.value,
                weight: existing?.weight || 50,
            };
        });
        setCastWeights(newCastWeights);
    };

    const handleWeightChange = (castId: string, weight: number) => {
        setCastWeights(castWeights.map(cw => cw.castId === castId ? { ...cw, weight } : cw));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Account
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Social Media Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g., AI Peter" required />
                    </div>

                    <div>
                        <Label htmlFor="bio">Account Bio</Label>
                        <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short description of the account's persona, content, and target audience." />
                    </div>

                    <div>
                        <Label>Available Casts</Label>
                        <MultipleSelector
                            value={castWeights.map(cw => ({ value: cw.castId, label: casts.find((c: Cast) => c._id === cw.castId)?.name || "Unknown" }))}
                            onChange={handleSelectionChange}
                            options={casts.map((cast: Cast) => ({ value: cast._id, label: cast.name }))}
                            placeholder="Select cast members..."
                            className="w-full"
                        />
                    </div>

                    {castWeights.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <Label>Cast Weights</Label>
                            {castWeights.map(cw => {
                                const cast = casts.find((c: Cast) => c._id === cw.castId);
                                return (
                                    <div key={cw.castId} className="space-y-2">
                                        <Label className="text-sm font-medium">{cast?.name}</Label>
                                        <div className="flex items-center space-x-4">
                                            <Slider
                                                value={[cw.weight]}
                                                onValueChange={([val]) => handleWeightChange(cw.castId, val)}
                                                max={100}
                                                step={1}
                                                className="w-full"
                                            />
                                            <span className="text-sm text-muted-foreground w-8">{cw.weight}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <Instagram className="h-4 w-4 inline mr-1" />
                            After creating the account, you'll be able to connect your Instagram account using OAuth.
                        </p>
                    </div>

                    <Button type="submit" className="w-full">Create Account</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function TopicQueue({ account }: { account: Account }) {
    const addTopic = useMutation(api.accounts.addTopic);
    const removeTopic = useMutation(api.accounts.removeTopic);
    const [newTopic, setNewTopic] = useState("");

    const handleAddTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopic.trim()) return;
        await addTopic({ accountId: account._id, topic: newTopic.trim() });
        setNewTopic("");
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Topic Queue for {account.displayName}</CardTitle>
                <CardDescription>The bot will pick from this list to generate daily videos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 mb-4">
                    {account.topicQueue?.map((topic: string, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                            <p>{topic}</p>
                            <Button variant="ghost" size="icon" onClick={() => removeTopic({ accountId: account._id, topic })}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {(account.topicQueue?.length ?? 0) === 0 && <p className="text-center text-muted-foreground py-4">This queue is empty. <br />To start automations, you need to provide the first topic for <br />the AI to learn what kind of content to create.</p>}
                </div>
                <form onSubmit={handleAddTopic} className="flex space-x-2">
                    <Input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Add a new topic idea..." />
                    <Button type="submit">Add</Button>
                </form>
            </CardContent>
        </Card>
    );
}

function EditAccountModal({ account, casts }: { account: Account, casts: Cast[] }) {
    const [displayName, setDisplayName] = useState(account.displayName);
    const [bio, setBio] = useState(account.bio || "");
    const [creativeBrief, setCreativeBrief] = useState(account.creativeBrief || "");
    const [postSchedule, setPostSchedule] = useState(account.postSchedule || "");
    const [castWeights, setCastWeights] = useState<{ castId: string, weight: number }[]>(account.castWeights?.map(cw => ({ ...cw, castId: cw.castId as Id<"casts"> })) || []);
    const updateAccount = useMutation(api.accounts.updateAccount);
    const deleteAccount = useMutation(api.accounts.deleteAccount);
    const generateInstagramAuthUrl = useAction(api.instagramAuth.generateInstagramAuthUrl);
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const instagramPlatform = account.platforms.find(p => p.platform === 'instagram');
    const isInstagramConnected = instagramPlatform?.credentials?.accessToken &&
        instagramPlatform?.credentials?.expiresAt &&
        instagramPlatform.credentials.expiresAt > Date.now();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) {
            alert("Please provide a display name.");
            return;
        }
        await updateAccount({
            accountId: account._id,
            displayName,
            bio,
            creativeBrief,
            postSchedule,
            castWeights: castWeights.map(cw => ({ ...cw, castId: cw.castId as Id<"casts"> }))
        });
        setIsOpen(false);
    }

    const handleDelete = async () => {
        await deleteAccount({ accountId: account._id });
        setIsOpen(false);
        setShowDeleteConfirm(false);
    };

    const handleConnectInstagram = async () => {
        setIsConnecting(true);
        try {
            const authUrl = await generateInstagramAuthUrl({ accountId: account._id });
            window.location.href = authUrl;
        } catch (error) {
            console.error('Failed to generate Instagram auth URL:', error);
            setIsConnecting(false);
        }
    };

    const handleSelectionChange = (options: Option[]) => {
        const newCastWeights = options.map(option => {
            const existing = castWeights.find(cw => cw.castId === option.value);
            return {
                castId: option.value,
                weight: existing?.weight || 50,
            };
        });
        setCastWeights(newCastWeights);
    };

    const handleWeightChange = (castId: string, weight: number) => {
        setCastWeights(castWeights.map(cw => cw.castId === castId ? { ...cw, weight } : cw));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit {account.displayName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g., AI Peter" required />
                    </div>

                    <div>
                        <Label htmlFor="bio">Account Bio</Label>
                        <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short description of the account's persona, content, and target audience." />
                    </div>

                    <div>
                        <Label htmlFor="creativeBrief">Creative Brief</Label>
                        <Textarea id="creativeBrief" value={creativeBrief} onChange={e => setCreativeBrief(e.target.value)} placeholder="A creative brief for the next batch of videos. e.g., 'Focus on historical what-if scenarios.'" />
                    </div>

                    <div>
                        <Label htmlFor="postSchedule">Daily Post Time (HH:MM in UTC)</Label>
                        <Input id="postSchedule" type="time" value={postSchedule} onChange={e => setPostSchedule(e.target.value)} />
                    </div>

                    <div>
                        <Label>Instagram Connection</Label>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                                <Instagram className="h-4 w-4" />
                                <span className="text-sm">
                                    {isInstagramConnected ? (
                                        <span className="text-green-600">Connected as @{instagramPlatform?.credentials?.username}</span>
                                    ) : (
                                        <span className="text-orange-600">Not connected</span>
                                    )}
                                </span>
                            </div>
                            {!isInstagramConnected && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleConnectInstagram}
                                    disabled={isConnecting}
                                >
                                    {isConnecting ? 'Connecting...' : 'Connect'}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label>Available Casts</Label>
                        <MultipleSelector
                            value={castWeights.map(cw => ({ value: cw.castId, label: casts.find((c: Cast) => c._id === cw.castId)?.name || "Unknown" }))}
                            onChange={handleSelectionChange}
                            options={casts.map((cast: Cast) => ({ value: cast._id, label: cast.name }))}
                            placeholder="Select cast members..."
                            className="w-full"
                        />
                    </div>

                    {castWeights.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <Label>Cast Weights</Label>
                            {castWeights.map(cw => {
                                const cast = casts.find((c: Cast) => c._id === cw.castId);
                                return (
                                    <div key={cw.castId} className="space-y-2">
                                        <Label className="text-sm font-medium">{cast?.name}</Label>
                                        <div className="flex items-center space-x-4">
                                            <Slider
                                                value={[cw.weight]}
                                                onValueChange={([val]) => handleWeightChange(cw.castId, val)}
                                                max={100}
                                                step={1}
                                                className="w-full"
                                            />
                                            <span className="text-sm text-muted-foreground w-8">{cw.weight}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-between pt-4">
                        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="destructive">Delete Account</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Are you sure?</DialogTitle>
                                </DialogHeader>
                                <p>This will permanently delete the {account.displayName} account and all its data. This action cannot be undone.</p>
                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                                    <Button variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
} 