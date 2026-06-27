import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../modules/wa-support"; // Adjust path to your module export
import WaSupportModuleService from "../../../../modules/wa-support/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const queues = await waService.listQueues();
  res.status(200).json({ queues });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  
  const { name, color, greetingMessage, act_id } = req.body as { 
    name: string; 
    color: string; 
    greetingMessage?: string; 
    act_id?: string;
  };

  const queue = await waService.createQueues({
    name,
    color,
    greetingMessage,
    act_id,
  });

  res.status(201).json({ queue });
}