import { model } from "@medusajs/framework/utils";
import { Contact } from "./contact";


export const ContactCustomField = model.define("contact_custom_field", {
  id: model.id().primaryKey(),
  name: model.text(),
  value: model.text(),
  contact: model.belongsTo(() => Contact),
});