// models/whatsapp-session-key.ts
import { model } from "@medusajs/framework/utils";
import { Whatsapp } from "./whatsapp";

export const WhatsappSessionKey = model.define("whatsapp_session_key", {
  id: model.id().primaryKey(),
  type: model.text(),
  key_id: model.text(),
  data: model.text(),
  whatsapp: model.belongsTo(() => Whatsapp),
});