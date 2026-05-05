export const assetTagCategoryPrefixesKey = "asset_tag_category_prefixes"
export const assetTagFormatTemplateKey = "asset_tag_format_template"
export const defaultAssetTagFormatTemplate = "{companyCode}{separator}{branchCode}{separator}{assetPrefix}{separator}{running}"

export const systemSettingDefaults = [
  { key: "asset_tag_prefix", value: "AST", description: "Prefix สำหรับรหัสทรัพย์สิน" },
  { key: "asset_tag_separator", value: "-", description: "ตัวคั่นในรหัสทรัพย์สิน" },
  { key: "asset_tag_running_digits", value: "5", description: "จำนวนหลัก Running Number" },
  {
    key: assetTagFormatTemplateKey,
    value: defaultAssetTagFormatTemplate,
    description:
      "รูปแบบ Asset Tag เช่น {companyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}",
  },
  {
    key: assetTagCategoryPrefixesKey,
    value: "{}",
    description: "JSON mapping ประเภทสินค้าไปยัง prefix รหัสทรัพย์สิน เช่น {\"categoryId\":\"COM\"}",
  },
  { key: "company_name", value: "บริษัท ตัวอย่าง จำกัด", description: "ชื่อบริษัทหลัก" },
  { key: "default_currency", value: "THB", description: "สกุลเงินเริ่มต้น" },
]

export const knownSystemSettingKeys = new Set(systemSettingDefaults.map((setting) => setting.key))
