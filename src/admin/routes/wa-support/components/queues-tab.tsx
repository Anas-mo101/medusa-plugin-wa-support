import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Container,
  Heading,
  Table,
  Drawer,
  Input,
  Label,
  Textarea,
  IconButton,
  DropdownMenu,
  Select
} from "@medusajs/ui";
import { Plus, EllipsisHorizontal, PencilSquare, Trash } from "@medusajs/icons";
import { sdk } from "../../../lib/sdk";

// Types
interface Queue {
  id: string;
  name: string;
  color: string;
  greetingMessage?: string;
  act_id?: string | null;
  created_at: string;
}

interface QueueState {
  name: string;
  color: string;
  greetingMessage?: string | null;
  act_id?: string | null;
}

interface Act {
  id: string;
  name: string;
  flow: {};
}

export const QueuesTab = () => {
  const queryClient = useQueryClient();

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);

  // Form State
  const [formData, setFormData] = useState<QueueState>({
    name: "",
    color: "#3B82F6",
    greetingMessage: "",
    act_id: ""
  });

  // --- QUERIES & MUTATIONS ---

  const { data, isLoading } = useQuery<{ queues: Queue[] }>({
    queryKey: ["admin", "whatsapp-queues"],
    queryFn: () => sdk.client.fetch("/admin/whatsapp/queues", { method: "GET" }),
  });

  const { data: actsData, isLoading: isLoadingActs } = useQuery<{ automations: Act[] }>({
    queryKey: ["admin", "whatsapp-acts"],
    queryFn: () => sdk.client.fetch("/admin/whatsapp/acts", { method: "GET" }),
  });

  const { mutate: createQueue, isPending: isCreating } = useMutation({
    mutationFn: (payload: typeof formData) =>
      sdk.client.fetch("/admin/whatsapp/queues", { method: "POST", body: payload }),
    onSuccess: () => handleSuccess(),
  });

  const { mutate: updateQueue, isPending: isUpdating } = useMutation({
    mutationFn: (payload: { id: string } & typeof formData) => sdk.client.fetch(`/admin/whatsapp/queues/${payload.id}`, {
      method: "POST",
      body: payload
    }),
    onSuccess: () => handleSuccess(),
  });

  const { mutate: deleteQueue, isPending: _ } = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/whatsapp/queues/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-queues"] }),
  });

  // --- HANDLERS ---

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-queues"] });
    closeDrawer();
  };

  const openCreateDrawer = () => {
    setEditingQueue(null);
    setFormData({ name: "", color: "#3B82F6", greetingMessage: "", act_id: null });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (queue: Queue) => {
    setEditingQueue(queue);
    setFormData({
      name: queue.name,
      color: queue.color,
      greetingMessage: queue.greetingMessage || "",
      act_id: queue.act_id
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingQueue(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQueue) {
      updateQueue({ id: editingQueue.id, ...formData });
    } else {
      createQueue(formData);
    }
  };

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-ui-border-base">
        <div>
          <Heading level="h2">Service Queues</Heading>
          <p className="text-ui-text-subtle text-small mt-1">
            Configure department routing and automated greeting payloads.
          </p>
        </div>
        <Button size="small" variant="secondary" onClick={openCreateDrawer}>
          <Plus /> Create Queue
        </Button>
      </div>

      {/* DATA TABLE */}
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Queue Name</Table.HeaderCell>
            <Table.HeaderCell>Color</Table.HeaderCell>
            <Table.HeaderCell>Greeting Message</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <Table.Cell className="text-center py-8 text-ui-text-subtle">
                Loading queues...
              </Table.Cell>
            </Table.Row>
          ) : data?.queues?.length === 0 ? (
            <Table.Row key={1}>
                <Table.Cell className="font-medium"></Table.Cell>
                <Table.Cell>
                </Table.Cell>
                <Table.Cell className="max-w-[300px] truncate text-ui-text-subtle">
                  No queues configured. Create one to get started.
                </Table.Cell>
                <Table.Cell className="text-right">
                </Table.Cell>
              </Table.Row>
          ) : (
            data?.queues.map((queue) => (
              <Table.Row key={queue.id}>
                <Table.Cell className="font-medium">{queue.name}</Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-x-2">
                    <span
                      className="w-4 h-4 rounded-full border border-ui-border-base"
                      style={{ backgroundColor: queue.color }}
                    />
                    <span className="text-ui-text-subtle text-small font-mono">{queue.color}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="max-w-[300px] truncate text-ui-text-subtle">
                  {queue.greetingMessage || "—"}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton variant="transparent">
                        <EllipsisHorizontal />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item onClick={() => openEditDrawer(queue)} className="gap-x-2">
                        <PencilSquare className="text-ui-text-subtle" /> Edit Queue
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${queue.name}?`)) {
                            deleteQueue(queue.id);
                          }
                        }}
                        className="gap-x-2 text-ui-fg-error"
                      >
                        <Trash /> Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {/* CREATE / EDIT DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content className="z-50 right-2">
          <Drawer.Header>
            <Drawer.Title>{editingQueue ? "Edit Queue" : "Create New Queue"}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4">
            <form id="queue-form" onSubmit={handleSubmit} className="flex flex-col gap-y-6">
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="name">Queue Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sales Support"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-y-2">
                <Label htmlFor="color">Identification Color</Label>
                <div className="flex items-center gap-x-3">
                  <Input
                    type="color"
                    id="color"
                    className="w-12 h-10 p-1 cursor-pointer"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    required
                  />
                  <Input
                    className="flex-1 font-mono uppercase"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-y-2">
                <Label htmlFor="greeting">Greeting Message (Optional)</Label>
                <Textarea
                  id="greeting"
                  placeholder="Hello! You've reached the Sales team. How can we help you today?"
                  rows={4}
                  value={formData.greetingMessage ?? ""}
                  onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                />
                <p className="text-ui-text-subtle text-xs">
                  This message is sent automatically when a user is routed into this queue.
                </p>
              </div>

              {/* AUTOMATION DROPDOWN */}
              <div className="flex flex-col gap-y-2">
                <Label>Assigned Automation Flow (Optional)</Label>
                <Select
                  value={formData.act_id || "none"}
                  onValueChange={(val) => setFormData({
                    ...formData,
                    act_id: val === "none" ? null : val
                  })}
                  disabled={isLoadingActs} 
                >
                  <Select.Trigger>
                    <Select.Value placeholder={isLoadingActs ? "Loading automations..." : "Select an automation flow"} />
                  </Select.Trigger>
                  <Select.Content className="z-[100]">
                    <Select.Item value="none">None</Select.Item>
                    {actsData?.automations?.map((act) => (
                      <Select.Item key={act.id} value={String(act.id)}>
                        {act.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </form>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
            </Drawer.Close>
            <Button type="submit" form="queue-form" isLoading={isCreating || isUpdating}>
              {editingQueue ? "Save Changes" : "Create Queue"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};