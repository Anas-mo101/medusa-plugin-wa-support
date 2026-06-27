import { MedusaContainer } from "@medusajs/framework/types";
import WaSupportModuleService from "../modules/wa-support/service";
import { WAA_MODULE } from "../modules/wa-support";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function whatsappWatchdog(container: MedusaContainer) {
    const waService = container.resolve<WaSupportModuleService>(WAA_MODULE);
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info(`[WAA Watchdog] Checking ....`);

    // Fetch accounts that are marked as CONNECTED in the DB
    const whatsapps = await waService.listWhatsapps({ status: "CONNECTED" });

    for (const whatsapp of whatsapps) {
        // Assume you have a method to check if the socket is actually connected
        const isConnected = waService.isSessionConnected(whatsapp.id);

        if (!isConnected) {
            logger.info(`[Watchdog] Session ${whatsapp.name} is down. Reconnecting...`);
            await waService.initWhatsappSession(whatsapp.id, {
                reInit: true
            });
        }
    }
}

// This configuration runs the job every 5 minutes
export const config = {
    name: "whatsapp-watchdog-job",
    schedule: "*/10 * * * *",
};