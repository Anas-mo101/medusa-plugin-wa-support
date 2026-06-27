import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Tabs } from "@medusajs/ui"
import {
    ChatBubbleLeftRight,
    ComputerDesktop,
    Users,
    QueueList,
    Robot
} from "@medusajs/icons"
import { ConnectionsTab } from "./components/connections-tab"
import { QueuesTab } from "./components/queues-tab"
import { ContactsTab } from "./components/contacts-tab"
import { TicketsTab } from "./components/tickets-tab"
import { AutomationsTab } from "./components/automations-tab"

const WaSupportPage = () => {
    return (
        <Container className="p-0 overflow-hidden">
            
            {/* Page Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-ui-border-base">
                <div>
                    <Heading level="h1" className="font-sans font-semibold text-h1 text-ui-text-base">
                        WA Automations
                    </Heading>
                    <p className="text-ui-text-subtle text-sm mt-1">
                        Manage your WhatsApp connections,
                        incoming routing queues, active chats,
                        and automation workflows.
                    </p>
                </div>
            </div>

            {/* Tabs Navigation Layout */}
            <Tabs defaultValue="connections">
                <Tabs.List className="px-6 py-4 border-b border-ui-border-base bg-ui-bg-subtle">
                    <Tabs.Trigger value="connections" className="flex items-center gap-x-2">
                        <ComputerDesktop className="text-ui-text-subtle" />
                        Connections
                    </Tabs.Trigger>
                    <Tabs.Trigger value="queues" className="flex items-center gap-x-2">
                        <QueueList className="text-ui-text-subtle" />
                        Queues
                    </Tabs.Trigger>
                    <Tabs.Trigger value="contacts" className="flex items-center gap-x-2">
                        <Users className="text-ui-text-subtle" />
                        Contacts
                    </Tabs.Trigger>
                    <Tabs.Trigger value="tickets" className="flex items-center gap-x-2">
                        <ChatBubbleLeftRight className="text-ui-text-subtle" />
                        Tickets
                    </Tabs.Trigger>
                    <Tabs.Trigger value="automations" className="flex items-center gap-x-2">
                        <Robot className="text-ui-text-subtle" />
                        Automations
                    </Tabs.Trigger>
                </Tabs.List>

                {/* Tab Panels */}
                <div className="p-6">
                    <Tabs.Content value="connections">
                        <ConnectionsTab />
                    </Tabs.Content>
                    <Tabs.Content value="queues">
                        <QueuesTab />
                    </Tabs.Content>
                    <Tabs.Content value="contacts">
                        <ContactsTab />
                    </Tabs.Content>
                    <Tabs.Content value="tickets">
                        <TicketsTab />
                    </Tabs.Content>
                    <Tabs.Content value="automations">
                        <AutomationsTab />
                    </Tabs.Content>
                </div>
            </Tabs>
        </Container>
    )
}


// Define side-navigation links using the Medusa Admin SDK configuration mapping
export const config = defineRouteConfig({
    label: "WA Support",
    icon: ComputerDesktop,
})

export default WaSupportPage