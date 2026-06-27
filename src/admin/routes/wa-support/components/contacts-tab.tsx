import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Container,
  Heading,
  Table,
  Drawer,
  Input,
  Label,
  IconButton,
  DropdownMenu,
  Badge,
  Avatar
} from "@medusajs/ui";
import { EllipsisHorizontal, PencilSquare, Trash, MagnifyingGlass } from "@medusajs/icons";
import { sdk } from "../../../lib/sdk";

interface Contact {
  id: string;
  name: string;
  number: string;
  email: string;
  profilePicUrl?: string;
  isGroup: boolean;
}

export const ContactsTab = () => {
  const queryClient = useQueryClient();

  // Search State with Debounce
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500); // Wait 500ms after last keystroke before triggering search
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", email: "" });

  // --- QUERIES & MUTATIONS ---

  const { data, isLoading } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["admin", "whatsapp-contacts", debouncedSearch],
    queryFn: () => {
      const queryParams = debouncedSearch ? `?number=${encodeURIComponent(debouncedSearch)}` : "";
      return sdk.client.fetch(`/admin/whatsapp/contacts${queryParams}`, { method: "GET" });
    },
  });

  const { mutate: updateContact, isPending: isUpdating } = useMutation({
    mutationFn: (payload: { id: string; name: string; email: string }) =>
      sdk.client.fetch(`/admin/whatsapp/contacts/${payload.id}`, { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-contacts"] });
      closeDrawer();
    },
  });

  const { mutate: deleteContact, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/whatsapp/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-contacts"] });
    },
  });

  // --- HANDLERS ---

  const openEditDrawer = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || "",
      email: contact.email || ""
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingContact(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      updateContact({ id: editingContact.id, ...formData });
    }
  };

  return (
    <Container className="p-0 overflow-hidden">
      {/* HEADER & SEARCH */}
      <div className="flex items-center justify-between p-6 border-b border-ui-border-base">
        <div>
          <Heading level="h2">WhatsApp Contacts</Heading>
          <p className="text-ui-text-subtle text-small mt-1">
            View synced consumer data records, phone identifiers, and logs.
          </p>
        </div>

        <div className="w-full max-w-[250px]">
          <Input
            type="search"
            placeholder="Search by number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          // Prefixing with the search icon
          // prefix={<MagnifyingGlass className="text-ui-text-subtle" />} 
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Contact</Table.HeaderCell>
            <Table.HeaderCell>Phone Number</Table.HeaderCell>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <Table.Cell className="text-center py-8 text-ui-text-subtle">
                Loading contacts...
              </Table.Cell>
            </Table.Row>
          ) : data?.contacts?.length === 0 ? (
            <Table.Row>
              <Table.Cell className="font-medium"></Table.Cell>
              <Table.Cell className="text-ui-text-subtle"> No contacts found matching your criteria. </Table.Cell>
              <Table.Cell className="text-right"> </Table.Cell>
              <Table.Cell className="text-right"> </Table.Cell>
            </Table.Row>
          ) : (
            data?.contacts.map((contact) => (
              <Table.Row key={contact.id}>
                <Table.Cell>
                  <div className="flex items-center gap-x-3">
                    <Avatar
                      src={contact.profilePicUrl}
                      fallback={contact.name ? contact.name.charAt(0).toUpperCase() : "#"}
                      size="base"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-ui-text-base">{contact.name}</span>
                      <span className="text-ui-text-subtle text-xsmall">{contact.email || "No email"}</span>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="font-mono text-ui-text-subtle">
                  +{contact.number}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={contact.isGroup ? "blue" : "grey"}>
                    {contact.isGroup ? "Group" : "Direct"}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton variant="transparent">
                        <EllipsisHorizontal />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item onClick={() => openEditDrawer(contact)} className="gap-x-2">
                        <PencilSquare className="text-ui-text-subtle" /> Edit Record
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${contact.name}? This will also delete associated tickets.`)) {
                            deleteContact(contact.id);
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

      {/* EDIT DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content className="z-50 right-2">
          <Drawer.Header>
            <Drawer.Title>Edit Contact Details</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4">
            {editingContact && (
              <form id="contact-form" onSubmit={handleSubmit} className="flex flex-col gap-y-6">

                {/* Read-Only Context */}
                <div className="bg-ui-bg-subtle p-3 rounded-md flex items-center gap-x-3 border border-ui-border-base">
                  <Avatar
                    src={editingContact.profilePicUrl}
                    fallback={editingContact.name ? editingContact.name.charAt(0).toUpperCase() : "#"}
                  />
                  <div className="flex flex-col">
                    <span className="text-xsmall text-ui-text-subtle uppercase tracking-wider font-semibold">WhatsApp ID</span>
                    <span className="font-mono text-small">+{editingContact.number}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="name">Contact Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <p className="text-ui-text-subtle text-xsmall">
                    Initially populated from their WhatsApp public profile name.
                  </p>
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    type="email"
                    id="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </form>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
            </Drawer.Close>
            <Button type="submit" form="contact-form" isLoading={isUpdating}>
              Save Changes
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};