import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../../modules/wa-support"; 
import WaSupportModuleService from "../../../../../modules/wa-support/service";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { id } = req.params;
  
  const updates = req.body as { 
    name?: string; 
    color?: string; 
    greetingMessage?: string; 
    act_id?: string;
  };

  // Auto-generated update methods accept the ID alongside the payload
  const queue = await waService.updateQueues({
    id,
    ...updates
  });

  res.status(200).json({ queue });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { id } = req.params;

  await waService.deleteQueues(id);

  res.status(200).json({ success: true });
}