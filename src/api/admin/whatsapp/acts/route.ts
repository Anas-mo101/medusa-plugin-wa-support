import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../modules/wa-support";
import WaSupportModuleService from "../../../../modules/wa-support/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);

  const automations = await waService.listActs({}, {
    order: { created_at: "DESC" },
  });

  res.status(200).json({ automations });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  
  const { name, flow } = req.body as { name: string; flow: {} };

  const automation = await waService.createActs({
    name,
    flow,
  });

  res.status(201).json({ automation });
}