import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../../modules/wa-support";
import WaSupportModuleService from "../../../../../modules/wa-support/service";
import { TicketStatus } from "../../../../../modules/wa-support/models/ticket";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { id } = req.params;
  
  const { status, user_id } = req.body as { 
    status?: TicketStatus; 
    user_id?: string | null; 
  };

  const ticket = await waService.updateTickets({
    id,
    ...(status && { status }),
    ...(user_id !== undefined && { user_id }),
  });

  res.status(200).json({ ticket });
}