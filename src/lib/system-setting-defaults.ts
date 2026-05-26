import { assetLabelSettingKeys } from "@/lib/asset-label-template"
import { defaultDepreciationPolicy, depreciationPolicySettingKey } from "@/lib/asset-depreciation"
import { assetQrPublicBaseUrlKey } from "@/lib/asset-qr"
import { assetDataQualityRulesKey, defaultAssetDataQualityRules } from "@/lib/data-quality-rules"
import { defaultLdapSyncMaxScheduledDeactivations, ldapSyncMaxScheduledDeactivationsKey } from "@/lib/ldap-sync-safety"
import {
  retentionAttachmentDaysKey,
  retentionAuditLogDaysKey,
  retentionOrphanFileDaysKey,
  retentionPolicySettingKeys,
} from "@/lib/retention-policy"
import {
  workflowApprovalAuditCloseRequiredKey,
  workflowApprovalDisposalRequiredKey,
  workflowApprovalMaintenanceCloseRequiredKey,
  workflowApprovalMinApproversKey,
  workflowApprovalSegregationRequiredKey,
  workflowApprovalSlaDaysKey,
  workflowApprovalSettingKeys,
} from "@/lib/workflow-approval"

export const assetTagCategoryPrefixesKey = "asset_tag_category_prefixes"
export const assetTagFormatTemplateKey = "asset_tag_format_template"
export const defaultAssetTagFormatTemplate = "{assetCompanyCode}{separator}{branchCode}{separator}{assetPrefix}{separator}{running}"
export const checkoutDocumentTemplateKey = "checkout_document_template"
export const checkinDocumentTemplateKey = "checkin_document_template"
export const operationDocumentRunningDigitsKey = "operation_document_running_digits"
export const defaultCheckoutDocumentTemplate = "HO-{yyyyMM}-{running}"
export const defaultCheckinDocumentTemplate = "RT-{yyyyMM}-{running}"
export const operationDocumentSettingKeys = [
  checkoutDocumentTemplateKey,
  checkinDocumentTemplateKey,
  operationDocumentRunningDigitsKey,
] as const
export const notificationReturnDueSoonDaysKey = "notification_return_due_soon_days"
export const notificationAuditActionDueSoonDaysKey = "notification_audit_action_due_soon_days"
export const notificationWarrantyExpiryDaysKey = "notification_warranty_expiry_days"
export const notificationLicenseExpiryDaysKey = "notification_license_expiry_days"
export const notificationRuleSettingKeys = [
  notificationReturnDueSoonDaysKey,
  notificationAuditActionDueSoonDaysKey,
  notificationWarrantyExpiryDaysKey,
  notificationLicenseExpiryDaysKey,
] as const
export const pmAutoGenerationEnabledKey = "pm_auto_generation_enabled"
export const pmAutoGenerationModeKey = "pm_auto_generation_mode"
export const pmAutoGenerationScheduleKey = "pm_auto_generation_schedule"
export const pmAutoGenerationLastRunAtKey = "pm_auto_generation_last_run_at"
export const pmAutoGenerationLastStatusKey = "pm_auto_generation_last_status"
export const pmAutoGenerationLastErrorKey = "pm_auto_generation_last_error"
export const pmAutoGenerationSettingKeys = [
  pmAutoGenerationEnabledKey,
  pmAutoGenerationModeKey,
  pmAutoGenerationScheduleKey,
] as const
export const pmAutoGenerationStatusSettingKeys = [
  pmAutoGenerationLastRunAtKey,
  pmAutoGenerationLastStatusKey,
  pmAutoGenerationLastErrorKey,
] as const
export const ldapSyncLastRunAtKey = "ldap_sync_last_run_at"
export const ldapSyncLastStatusKey = "ldap_sync_last_status"
export const ldapSyncLastErrorKey = "ldap_sync_last_error"
export const ldapSyncStatusSettingKeys = [
  ldapSyncLastRunAtKey,
  ldapSyncLastStatusKey,
  ldapSyncLastErrorKey,
] as const
export const ldapSettingKeys = [
  "ldap_enabled",
  "ldap_url",
  "ldap_base_dn",
  "ldap_bind_dn",
  "ldap_bind_password",
  "ldap_start_tls",
  "ldap_tls_reject_unauthorized",
  "ldap_user_filter",
  "ldap_upn_domain",
  "ldap_domain",
  "ldap_user_dn_template",
  "ldap_auto_provision",
  "ldap_default_role",
  "ldap_sync_enabled",
  "ldap_sync_base_dn",
  "ldap_sync_filter",
  "ldap_sync_mode",
  "ldap_sync_schedule",
  "ldap_sync_default_company_code",
  "ldap_sync_default_branch_code",
  "ldap_sync_default_department_code",
  "ldap_sync_deactivate_missing",
  ldapSyncMaxScheduledDeactivationsKey,
] as const

