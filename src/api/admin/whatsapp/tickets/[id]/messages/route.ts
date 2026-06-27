import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../../../modules/wa-support";
import WaSupportModuleService from "../../../../../../modules/wa-support/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { id } = req.params;

  const messages = await waService.listMessages({ ticket_id: id }, {
    order: { created_at: "ASC" } // Oldest to newest for chat flow
  });

  res.status(200).json({ messages });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { id } = req.params;
  const { body, whatsappId } = req.body as { body: string; whatsappId: string };

  // Utilize the unified Baileys sending function established earlier
  await waService.sendWhatsAppMessage(whatsappId, id, body);

  res.status(201).json({ success: true });
}