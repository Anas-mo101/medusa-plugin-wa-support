import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Container,
  Input,
  Badge,
  Avatar,
  Tabs,
  IconButton
} from "@medusajs/ui";
import { LockClosedSolid, CheckCircleSolid, ChevronRight } from "@medusajs/icons";
import { sdk } from "../../../lib/sdk";
import { useAdminUser } from "../../../hooks/use-admin-user";

// Types
interface Ticket {
  id: string;
  status: "pending" | "open" | "closed";
  lastMessage?: string;
  unreadMessages?: number;
  updated_at: string;
  user_id?: string;
  whatsapp?: { id: string };
  contact: { id: string; name: string; number: string; profilePicUrl?: string };
  user?: { id: string; first_name?: string; email: string };
}

interface Message {
  id: string;
  body: string;
  fromMe: boolean;
  created_at: string;
}

export const TicketsTab = () => {
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAdminUser();

  const [activeTab, setActiveTab] = useState<"pending" | "open" | "closed">("pending");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- QUERIES ---

  // 1. Fetch Tickets
  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["admin", "whatsapp-tickets", activeTab],
    queryFn: () => sdk.client.fetch(`/admin/whatsapp/tickets?status=${activeTab}`, { method: "GET" }),
    refetchInterval: 5000, // Poll for new inbound tickets
  });

  const tickets = ticketsData?.tickets || [];
  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  // 2. Fetch Messages for selected ticket
  const { data: messagesData } = useQuery<{ messages: Message[] }>({
    queryKey: ["admin", "whatsapp-messages", selectedTicketId],
    queryFn: () => sdk.client.fetch(`/admin/whatsapp/tickets/${selectedTicketId}/messages`, { method: "GET" }),
    enabled: !!selectedTicketId,
    refetchInterval: 2000, // Fast poll for chat feel
  });

  const messages = messagesData?.messages || [];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- MUTATIONS ---

  const { mutate: updateTicketStatus } = useMutation({
    mutationFn: (payload: { id: string; status?: "open" | "closed" | "pending"; user_id?: string | null }) =>
      sdk.client.fetch(`/admin/whatsapp/tickets/${payload.id}`, { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-tickets"] }),
  });

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (payload: { ticketId: string; body: string; whatsappId: string }) =>
      sdk.client.fetch(`/admin/whatsapp/tickets/${payload.ticketId}/messages`, { method: "POST", body: payload }),
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-messages", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-tickets"] });
    },
  });

  // --- HANDLERS ---

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedTicket || !selectedTicket.whatsapp) return;

    sendMessage({
      ticketId: selectedTicket.id,
      body: messageInput.trim(),
      whatsappId: selectedTicket.whatsapp.id
    });
  };

  const handleAssignToMe = () => {
    if (!selectedTicket || !currentAdmin) return;
    updateTicketStatus({ id: selectedTicket.id, status: "open", user_id: currentAdmin.id });
  };

  const handleResolve = () => {
    if (!selectedTicket) return;
    updateTicketStatus({ id: selectedTicket.id, status: "closed", user_id: null });
    setSelectedTicketId(null);
  };

  // --- RENDER HELPERS ---
  const isLockedByOther = selectedTicket?.user_id && selectedTicket.user_id !== currentAdmin?.id;
  const isAssignedToMe = selectedTicket?.user_id === currentAdmin?.id;

  return (
    <Container className="p-0 overflow-hidden h-[750px] flex border border-ui-border-base bg-ui-bg-subtle rounded-xl">

      {/* LEFT PANE: Ticket List */}
      <div className="w-1/3 min-w-[300px] border-r border-ui-border-base flex flex-col bg-ui-bg-base">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col h-full">
          <Tabs.List className="px-4 py-3 border-b border-ui-border-base justify-between w-full">
            <Tabs.Trigger value="pending">Inbox</Tabs.Trigger>
            <Tabs.Trigger value="open">Mine</Tabs.Trigger>
            <Tabs.Trigger value="closed">Resolved</Tabs.Trigger>
          </Tabs.List>

          <div className="p-3 border-b border-ui-border-base bg-ui-bg-subtle">
            <Input type="search" placeholder="Search tickets..." className="bg-ui-bg-base" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingTickets ? (
              <div className="p-4 text-center text-ui-text-subtle text-small">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-ui-text-subtle text-small">No tickets found.</div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`flex items-center gap-x-3 p-4 cursor-pointer border-b border-ui-border-base transition-colors hover:bg-ui-bg-subtle-hover ${selectedTicketId === ticket.id ? 'bg-ui-bg-subtle-pressed' : ''}`}
                >
                  <Avatar
                    src={ticket.contact.profilePicUrl}
                    fallback={ticket.contact.name?.charAt(0).toUpperCase() || "#"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-ui-text-base text-small truncate">
                        {ticket.contact.name || `+${ticket.contact.number}`}
                      </span>
                      <span className="text-ui-text-subtle text-xsmall">
                        {new Date(ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ui-text-subtle text-small truncate max-w-[180px]">
                        {ticket.lastMessage || "Media message"}
                      </span>
                      {ticket.unreadMessages ? (
                        <Badge color="green" size="small" className="rounded-full px-2">
                          {ticket.unreadMessages}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Tabs>
      </div>

      {/* RIGHT PANE: Active Chat Workspace */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-ui-bg-base border-b border-ui-border-base px-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-x-3">
                <Avatar src={selectedTicket.contact.profilePicUrl} fallback={selectedTicket.contact.name?.charAt(0).toUpperCase() || "#"} />
                <div>
                  <h3 className="font-semibold text-ui-text-base leading-none">
                    {selectedTicket.contact.name || `+${selectedTicket.contact.number}`}
                  </h3>
                  <p className="text-ui-text-subtle text-xsmall mt-1">
                    {selectedTicket.user ? `Assigned to: ${selectedTicket.user.first_name || selectedTicket.user.email}` : "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="flex gap-x-2">
                {!isAssignedToMe && !isLockedByOther && activeTab !== "closed" && (
                  <Button variant="secondary" size="small" onClick={handleAssignToMe}>
                    <LockClosedSolid className="mr-1" /> Assign to Me
                  </Button>
                )}
                {isAssignedToMe && (
                  <Button variant="primary" size="small" onClick={handleResolve}>
                    <CheckCircleSolid className="mr-1" /> Resolve
                  </Button>
                )}
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[70%] p-3 rounded-lg text-small ${msg.fromMe
                    ? "bg-[#d9fdd3] text-[#111b21] self-end rounded-tr-none shadow-sm"
                    : "bg-white text-[#111b21] self-start rounded-tl-none shadow-sm"
                    }`}
                >
                  <p className="break-words">{msg.body}</p>
                  <span className="text-[10px] text-gray-500 float-right mt-1 ml-3">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="bg-ui-bg-base p-4 border-t border-ui-border-base">
              {isLockedByOther ? (
                <div className="text-center text-ui-text-subtle text-small py-2 bg-ui-bg-subtle rounded-md">
                  This ticket is currently locked by {selectedTicket.user?.first_name || selectedTicket.user?.email}.
                </div>
              ) : activeTab === "closed" ? (
                <div className="text-center text-ui-text-subtle text-small py-2 bg-ui-bg-subtle rounded-md">
                  This ticket is resolved. Re-open to send messages.
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex w-full gap-x-2">
                  <div className="w-[90%]">
                    <Input
                      autoFocus
                      placeholder={isAssignedToMe ? "Type a message..." : "Assign to yourself to reply..."}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="w-full" // Fills the 90% parent wrapper
                      disabled={!isAssignedToMe}
                    />
                  </div>
                  <IconButton
                    className="w-[10%]" // Forces the button to stretch to 10% width
                    type="submit"
                    variant="primary"
                    disabled={!isAssignedToMe || !messageInput.trim() || isSending}
                  >
                    <ChevronRight />
                  </IconButton>
                </form>
              )}
            </div>
          </>
        ) : (
          <Container className="flex-1 flex flex-col items-center justify-center text-ui-text-subtle">
            <p className="text-large">Select a conversation to start messaging</p>
          </Container>
        )}
      </div>
    </Container>
  );
};