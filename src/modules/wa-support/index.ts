import WaSupportModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const WAA_MODULE = "waSupport"

export default Module(WAA_MODULE, {
  service: WaSupportModuleService,
})