export const systemSettingDefaults = [
  { key: "asset_tag_prefix", value: "AST", description: "Prefix สำหรับรหัสทรัพย์สิน" },
  { key: "asset_tag_separator", value: "-", description: "ตัวคั่นในรหัสทรัพย์สิน" },
  { key: "asset_tag_running_digits", value: "5", description: "จำนวนหลัก Running Number" },
  {
    key: assetTagFormatTemplateKey,
    value: defaultAssetTagFormatTemplate,
    description:
      "รูปแบบ Asset Tag เช่น {assetCompanyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}",
  },
  {
    key: assetTagCategoryPrefixesKey,
    value: "{}",
    description: "JSON mapping ประเภทสินค้าไปยัง prefix รหัสทรัพย์สิน เช่น {\"categoryId\":\"COM\"}",
  },
  {
    key: checkoutDocumentTemplateKey,
    value: defaultCheckoutDocumentTemplate,
    description: "Template เลขที่ใบส่งมอบทรัพย์สิน เช่น HO-{yyyyMM}-{running}",
  },
  {
    key: checkinDocumentTemplateKey,
    value: defaultCheckinDocumentTemplate,
    description: "Template เลขที่ใบรับคืนทรัพย์สิน เช่น RT-{yyyyMM}-{running}",
  },
  {
    key: operationDocumentRunningDigitsKey,
    value: "4",
    description: "จำนวนหลัก Running Number สำหรับเอกสารส่งมอบ/รับคืน",
  },
  { key: "company_name", value: "บริษัท ตัวอย่าง จำกัด", description: "ชื่อบริษัทหลัก" },
  { key: "default_currency", value: "THB", description: "สกุลเงินเริ่มต้น" },
  {
    key: depreciationPolicySettingKey,
    value: JSON.stringify(defaultDepreciationPolicy, null, 2),
    description: "JSON policy สำหรับค่าเสื่อม เช่น อายุใช้งานต่อหมวดหมู่และมูลค่าคงเหลือ",
  },
  {
    key: assetDataQualityRulesKey,
    value: JSON.stringify(defaultAssetDataQualityRules),
    description: "กฎตรวจคุณภาพข้อมูลทะเบียนทรัพย์สิน",
  },
  { key: "notification_return_due_soon_days", value: "3", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือนรายการส่งมอบที่ใกล้ครบกำหนดคืน" },
  { key: "notification_audit_action_due_soon_days", value: "7", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือน action plan จากการตรวจนับที่ใกล้ครบกำหนด" },
  { key: "notification_warranty_expiry_days", value: "30", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือนประกันทรัพย์สินใกล้หมดอายุ" },
  { key: "notification_license_expiry_days", value: "30", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือน Software/License ใกล้หมดอายุ" },
  { key: retentionAttachmentDaysKey, value: "1095", description: "จำนวนวันที่เก็บไฟล์แนบ/รูปหลักฐานก่อนพิจารณา archive" },
  { key: retentionAuditLogDaysKey, value: "2555", description: "จำนวนวันที่เก็บ Audit Trail ก่อนพิจารณา archive ตามนโยบายองค์กร" },
  { key: retentionOrphanFileDaysKey, value: "90", description: "จำนวนวันที่เก็บไฟล์ orphan จาก storage governance ก่อนพิจารณา archive/delete" },
  { key: pmAutoGenerationEnabledKey, value: "false", description: "เปิดใช้งานการสร้างใบงาน PM อัตโนมัติจากแผนที่ถึงกำหนด" },
  { key: pmAutoGenerationModeKey, value: "manual", description: "โหมด PM auto-generation: manual หรือ scheduled" },
  { key: pmAutoGenerationScheduleKey, value: "5 6 * * *", description: "Cron schedule สำหรับ PM auto-generation โดย systemd heartbeat จะอ้างอิงค่านี้" },
  { key: workflowApprovalDisposalRequiredKey, value: "true", description: "บังคับใช้ขั้นตอนอนุมัติก่อนตัดจำหน่ายทรัพย์สิน" },
  { key: workflowApprovalAuditCloseRequiredKey, value: "true", description: "บังคับใช้ผู้อนุมัติแยกจากผู้สร้างรอบ ก่อนปิดรอบตรวจนับ" },
  { key: workflowApprovalMaintenanceCloseRequiredKey, value: "false", description: "บังคับใช้การอนุมัติก่อนปิดงานซ่อมบำรุง" },
  { key: workflowApprovalMinApproversKey, value: "1", description: "จำนวนผู้อนุมัติขั้นต่ำสำหรับ workflow approval" },
  { key: workflowApprovalSegregationRequiredKey, value: "true", description: "บังคับใช้ Segregation of Duties ไม่ให้ผู้ทำรายการอนุมัติรายการของตนเอง" },
  { key: workflowApprovalSlaDaysKey, value: "3", description: "จำนวนวันที่งานอนุมัติสามารถค้างได้ก่อนขึ้นเตือนเกิน SLA" },
  { key: "ldap_enabled", value: "false", description: "เปิดใช้งาน AD/LDAP login" },
  { key: "ldap_url", value: "", description: "LDAP URL เช่น ldap://dc.company.local:389 หรือ ldaps://dc.company.local:636" },
  { key: "ldap_base_dn", value: "", description: "Base DN สำหรับค้นหา user เช่น DC=company,DC=local" },
  { key: "ldap_bind_dn", value: "", description: "Service account DN สำหรับ bind/search" },
  { key: "ldap_bind_password", value: "", description: "รหัสผ่าน service account สำหรับ LDAP bind" },
  { key: "ldap_start_tls", value: "false", description: "อัปเกรด ldap:// connection เป็น TLS ด้วย StartTLS ก่อน bind" },
  { key: "ldap_tls_reject_unauthorized", value: "true", description: "ตรวจสอบ certificate chain ของ LDAPS" },
  { key: "ldap_user_filter", value: "(&(objectClass=user)(sAMAccountName={username}))", description: "LDAP user search filter" },
  { key: "ldap_upn_domain", value: "", description: "UPN domain สำหรับ direct bind เช่น company.local" },
  { key: "ldap_domain", value: "", description: "NetBIOS domain สำหรับ direct bind เช่น COMPANY" },
  { key: "ldap_user_dn_template", value: "", description: "DN template สำหรับ direct bind เช่น CN={username},OU=Users,DC=company,DC=local" },
  { key: "ldap_auto_provision", value: "false", description: "สร้าง user ในระบบอัตโนมัติเมื่อ LDAP auth สำเร็จ" },
  { key: "ldap_default_role", value: "asset_user", description: "Role เริ่มต้นสำหรับ LDAP auto-provision" },
  { key: "ldap_sync_enabled", value: "false", description: "เปิดใช้งาน LDAP employee/user sync" },
  { key: "ldap_sync_base_dn", value: "", description: "Base DN สำหรับ sync ถ้าไม่ระบุจะใช้ ldap_base_dn" },
  { key: "ldap_sync_filter", value: "(&(objectCategory=person)(objectClass=user)(employeeID=*)(company=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))", description: "Filter สำหรับดึง user ที่ต้อง sync" },
  { key: "ldap_sync_mode", value: "preview", description: "โหมด sync: preview, manual, scheduled" },
  { key: "ldap_sync_schedule", value: "0 2 * * *", description: "Cron schedule สำหรับ sync ในอนาคต" },
  { key: "ldap_sync_default_company_code", value: "", description: "Company code เริ่มต้นสำหรับ employee ที่ sync จาก LDAP" },
  { key: "ldap_sync_default_branch_code", value: "", description: "Branch code เริ่มต้นสำหรับ employee ที่ sync จาก LDAP" },
  { key: "ldap_sync_default_department_code", value: "", description: "Department code เริ่มต้นสำหรับ employee ที่ sync จาก LDAP" },
  { key: "ldap_sync_deactivate_missing", value: "false", description: "ปิดใช้งาน employee ที่ไม่พบใน LDAP sync result" },
  {
    key: ldapSyncMaxScheduledDeactivationsKey,
    value: String(defaultLdapSyncMaxScheduledDeactivations),
    description: "จำนวน employee สูงสุดที่ scheduled LDAP sync สามารถปิดใช้งานได้ต่อรอบก่อนระบบ block เพื่อรอตรวจสอบ",
  },
  { key: "asset_label_default_tape_size", value: "18", description: "ขนาดเทปเริ่มต้นสำหรับพิมพ์ Asset Label: 12, 18, 24 หรือ custom" },
  { key: assetQrPublicBaseUrlKey, value: "", description: "Public base URL ถาวรสำหรับ QR Code ที่พิมพ์บน Label เช่น https://asset.company.com" },
  { key: "asset_label_12_width_mm", value: "60", description: "ความกว้าง label สำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_height_mm", value: "12", description: "ความสูง label สำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_qr_size", value: "34", description: "ขนาด QR Code สำหรับเทป 12mm หน่วย px" },
  { key: "asset_label_12_margin_mm", value: "1.5", description: "ระยะขอบ label สำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_gap_mm", value: "1.5", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_layout", value: "qr-left", description: "รูปแบบ label สำหรับเทป 12mm" },
  { key: "asset_label_12_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับเทป 12mm" },
  { key: "asset_label_12_secondary_template", value: "{scanHint}", description: "บรรทัดรองสำหรับเทป 12mm" },
  { key: "asset_label_12_tertiary_template", value: "", description: "บรรทัดที่สามสำหรับเทป 12mm" },
  { key: "asset_label_18_width_mm", value: "70", description: "ความกว้าง label สำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_height_mm", value: "18", description: "ความสูง label สำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_qr_size", value: "44", description: "ขนาด QR Code สำหรับเทป 18mm หน่วย px" },
  { key: "asset_label_18_margin_mm", value: "1.5", description: "ระยะขอบ label สำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_gap_mm", value: "1.5", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_layout", value: "qr-left", description: "รูปแบบ label สำหรับเทป 18mm" },
  { key: "asset_label_18_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับเทป 18mm" },
  { key: "asset_label_18_secondary_template", value: "{assetName}", description: "บรรทัดรองสำหรับเทป 18mm" },
  { key: "asset_label_18_tertiary_template", value: "{serialNumber}", description: "บรรทัดที่สามสำหรับเทป 18mm" },
  { key: "asset_label_24_width_mm", value: "80", description: "ความกว้าง label สำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_height_mm", value: "24", description: "ความสูง label สำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_qr_size", value: "58", description: "ขนาด QR Code สำหรับเทป 24mm หน่วย px" },
  { key: "asset_label_24_margin_mm", value: "2", description: "ระยะขอบ label สำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_gap_mm", value: "2", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_layout", value: "qr-left", description: "รูปแบบ label สำหรับเทป 24mm" },
  { key: "asset_label_24_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับเทป 24mm" },
  { key: "asset_label_24_secondary_template", value: "{assetName}", description: "บรรทัดรองสำหรับเทป 24mm" },
  { key: "asset_label_24_tertiary_template", value: "{location}", description: "บรรทัดที่สามสำหรับเทป 24mm" },
  { key: "asset_label_custom_width_mm", value: "60", description: "ความกว้าง label custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_height_mm", value: "40", description: "ความสูง label custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_qr_size", value: "70", description: "ขนาด QR Code สำหรับ label custom หน่วย px" },
  { key: "asset_label_custom_margin_mm", value: "2", description: "ระยะขอบ label custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_gap_mm", value: "2", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับ label custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_layout", value: "qr-left", description: "รูปแบบ label custom" },
  { key: "asset_label_custom_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับ label custom" },
  { key: "asset_label_custom_secondary_template", value: "{assetName}", description: "บรรทัดรองสำหรับ label custom" },
  { key: "asset_label_custom_tertiary_template", value: "{serialNumber}", description: "บรรทัดที่สามสำหรับ label custom" },
]

export const knownSystemSettingKeys = new Set(systemSettingDefaults.map((setting) => setting.key))
export { assetLabelSettingKeys }
export { workflowApprovalSettingKeys }
export { retentionPolicySettingKeys }
