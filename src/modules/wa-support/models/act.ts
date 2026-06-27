import { model } from "@medusajs/framework/utils";


export const Act = model.define("act", {
  id: model.id().primaryKey(),
  name: model.text(),
  flow: model.json(),
});