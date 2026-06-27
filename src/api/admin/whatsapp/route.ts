import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import WaSupportModuleService from "../../../modules/wa-support/service";
import { WAA_MODULE } from "../../../modules/wa-support";
import { z } from "@medusajs/framework/zod";

export const WhatsAppInputSchema = z.object({
  name: z.string()
})

type WhatsAppInput = z.infer<typeof WhatsAppInputSchema>

/**
 * GET /admin/whatsapp
 * List all WhatsApp connections
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);

  const ws = await waService.getDefaultWhatsappAndEnsureAlive();

  res.status(200).json({ connections: [ws] });
}

/**
 * POST /admin/whatsapp
 * Create a new connection instance (Max 1 allowed logic enforced here too as a guard)
 */
export async function POST(
  req: MedusaRequest<WhatsAppInput>,
  res: MedusaResponse
) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  const existing = await waService.listWhatsapps();
  if (existing.length >= 1) {
    return res.status(400).json({
      message: "Application constraint: Only one WhatsApp connection can be active."
    });
  }

  const { name } = req.validatedBody as { name: string };

  // 1. Create record in DB
  const newConnection = await waService.createWhatsapps({
    name: name || "Primary Business Line",
    status: "DISCONNECTED",
    isDefault: true,
    greetingMessage: "Welcome !!!"
  });

  await waService.initWhatsappSession(newConnection.id).catch((err: any) => {
    logger.error(`[WAA API] Async init failed for ${newConnection.id}: ${err.message}`);
  });

  res.status(201).json({ connection: newConnection });
}