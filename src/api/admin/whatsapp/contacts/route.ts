import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../modules/wa-support";
import WaSupportModuleService from "../../../../modules/wa-support/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  const { number, page } = req.query as { number?: string, page?: string };

  let filters = {};
  
  if (number) {
    // Medusa v2 Data Access Layer supports robust filtering operators
    filters = { 
      number: { $ilike: `%${number}%` } 
    };
  }

  const contacts = await waService.listContacts(filters, {
    order: { created_at: "DESC" },
    take: 50, // Limit results to keep UI snappy
    
  });

  res.status(200).json({ contacts });
}