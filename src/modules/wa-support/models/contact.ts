import { model } from "@medusajs/framework/utils";
import { ContactCustomField } from "./contact-custom-field";


export const Contact = model.define("contact", {
  id: model.id().primaryKey(),
  name: model.text(),
  number: model.text().unique(),
  profilePicUrl: model.text().nullable(),
  isGroup: model.boolean().default(false),
  customFields: model.hasMany(() => ContactCustomField),
});