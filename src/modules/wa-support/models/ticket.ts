import { model } from "@medusajs/framework/utils";
import { Contact } from "./contact";
import { Queue } from "./queue";
import { Whatsapp } from "./whatsapp";
import { Message } from "./message";

export enum TicketStatus {
  PENDING = "pending",
  OPEN = "open",
  CLOSED = "closed",
}

export const Ticket = model.define("ticket", {
  id: model.id().primaryKey(),
  status: model.enum(TicketStatus).default(TicketStatus.PENDING),
  lastMessage: model.text().nullable(),
  isGroup: model.boolean().default(false),
  unreadMessages: model.number().nullable(),
  isACTDone: model.boolean().default(false),
  lastACTNode: model.text().nullable(),
  contact: model.belongsTo(() => Contact),
  whatsapp: model.belongsTo(() => Whatsapp).nullable(),
  queue: model.belongsTo(() => Queue).nullable(),
  messages: model.hasMany(() => Message),

  user_id: model.text().nullable(),
});