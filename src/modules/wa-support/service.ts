import { AbstractEventBusModuleService, MedusaError, MedusaService } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/medusa";
import type {
    WASocket,
    WAMessage,
    WAMessageKey
} from "@whiskeysockets/baileys" with { "resolution-mode": "import" };
import { Boom } from "@hapi/boom";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
// Models
import { Contact } from "./models/contact";
import { ContactCustomField } from "./models/contact-custom-field";
import { Act } from "./models/act";
import { Ticket, TicketStatus } from "./models/ticket";
import { Whatsapp } from "./models/whatsapp";
import { Message } from "./models/message";
import { Queue } from "./models/queue";
import { InferTypeOf } from "@medusajs/framework/types";
import { WhatsappSessionKey } from "./models/whatsapp-session-key";
import { Automation, AutomationFlow, AutomationNode } from "./utils/automation";
import { emitEventStep } from "@medusajs/medusa/core-flows"

type InjectedDependencies = {
    logger: Logger;
    event_bus: AbstractEventBusModuleService
};

export default class WaSupportModuleService extends MedusaService({
    ContactCustomField,
    Contact,
    Message,
    Queue,
    Act,
    Ticket,
    Whatsapp,
    WhatsappSessionKey
}) {
    private logger: Logger;
    private sessions: Map<string, WASocket> = new Map();
    private automation: Automation;
    private MAX_RETRIES = 3;
    protected eventBusService_: AbstractEventBusModuleService

    constructor({ logger, event_bus }: InjectedDependencies) {
        super(arguments[0]);
        this.logger = logger;
        this.eventBusService_ = event_bus

        this.automation = Automation.create({
            getACT: async (ticketId: string) => {
                this.logger.info(`[WaSupportModuleService] Automation getACT`);

                const ticket = await this.retrieveTicket(ticketId);

                if (!ticket.queue_id) {
                    throw new MedusaError(
                        MedusaError.Types.NOT_ALLOWED,
                        "Queue is not assgined to ticket"
                    )
                }

                const queue = await this.retrieveQueue(ticket.queue_id, {
                    relations: ["act"]
                });

                if (!queue.act_id) {
                    throw new MedusaError(
                        MedusaError.Types.NOT_ALLOWED,
                        "Act is not assgined to queue"
                    )
                }

                const act = await this.retrieveAct(queue.act_id)
                const flow = act.flow as unknown as AutomationFlow;

                return {
                    id: act.id,
                    currentTicketId: ticket.id,
                    isDone: ticket.isACTDone,
                    lastNodeId: ticket.lastACTNode,
                    flow: flow
                };
            },
            updateLastNode: async (ticketId: string, nodeId: string) => {
                this.logger.info(`[WaSupportModuleService] Automation ticket ${ticketId} updateLastNode`);

                await this.updateTickets({
                    id: ticketId,
                    lastACTNode: nodeId
                })
            },
            toggleACTIsDone: async (ticketId: string, isDone: boolean) => {
                this.logger.info(`[WaSupportModuleService] Automation ticket ${ticketId} toggleACTIsDone: ${isDone}`);

                await this.updateTickets({
                    id: ticketId,
                    isACTDone: isDone
                })
            },
            nodeFunctions: [
                {
                    type: "mcqNode",
                    process: (node: AutomationNode, ticketId: string) => {
                        this.logger.info(`[WaSupportModuleService] Automation emit mcqNode`);
                        this.eventBusService_.emit({
                            name: "waa.message",
                            data: {
                                ...node,
                                ticketId
                            },
                        }, {})
                    }
                },
                {
                    type: "respondNode",
                    process: (node: AutomationNode, ticketId: string) => {
                        this.logger.info(`[WaSupportModuleService] Automation emit respondNode`);
                        this.eventBusService_.emit({
                            name: "waa.message",
                            data: {
                                ...node,
                                ticketId
                            },
                        }, {})
                    }
                },
            ]
        });
    }

    // ---------------------------------------------------------
    // SESSION MANAGEMENT
    // ---------------------------------------------------------

    /**
     * Initializes a Baileys socket connection for a specific WhatsApp record.
     */
    async initWhatsappSession(
        whatsappId: string,
        options?: {
            reInit: boolean
        }
    ): Promise<void> {
        if (options?.reInit ?? false) {
            const sock = this.sessions.get(whatsappId);
            if (sock) {
                sock.ws?.close();
                this.sessions.delete(whatsappId);
            }
        }

        const whatsapp = await this.retrieveWhatsapp(whatsappId);
        if (!whatsapp) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                "WhatsApp not found"
            )
        }

        const {
            default: makeWASocket,
            DisconnectReason,
            fetchLatestBaileysVersion,
        } = await import("@whiskeysockets/baileys");

        // Initialize custom DB auth state
        const { state, saveCreds } = await this.useDbAuthState(whatsappId);
        const { version } = await fetchLatestBaileysVersion();

        const socket = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
        });

        // Save creds when Baileys updates them
        socket.ev.on("creds.update", saveCreds);

        socket.ev.on("connection.update", async (update) => {
            try {
                const { connection, lastDisconnect, qr } = update;

                if (connection === "close") {
                    const currentReties = whatsapp.retries;

                    const shouldReconnect = (
                        lastDisconnect?.error as Boom
                    )?.output?.statusCode !== DisconnectReason.loggedOut && currentReties < this.MAX_RETRIES;

                    this.logger.error(`[WaSupportModuleService] Connection (retry: ${currentReties}) closed due:`, lastDisconnect?.error);
                    this.logger.error(`[WaSupportModuleService] Reconnecting: ${shouldReconnect}`);

                    if (shouldReconnect) {
                        await this.updateWhatsapps({
                            id: whatsappId,
                            status: "OPENING",
                            retries: currentReties + 1
                        });

                        setTimeout(() => this.initWhatsappSession(whatsappId, { reInit: true }), 5000);
                    } else {
                        await this.deleteWhatsppSession(whatsappId);
                    }
                } else if (connection === "open") {
                    this.logger.info(`[WaSupportModuleService] Session: ${whatsapp.name} CONNECTED`);
                    await this.updateWhatsapps({
                        id: whatsappId,
                        status: "CONNECTED",
                        qrcode: "",
                        retries: 0
                    });
                } else if (qr) {
                    this.logger.info(`[WaSupportModuleService] New QR code generated for session: ${whatsapp.name}`);
                    await this.updateWhatsapps({
                        id: whatsappId,
                        qrcode: qr,
                        status: "qrcode"
                    });
                }
            } catch (error) {
                if (error.type === 'not_found' || error.message.includes('not found')) {
                    this.logger.warn(`[WaSupportModuleService] Ignored ghost event for deleted session: ${whatsappId}`);
                    // Fallback to ensure the socket is dead
                    socket.ws?.close();
                } else {
                    this.logger.error(`[WaSupportModuleService] Connection update error: ${error.message}`);
                }
            }
        });

        socket.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type === "notify") {
                for (const msg of messages) {
                    await this.handleIncomingMessage(whatsappId, msg);
                }
            }
        });

        this.sessions.set(whatsappId, socket);
    }

    private async useDbAuthState(whatsappId: string) {
        const { initAuthCreds, BufferJSON } = await import("@whiskeysockets/baileys");

        // Utilities to safely serialize/deserialize Buffers for the DB
        const parse = (text: string) => JSON.parse(text, BufferJSON.reviver);
        const stringify = (obj: any) => JSON.stringify(obj, BufferJSON.replacer);

        // 1. Manage 'creds' (The main identity data, stored in the existing Whatsapp model)
        const whatsapp = await this.retrieveWhatsapp(whatsappId);
        let creds = whatsapp.session ? parse(whatsapp.session) : initAuthCreds();

        const saveCreds = async () => {
            await this.updateWhatsapps({ id: whatsappId, session: stringify(creds) });
        };

        // 2. Manage 'keys' (The signal protocol keys, stored in the WhatsappSessionKey model)
        const state = {
            creds,
            keys: {
                get: async (type: string, ids: string[]) => {
                    const data: { [key: string]: any } = {};

                    for (const id of ids) {
                        const records = await this.listWhatsappSessionKeys({
                            whatsapp_id: whatsappId,
                            type: type,
                            key_id: id
                        });

                        if (records.length > 0) {
                            data[id] = parse(records[0].data);
                        }
                    }
                    return data;
                },
                set: async (data: any) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];

                            const existingRecords = await this.listWhatsappSessionKeys({
                                whatsapp_id: whatsappId,
                                type: category,
                                key_id: id
                            });

                            if (value) {
                                // Insert or Update
                                if (existingRecords.length > 0) {
                                    await this.updateWhatsappSessionKeys({
                                        id: existingRecords[0].id,
                                        data: stringify(value)
                                    });
                                } else {
                                    await this.createWhatsappSessionKeys({
                                        whatsapp_id: whatsappId,
                                        type: category,
                                        key_id: id,
                                        data: stringify(value)
                                    });
                                }
                            } else {
                                // Falsy value means Baileys wants us to delete the key
                                if (existingRecords.length > 0) {
                                    await this.deleteWhatsappSessionKeys(existingRecords[0].id);
                                }
                            }
                        }
                    }
                }
            }
        };

        return { state, saveCreds };
    }

    async deleteWhatsppSession(whatsapp_id: string) {
        const session = this.sessions.get(whatsapp_id);
        if (session) {
            session.ev.removeAllListeners("connection.update");
            session.ev.removeAllListeners("creds.update");
            session.ev.removeAllListeners("messages.upsert");
            session.ws?.close();
            this.sessions.delete(whatsapp_id);
        }

        const whatsapp_keys = await this.listWhatsappSessionKeys({
            whatsapp_id
        });

        if (whatsapp_keys.length > 0) {
            await this.deleteWhatsappSessionKeys(whatsapp_keys);
        }

        await this.deleteWhatsapps(whatsapp_id);
    }

    async getSocket(whatsappId: string): Promise<WASocket> {
        const sock = this.sessions.get(whatsappId);
        if (!sock) {
            throw new MedusaError(
                MedusaError.Types.FORBIDDEN,
                "Wapp not initialized"
            )
        }
        return sock;
    }

    async getDefaultWhatsapp(): Promise<InferTypeOf<typeof Whatsapp>> {
        const [whatsapp] = await this.listWhatsapps({
            isDefault: true
        });

        if (!whatsapp) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                "no defualt whatsapp defined"
            )
        }

        return whatsapp;
    }

    async getDefaultWhatsappAndEnsureAlive(): Promise<InferTypeOf<typeof Whatsapp> | null> {
        const [whatsapp] = await this.listWhatsapps({
            isDefault: true
        });

        if (!whatsapp) {
            return null;
        }

        const isConnected = await this.isSessionConnected(whatsapp.id);
        if (!isConnected && whatsapp.status === "CONNECTED") {
            await this.initWhatsappSession(whatsapp.id, {
                reInit: true
            });
        }

        return whatsapp;
    }

    public async isSessionConnected(whatsappId: string): Promise<boolean> {
        const session = this.sessions.get(whatsappId);

        if (!session) {
            return false;
        }

        try {
            const isSocketOpen = session.ws?.isOpen;

            const isAuthenticated = !!session.authState?.creds?.me || !!session.user;

            return isSocketOpen && isAuthenticated;
        } catch (error: any) {
            this.logger.warn(
                `[Wa-Automations] Failed to check connection state for ${whatsappId}: ${error.message}`
            );
            return false;
        }
    }

    // ---------------------------------------------------------
    // OUTGOING ACTIONS (Replaces previous standalone files)
    // ---------------------------------------------------------

    /**
     * Verifies if a number is registered on WhatsApp.
     */
    async checkIsValidContact(whatsappId: string, number: string): Promise<boolean> {
        const sock = await this.getSocket(whatsappId);
        const jid = `${number}@s.whatsapp.net`;
        const [result] = await sock.onWhatsApp(jid) ?? [];

        if (!result || !result.exists) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                "not a valid contact"
            );
        }
        return true;
    }

    /**
     * Retrieves the profile picture URL of a contact.
     */
    async getProfilePicUrl(whatsappId: string, number: string): Promise<string | undefined> {
        const sock = await this.getSocket(whatsappId);
        const jid = `${number}@s.whatsapp.net`;
        try {
            return await sock.profilePictureUrl(jid, "image");
        } catch (err) {
            this.logger.warn(`[WaSupportModuleService] Could not fetch profile pic for ${jid}`);
            return undefined;
        }
    }

    /**
     * Sends a standard text message.
     */
    async sendWhatsAppMessage(whatsappId: string, ticketId: string, body: string, quotedMsgId?: string) {
        const sock = await this.getSocket(whatsappId);
        const ticket = await this.retrieveTicket(ticketId, { relations: ["contact"] });

        // Baileys uses @s.whatsapp.net instead of @c.us
        const jid = ticket.isGroup ? `${ticket.contact.number}@g.us` : `${ticket.contact.number}@s.whatsapp.net`;

        const options: any = {};
        if (quotedMsgId) {
            // Look up the quoted message from the DB to reconstruct the key format required by Baileys
            const quotedDbMsg = await this.retrieveMessage(quotedMsgId);
            options.quoted = {
                key: {
                    id: quotedDbMsg.id,
                    remoteJid: jid,
                    fromMe: quotedDbMsg.fromMe,
                },
                message: { conversation: quotedDbMsg.body }
            };
        }

        const sentMsg = await sock.sendMessage(jid, { text: body }, options);

        if (sentMsg) {
            await this.verifyMessage(sentMsg, body, ticket.id, ticket.contact.id, true)
            await this.updateTickets({ id: ticket.id, lastMessage: body });
        }

        return sentMsg;
    }

    /**
     * Sends media (File/Image/Document).
     */
    async sendWhatsAppMedia(whatsappId: string, ticketId: string, filePath: string, mimeType: string, body?: string) {
        const sock = await this.getSocket(whatsappId);
        const ticket = await this.retrieveTicket(ticketId, { relations: ["contact"] });
        const jid = ticket.isGroup ? `${ticket.contact.number}@g.us` : `${ticket.contact.number}@s.whatsapp.net`;

        const fileBuffer = fs.readFileSync(filePath);
        let messagePayload: any = {};

        if (mimeType.startsWith("image/") && !mimeType.includes("document")) {
            messagePayload = { image: fileBuffer, caption: body };
        } else if (mimeType.startsWith("audio/")) {
            messagePayload = { audio: fileBuffer, ptt: true }; // ptt: true sends as voice note
        } else {
            messagePayload = { document: fileBuffer, mimetype: mimeType, fileName: path.basename(filePath), caption: body };
        }

        const sentMsg = await sock.sendMessage(jid, messagePayload);
        await this.updateTickets({ id: ticket.id, lastMessage: body || path.basename(filePath) });

        fs.unlinkSync(filePath); // Clean up after sending
        return sentMsg;
    }

    /**
     * Revokes/Deletes a message.
     */
    async deleteWhatsAppMessage(whatsappId: string, messageId: string) {
        const sock = await this.getSocket(whatsappId);
        const message = await this.retrieveMessage(messageId, { relations: ["ticket", "ticket.contact"] });

        if (!message) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                "No message found with this ID."
            )
        }

        const jid = message.ticket.isGroup
            ? `${message.ticket.contact.number}@g.us`
            : `${message.ticket.contact.number}@s.whatsapp.net`;

        await sock.sendMessage(jid, {
            delete: {
                remoteJid: jid,
                fromMe: message.fromMe,
                id: message.id, // The Baileys message ID stored in your DB
            }
        });

        await this.updateMessages({ id: message.id, isDeleted: true });
        return message;
    }

    // ---------------------------------------------------------
    // INCOMING MESSAGE PIPELINE
    // ---------------------------------------------------------

    /**
     * Replaces the wbotMessageListener logic.
     */
    private async handleIncomingMessage(whatsappId: string, msg: WAMessage) {
        try {
            if (!msg.message) return; // Skip protocol messages or own messages unless handling specific syncs
            this.logger.info("[WaSupportModuleService] new message")

            const {
                isJidGroup,
                decryptPollVote,
                getKeyAuthor,
                jidNormalizedUser
            } = await import("@whiskeysockets/baileys");

            const session = this.sessions.get(whatsappId);
            if (!session) {
                throw new MedusaError(
                    MedusaError.Types.UNEXPECTED_STATE,
                    "Session not found"
                )
            }

            if (!msg.key.remoteJid) {
                throw new MedusaError(
                    MedusaError.Types.UNEXPECTED_STATE,
                    "RemoteJid not found"
                )
            }

            const meIdNormalised = jidNormalizedUser(session.user?.id);

            const rawLid = (session as any)?.authState?.creds?.me?.lid;
            const meLidNormalised = rawLid ? jidNormalizedUser(rawLid) : undefined;

            const voterPnJid = getKeyAuthor(msg.key, meIdNormalised);
            const voterLidJid = jidNormalizedUser(msg.key.remoteJid!);

            const isGroup = isJidGroup(voterPnJid) ?? false;
            const pushName = msg.pushName || this.extractNumber(voterPnJid);
            const number = this.extractNumber(voterPnJid);

            /// ignore group texts
            if (isGroup) {
                this.logger.info("[WaSupportModuleService] skipping group")
                return;
            }

            // Extract body depending on message type (text, extended text, image caption, etc.)
            let body = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption || "";

            // 1. Verify / Create Contact
            const contact = await this.verifyContact(number, pushName, isGroup);
            const unreadMessages = msg.key.fromMe ? 0 : 1;

            // 2. Find / Create Ticket
            const ticket = await this.findOrCreateTicket(
                contact.id,
                whatsappId,
                unreadMessages
            );

            // 3. Process Media or Text
            if (msg.message?.imageMessage || msg.message?.documentMessage || msg.message?.audioMessage) {
                await this.verifyMediaMessage(msg, ticket.id, contact.id);
            } else if (msg.message?.pollUpdateMessage?.pollCreationMessageKey?.id) {
                this.logger.info("[WaSupportModuleService] poll response")

                const creationMsgKey = msg.message.pollUpdateMessage.pollCreationMessageKey.id;
                const pollUpdate = msg.message.pollUpdateMessage;
                const pollMsgId = pollUpdate.pollCreationMessageKey?.id;

                if (!pollMsgId) return;

                const originalDbMessage = await this.retrieveMessage(creationMsgKey);
                if (originalDbMessage && originalDbMessage.metadata) {
                    this.logger.info("[WaSupportModuleService] original poll payload")

                    const originalPayload = originalDbMessage.metadata as any;

                    // 2. Ensure the secret key is a Buffer
                    let encKey = originalPayload.messageContextInfo?.messageSecret;
                    if (typeof encKey === "string") {
                        encKey = Buffer.from(encKey, "base64");
                    } else if (encKey?.type === "Buffer") {
                        encKey = Buffer.from(encKey.data);
                    } else if (encKey instanceof Uint8Array) {
                        encKey = Buffer.from(encKey);
                    }

                    if (!encKey || encKey.length !== 32) {
                        this.logger.error("[WaSupportModuleService] Invalid or missing 32-byte messageSecret.");
                        return;
                    }

                    const creatorPnJid = getKeyAuthor(pollUpdate.pollCreationMessageKey, meIdNormalised);
                    const creatorLidJid = (pollUpdate.pollCreationMessageKey?.fromMe && meLidNormalised)
                        ? meLidNormalised
                        : creatorPnJid;

                    // 3. The 4-Way Permutation Matrix
                    const jidCombos = [
                        { creator: creatorLidJid, voter: voterLidJid, label: "LID x LID" },
                        { creator: creatorPnJid, voter: voterPnJid, label: "PN x PN" },
                        { creator: creatorLidJid, voter: voterPnJid, label: "LID x PN" },
                        { creator: creatorPnJid, voter: voterLidJid, label: "PN x LID" }
                    ];

                    let decrypted: any = null;
                    for (const combo of jidCombos) {
                        try {
                            decrypted = decryptPollVote(pollUpdate.vote as any, {
                                pollCreatorJid: combo.creator,
                                pollMsgId: creationMsgKey,
                                pollEncKey: encKey,
                                voterJid: combo.voter,
                            });

                            this.logger.info(`[WaSupportModuleService] Decryption successful using format: ${combo.label}`);

                            break; // Decryption succeeded! Break out of the loop immediately.
                        } catch (err) {
                            this.logger.error(`[WaSupportModuleService] ${combo.creator}x${combo.voter} === ${combo.label} failed`);
                        }
                    }

                    if (!decrypted) {
                        this.logger.error("[WaSupportModuleService] Failed to decrypt poll vote with all 4 JID combinations.");
                        return;
                    }

                    let selectedOptionName: string | null = null;
                    for (const decryptedHash of decrypted.selectedOptions) {
                        const hashHex = Buffer.from(decryptedHash).toString('hex').toUpperCase();
                        // Compare against the options originally sent
                        for (const option of originalPayload.pollCreationMessageV3?.options || []) {
                            const localHash = crypto.createHash('sha256').update(option.optionName).digest('hex').toUpperCase();
                            if (hashHex === localHash) {
                                selectedOptionName = option.optionName;
                                break;
                            }
                        }
                    }

                    this.logger.info(`[WaSupportModuleService] Decrypted Option: ${selectedOptionName}`);

                    // 5. Route the text to your queue/automation logic
                    if (selectedOptionName && !msg.key.fromMe) {
                        body = selectedOptionName;
                    }
                }
            } else {
                await this.verifyMessage(msg, body, ticket.id, contact.id, msg.key.fromMe ?? false)
            }

            const whatsapp = await this.retrieveWhatsapp(whatsappId)

            if (!ticket.queue && !msg.key.fromMe) {
                await this.verifyQueue(session, msg, body, whatsapp, ticket.id, contact.id);
            }

            // 4. Automation Flow
            if (ticket.queue && !msg.key.fromMe && !ticket.isACTDone) {
                const queue = await this.retrieveQueue(ticket.queue.id)

                if (queue.act_id) {
                    this.logger.info(`[WaSupportModuleService] Automation Triggered`);
                    await this.automation.trigger(body, ticket.id)
                }
            }
        } catch (error: any) {
            this.logger.error("[WaSupportModuleService] message handler failed", error)
        }
    }

    // Helper methodologies you will define based on Medusa's standard repository injections:
    private async verifyContact(number: string, pushName: string, isGroup: boolean): Promise<InferTypeOf<typeof Contact>> {
        const contacts = await this.listContacts({ number: number })
        if (contacts.length < 1) {
            return await this.createContacts({
                number,
                name: pushName,
                isGroup
            });
        }

        if (contacts.length > 1) {
            const [contant, ...rest] = contacts;

            this.logger.warn("[WaSupportModuleService]: multiple contacts with same condition");

            return contant;
        }

        return contacts[0];
    }

    private async findOrCreateTicket(
        contactId: string,
        whatsappId: string,
        unreadMessages?: number,
        groupContact?: InferTypeOf<typeof Contact>
    ): Promise<InferTypeOf<typeof Ticket>> {
        const tickets = await this.listTickets({
            contact_id: groupContact ? groupContact.id : contactId,
            whatsapp_id: whatsappId,
            status: ["open", "pending"]
        }, {
            relations: ["queue"]
        });

        if (tickets.length < 1) {
            return await this.createTickets({
                status: TicketStatus.PENDING,
                isGroup: !!groupContact,
                unreadMessages: unreadMessages,
                whatsapp_id: whatsappId,
                contact_id: groupContact ? groupContact.id : contactId,
            })
        }

        if (tickets.length > 1) {
            const [ticket, ...rest] = tickets;

            await this.updateTickets({
                id: ticket.id,
                unreadMessages
            });

            this.logger.warn("[WaSupportModuleService]: multiple tickets with same condition");

            return ticket;
        }

        await this.updateTickets({
            id: tickets[0].id,
            unreadMessages
        });

        return tickets[0];
    }

    private async verifyMediaMessage(
        msg: WAMessage,
        ticketId: string,
        contactId: string
    ) {
        this.eventBusService_.emit({
            name: "waa.media",
            data: {
                msg: msg,
                ticketId: ticketId,
                contactId: contactId,
            },
        }, {})
    }

    async verifyMessage(
        msg: WAMessage,
        message: string,
        ticketId: string,
        contactId: string,
        fromMe: boolean = false
    ) {
        if (msg.message?.locationMessage) {
            const gmapsUrl = "https://maps.google.com/maps?q=" + msg.message?.locationMessage.degreesLatitude + "%2C" + msg.message?.locationMessage.degreesLongitude + "&z=17&hl=pt-BR";
            const locationBody = "data:image/png;base64," + message + "|" + gmapsUrl;

            await this.createMessages({
                id: msg.key.id!,
                ticket_id: ticketId,
                contact_id: contactId,
                body: locationBody,
                fromMe: false,
                read: false,
                metadata: msg.message as {}
            });
            await this.updateTickets({ id: ticketId, lastMessage: "Location" });

            return;
        }

        await this.createMessages({
            id: msg.key.id!,
            ticket_id: ticketId,
            contact_id: contactId,
            body: message,
            fromMe: fromMe,
            read: false,
            metadata: msg.message as {}
        });
        await this.updateTickets({ id: ticketId, lastMessage: message });
    }

    private async verifyQueue(
        socket: WASocket,
        msg: WAMessage,
        message: string,
        whatsapp: InferTypeOf<typeof Whatsapp>,
        ticketId: string,
        contactId: string
    ) {
        const greetingMessage = whatsapp.greetingMessage || "Please choose an option:";

        const currentQueues = await this.listQueues();

        if (currentQueues.length < 1) {
            return;
        }

        // 1. Handle single queue auto-assignment
        if (currentQueues.length === 1) {
            await this.updateTickets({
                id: ticketId,
                queue_id: currentQueues[0].id
            });

            if (currentQueues[0].greetingMessage && msg.key.remoteJid) {
                const body = this.formatBody(currentQueues[0].greetingMessage); // Ensure this method exists in your class
                const sentMessage = await socket.sendMessage(msg.key.remoteJid, {
                    text: body
                });

                if (sentMessage) {
                    await this.verifyMessage(sentMessage, body, ticketId, contactId, true);
                }
            }
            return;
        }

        try {
            // 2. Attempt to match the user's reply to a queue
            const selectedOption = message.trim().toLowerCase();
            const choosenQueue = currentQueues.find(
                (q, index) => q.name.toLowerCase() === selectedOption || `${index + 1}` === selectedOption          // Matches typed number fallback
            );

            // 3. Valid queue selected
            if (choosenQueue) {
                await this.updateTickets({
                    id: ticketId,
                    queue_id: choosenQueue.id
                });

                if (choosenQueue.greetingMessage && msg.key.remoteJid) {
                    const body = this.formatBody(choosenQueue.greetingMessage);
                    const sentMessage = await socket.sendMessage(msg.key.remoteJid, {
                        text: body
                    });

                    if (sentMessage) {
                        await this.verifyMessage(sentMessage, body, ticketId, contactId, true);
                    }
                }
            } else {
                const pollOptions = currentQueues.map((q) => q.name);

                if (msg.key.remoteJid) {
                    const sentMessage = await socket.sendMessage(msg.key.remoteJid, {
                        poll: {
                            name: greetingMessage,
                            values: pollOptions,
                            selectableCount: 1
                        },
                    });

                    if (sentMessage) {
                        const body = `[Poll Sent] ${greetingMessage}`;
                        await this.verifyMessage(sentMessage, body, ticketId, contactId, true);
                    }
                }
            }
        } catch (e: any) {
            this.logger.error(`[WaSupportModuleService] Error in verifyQueue: ${e.message}`);
        }
    }

    formatBody(message: string): string {
        return `\u200e${message}`
    }

    private extractNumber(jid: string): string {
        return jid.split("@")[0];
    }

    async deleteContact(id: string) {
        const tickets = await this.listTickets({
            contact_id: id
        })

        for (const t of tickets) {
            const messages = await this.listMessages({
                ticket_id: t.id
            })
            await this.deleteMessages(messages);
        }

        await this.deleteTickets(tickets);
        await this.deleteContacts(id);
    }
}