import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../../modules/wa-support";
import WaSupportModuleService from "../../../../../modules/wa-support/service";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { id } = req.params;
  
  const { name, flow } = req.body as { name: string; flow: {} };

  const automation = await waService.updateActs({
    id,
    ...(name && { name }),
    ...(flow && { flow }),
  });

  res.status(200).json({ automation });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { id } = req.params;

  await waService.deleteActs(id);

  res.status(200).json({ success: true });
}