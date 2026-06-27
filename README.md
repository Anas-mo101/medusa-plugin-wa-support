# @anmotechno/medusa-plugin-wa-support

A native, production-grade WhatsApp CRM and support automation plugin for MedusaJS v2. 

Transform your Medusa Admin into a fully-fledged WhatsApp helpdesk. Connect your business number, route incoming chats into department queues, trigger interactive automated dialogue flows, and manage customer support tickets directly alongside your eCommerce data.

## ✨ Features

* **Native Multi-Device Integration:** Powered by `@whiskeysockets/baileys` with full support for companion devices and linked IDs (`@lid`).
* **Database-Backed Sessions:** Zero flat-files. All WhatsApp authentication credentials and signal keys are securely persisted and synchronized via your Medusa PostgreSQL database.
* **Service Queues:** Create distinct departments (e.g., Sales, Support) with custom colors and automated greeting payloads.
* **Interactive Automations (ACTs):** Trigger fully automated dialogue trees and interactive polls when customers enter specific queues.
* **Bulletproof Cryptography:** Includes a custom 4-way AES-GCM decryption matrix to reliably handle encrypted poll votes across all WhatsApp client variations.
* **Admin UI Dashboard:** A seamless, integrated chat interface allowing agents to claim tickets, reply to customers, and manage queues without leaving the Medusa dashboard.

---

## 🚀 Installation

Ensure you are running Medusa v2. Install the plugin via your preferred package manager:

```bash
pnpm add @anmotechno/medusa-plugin-wa-support
```

---

## 🚀 Configuration

Register the plugin in your medusa-config.ts file:

```js
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  projectConfig: {
    // ... your standard project config
  },
  modules: [
    // ... other modules
  ],
  plugins: [
    {
      resolve: "@anmotechno/medusa-plugin-wa-support",
      options: {
        // Add any future plugin-specific options here
      },
    },
  ],
})
```

---

## 📖 Admin User Guide

### 1. Connecting Your Business Number
Navigate to Settings > WA Support in your Medusa Admin.

Click Create Connection.

A QR code will be generated. Open WhatsApp on your primary business device, navigate to Linked Devices, and scan the QR code.

The status will update to CONNECTED. (Note: The system enforces a strict 1-connection maximum to prevent state collisions).

### 2. Setting Up Queues
Configure routing departments to keep your support organized.

Navigate to the WhatsApp tab and open Service Queues.

Click Create Queue (e.g., "General Inquiry", "Returns").

Assign an identification color and an optional greeting message (e.g., "Welcome! How can we help you today?").

### 3. Creating Interactive Automations
Instead of forcing agents to handle triage, you can assign Automations to your queues.

Create a new Automation Flow (ACT).

Design your interactive payload (like a WhatsApp Poll with options such as "Speak to Sales" or "Track an Order").

Return to your Queue settings and attach the Automation Flow. When a customer is routed to that queue, the automation will trigger immediately after the greeting.

### 4. Managing Tickets (The Chat UI)
Open the Support Dashboard. Incoming messages from unrecognized numbers will automatically generate a new Contact and a pending Ticket.

Select a ticket to view the conversation history.

Click "Assign to yourself to reply" to take ownership of the ticket. The input field will unlock, allowing you to send messages directly back to the customer's WhatsApp.