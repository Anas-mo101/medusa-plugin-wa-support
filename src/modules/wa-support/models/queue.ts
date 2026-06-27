import { model } from "@medusajs/framework/utils";
import { Whatsapp } from "./whatsapp";
import { Act } from "./act";


export const Queue = model.define("queue", {
  id: model.id().primaryKey(),
  name: model.text().unique(),
  color: model.text().unique(),
  greetingMessage: model.text().nullable(),
  whatsapps: model.manyToMany(() => Whatsapp),
  act: model.belongsTo(() => Act).nullable(),
});