import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import WaSupportModuleService from "../../../../modules/wa-support/service";
import { WAA_MODULE } from "../../../../modules/wa-support";

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const whatsapp_id = req.params.whatsapp_id;
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);

  await waService.deleteWhatsppSession(whatsapp_id);

  res.status(201);
}