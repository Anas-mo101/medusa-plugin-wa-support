import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Container, Heading} from "@medusajs/ui";
import { ComputerDesktop, ArrowPath, Trash } from "@medusajs/icons";
import { sdk } from "../../../lib/sdk"; // Your configured Medusa SDK instance
import QRCodeDisplay from "./qrcode-display";

interface WhatsAppConnection {
    id: string;
    name: string;
    status: "DISCONNECTED" | "OPENING" | "qrcode" | "CONNECTED";
    qrcode?: string;
}

interface ConnectionsResponse {
    connections: WhatsAppConnection[];
}

export const ConnectionsTab = () => {
    const queryClient = useQueryClient();

    // 1. Query: Fetch connections with automatic polling every 3 seconds
    const { data, isLoading, isError } = useQuery<ConnectionsResponse>({
        queryKey: ["admin", "whatsapp-connections"],
        queryFn: async () => {
            // Utilizing the custom client path via Medusa SDK
            const response = await sdk.client.fetch<ConnectionsResponse>("/admin/whatsapp", {
                method: "GET",
            });
            return response;
        },
        refetchInterval: 5000, 
    });

    // 2. Mutation: Create connection instance
    const { mutate: createConnection, isPending: isCreating } = useMutation({
        mutationFn: async (name: string) => {
            return await sdk.client.fetch<{ connection: WhatsAppConnection }>("/admin/whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: { name },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-connections"] });
        },
    });

    const { mutate: deleteConnection, isPending: isDeleting } = useMutation({
        mutationFn: async (whatsappId: string) => {
            return await sdk.client.fetch(`/admin/whatsapp/${whatsappId}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-connections"] });
        },
        onError: (error) => {
            console.error("Failed to delete the WhatsApp connection:", error);
        }
    });

    const handleCreateConnection = (e: React.FormEvent) => {
        e.preventDefault();
        createConnection("Primary Line");
    };

    const getStatusColorClass = (status: string) => {
        switch (status) {
            case "CONNECTED": return "bg-green-500";
            case "OPENING": return "bg-orange-500";
            case "qrcode": return "bg-blue-500";
            default: return "bg-red-500";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-x-2 text-ui-text-subtle p-4">
                <ArrowPath className="animate-spin" /> Loading connection structures...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-ui-text-danger p-4 text-xs text-center">
                Failed to fetch connection status.
            </div>
        );
    }

    const activeConnection = data?.connections?.[0];

    return (
        <div className="space-y-6">
            {/* Show configuration entry ONLY if no active connection exists */}
            {!activeConnection ? (
                <Container className="p-6 mx-auto max-w-md">
                    <form onSubmit={handleCreateConnection} className="space-y-4">
                        <div>
                            <Heading level="h1" className="mb-1 text-center">Link WhatsApp Account</Heading>
                        </div>
                        <Button type="submit" isLoading={isCreating} className="w-full">
                            Create Connection
                        </Button>
                    </form>
                </Container>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Connection Overview Card */}
                    <Container className="p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-x-3">
                                    <div className="p-2 bg-ui-bg-component rounded-lg border border-ui-border-base">
                                        <ComputerDesktop className="text-ui-text-subtle" />
                                    </div>
                                    <div>
                                        <Heading level="h2" className="text-ui-text-base">{activeConnection.name}</Heading>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex justify-between items-center text-xs py-2">
                                    <span className="text-ui-text-subtle">Engine Protocol</span>
                                    <span className="font-medium text-ui-text-base">Baileys Multi-Device WebSockets</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-ui-text-subtle">Pipeline State</span>
                                    <div className="flex items-center gap-x-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${getStatusColorClass(activeConnection.status)}`} />
                                        <span className="text-ui-text-base">{activeConnection.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="danger"
                            className="flex items-center gap-x-2"
                            isLoading={isDeleting}
                            onClick={() => {
                                if (confirm("Are you sure you want to disconnect and delete this WhatsApp session?")) {
                                    deleteConnection(activeConnection.id);
                                }
                            }}
                        >
                            <Trash fontSize={16} /> Disconnect
                        </Button>
                    </Container>

                    {/* Contextual Action Area for QR and Live States */}
                    <Container className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                        {activeConnection.status === "qrcode" && activeConnection.qrcode ? (
                            <div className="text-center space-y-4">
                                <Heading level="h3">Scan QR Code</Heading>
                                <p className="text-ui-text-subtle text-xs max-w-xs mx-auto">
                                    Open WhatsApp on your phone, go to Linked Devices, and point your camera here to pair.
                                </p>
                                <div className="bg-white p-4 rounded-xl border border-ui-border-base inline-block mx-auto shadow-sm">
                                    <div className="w-48 h-48 flex items-center justify-center bg-ui-bg-subtle text-center text-xsmall font-mono border border-dashed border-ui-border-strong text-ui-text-subtle break-all p-2">
                                        <QRCodeDisplay qrString={activeConnection.qrcode} />
                                    </div>
                                </div>
                            </div>
                        ) : activeConnection.status === "OPENING" ? (
                            <div className="text-center space-y-2">
                                <ArrowPath className="animate-spin mx-auto text-ui-text-subtle" fontSize={24} />
                                <Heading level="h3" className="mt-2">Initializing Node...</Heading>
                                <p className="text-ui-text-subtle text-xs max-w-xs">
                                    Generating cryptographic handshakes with WhatsApp core infrastructure.
                                </p>
                            </div>
                        ) : activeConnection.status === "CONNECTED" ? (
                            <div className="text-center space-y-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${getStatusColorClass(activeConnection.status)}`} />
                                <Heading level="h3" className="mt-2 text-ui-text-success">System Operational</Heading>
                                <p className="text-ui-text-subtle text-xs max-w-xs">
                                    Your server is actively monitoring message queues. No action required.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center text-ui-text-subtle text-xs">
                                Session closed or logged out. Reset your connection to pair again.
                            </div>
                        )}
                    </Container>
                </div>
            )}
        </div>
    );
};