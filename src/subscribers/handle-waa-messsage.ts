import {
    type SubscriberConfig,
    type SubscriberArgs,
} from "@medusajs/framework"
import { AutomationNode } from "../modules/wa-support/utils/automation"
import WaSupportModuleService from "../modules/wa-support/service"
import { WAA_MODULE } from "../modules/wa-support";

export default async function handleWAAMessage({
    event: { data },
    container,
}: SubscriberArgs<AutomationNode & { ticketId: string }>) {
    const waSupportsModuleService: WaSupportModuleService = container.resolve(
        WAA_MODULE
    );

    const getJid = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, "");
        return `${cleanPhone}@s.whatsapp.net`;
    };

    const wapp = await waSupportsModuleService.getDefaultWhatsapp();
    const socket = await waSupportsModuleService.getSocket(wapp.id);
    const ticket = await waSupportsModuleService.retrieveTicket(data.ticketId, {
        relations: ["contact"]
    })

    const jid = getJid(ticket.contact.number);

    switch (data.type) {
        case "respondNode": {
            const question = data.data.question;

            if (question) {
                const body = waSupportsModuleService.formatBody(question);

                const sentMessage = await socket.sendMessage(jid, { text: body });

                if (sentMessage) {
                    await waSupportsModuleService.verifyMessage(sentMessage, body, ticket.id, ticket.contact.id, true);
                }
            }
            break;
        }
        case "mcqNode": {
            const question = data.data.question;
            const options = data.data.handleValues || [];

            if (question && options.length > 0) {
                const formattedQuestion = waSupportsModuleService.formatBody(question);

                const sentMessage = await socket.sendMessage(jid, {
                    poll: {
                        name: formattedQuestion,
                        values: options,
                        selectableCount: 1 // Single-choice selector
                    }
                });

                if (sentMessage) {
                    const bodyLog = `[MCQ Poll] ${formattedQuestion}\nOptions: ${options.join(", ")}`;
                    await waSupportsModuleService.verifyMessage(sentMessage, bodyLog, ticket.id, ticket.contact.id, true);
                }
            }
            break;
        }
    }
}

export const config: SubscriberConfig = {
    event: "waa.message",
}