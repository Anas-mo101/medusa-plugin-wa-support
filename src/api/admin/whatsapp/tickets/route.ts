import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAA_MODULE } from "../../../../modules/wa-support";
import WaSupportModuleService from "../../../../modules/wa-support/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const waService: WaSupportModuleService = req.scope.resolve(WAA_MODULE);
  // Extract status filter from query params (e.g., ?status=pending)
  const { status } = req.query as { status?: string };

  const filters = status ? { status } : {};

  // Fetch tickets, joining the contact and user relations to display names
  const tickets = await waService.listTickets(filters, {
    relations: ["contact", "whatsapp"],
    order: { updated_at: "DESC" },
  });

  res.status(200).json({ tickets });
}