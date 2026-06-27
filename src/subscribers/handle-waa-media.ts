import {
    type SubscriberConfig,
    type SubscriberArgs,
} from "@medusajs/framework"
import WaSupportModuleService from "../modules/wa-support/service"
import { Modules } from "@medusajs/framework/utils";
import type {
    WAMessage
} from "@whiskeysockets/baileys" with { "resolution-mode": "import" };
import { WAA_MODULE } from "../modules/wa-support";

type WAAMedia = {
    msg: WAMessage,
    ticketId: string,
    contactId: string
}

export default async function handleWAAMedia({
    event: { data: {msg, ticketId, contactId} },
    container,
}: SubscriberArgs<WAAMedia>) {
    const waSupportsModuleService: WaSupportModuleService = container.resolve(
        WAA_MODULE
    );
    const fileModuleService = container.resolve(Modules.FILE);
    const logger = container.resolve("logger");

    // 1. Dynamically import Baileys media downloader
    const { downloadMediaMessage } = await import("@whiskeysockets/baileys");

    // 2. Identify the media type and extract message payload
    const messageType = Object.keys(msg.message || {})[0] as keyof typeof msg.message;
    const mediaContent: any = msg.message?.[messageType];

    if (!mediaContent || !mediaContent.mimetype) return;

    const mimeType = mediaContent.mimetype as string;
    const caption = mediaContent.caption || "";

    // 3. Generate a safe filename
    const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const randomId = Math.random().toString(36).substring(2, 7);
    const filename = mediaContent.fileName || `wa_media_${randomId}_${Date.now()}.${ext}`;

    try {
        // 4. Download media buffer from WhatsApp
        const buffer = await downloadMediaMessage(
            msg,
            "buffer",
            {},
        );

        // 5. Upload to MedusaJS File Module
        // Note: Medusa v2 expects base64 or buffers depending on the provider.
        // The standard CreateFileDTO expects a base64 encoded string for 'content'.
        const uploadedFiles = await fileModuleService.createFiles({
            filename: filename,
            mimeType: mimeType,
            content: buffer.toString("base64"),
            access: "public"
        });

        // Handle response depending on whether your version returns an array or single object
        const mediaUrl = Array.isArray(uploadedFiles) ? uploadedFiles[0].url : uploadedFiles.url;

        // 6. Save the message to your database
        const body = caption || filename;

        await waSupportsModuleService.createMessages({
            id: msg.key.id!,
            ticket_id: ticketId,
            contact_id: contactId,
            body: body,
            mediaType: mimeType.split("/")[0], // e.g., 'image', 'document', 'audio'
            mediaUrl: mediaUrl,
            fromMe: msg.key.fromMe || false,
            read: msg.key.fromMe || false,
        });

        // 7. Update ticket's last message
        await waSupportsModuleService.updateTickets({
            id: ticketId,
            lastMessage: body
        });

    } catch (error: any) {
        logger.error(`Failed to process media message: ${error.message}`);
    }
}

export const config: SubscriberConfig = {
    event: "waa.media",
}