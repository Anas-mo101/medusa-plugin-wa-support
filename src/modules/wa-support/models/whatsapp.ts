import { model } from "@medusajs/framework/utils";
import { Queue } from "./queue";

export const Whatsapp = model.define("whatsapp", {
  id: model.id().primaryKey(),
  name: model.text().unique(),
  session: model.text().nullable(),
  qrcode: model.text().nullable(),
  status: model.text().nullable(),
  battery: model.text().nullable(),
  plugged: model.boolean().nullable(),
  isDefault: model.boolean().default(false),
  retries: model.number().default(0),
  greetingMessage: model.text().nullable(),
  farewellMessage: model.text().nullable(),
  queues: model.manyToMany(() => Queue),
});