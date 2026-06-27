import { model } from "@medusajs/framework/utils";
import { Contact } from "./contact";
import { Ticket } from "./ticket";



export const Message = model.define("message", {
  id: model.id().primaryKey(),
  body: model.text(),
  ack: model.number().default(0),
  read: model.boolean().default(false),
  mediaType: model.text().nullable(),
  mediaUrl: model.text().nullable(),
  fromMe: model.boolean().default(false),
  isDeleted: model.boolean().default(false),
  metadata: model.json().nullable(),
  
  ticket: model.belongsTo(() => Ticket),
  contact: model.belongsTo(() => Contact),
  quotedMsg: model.belongsTo(() => Message).nullable(),
});