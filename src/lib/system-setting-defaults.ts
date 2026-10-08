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
export const ldapSyncLastRunAtKey = "ldap_sync_last_run_at"
export const ldapSyncLastStatusKey = "ldap_sync_last_status"
export const ldapSyncLastErrorKey = "ldap_sync_last_error"
export const ldapSyncStatusSettingKeys = [
  ldapSyncLastRunAtKey,
  ldapSyncLastStatusKey,
  ldapSyncLastErrorKey,
] as const
export const notificationDigestLastRunAtKey = "notification_digest_last_run_at"
export const notificationDigestLastStatusKey = "notification_digest_last_status"
export const notificationDigestLastErrorKey = "notification_digest_last_error"
export const notificationDigestStatusSettingKeys = [
  notificationDigestLastRunAtKey,
  notificationDigestLastStatusKey,
  notificationDigestLastErrorKey,
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
  { key: "asset_tag_prefix", value: "AST", description: "คำนำหน้ารหัสทรัพย์สิน" },
  { key: "asset_tag_separator", value: "-", description: "ตัวคั่นในรหัสทรัพย์สิน" },
  { key: "asset_tag_running_digits", value: "5", description: "จำนวนหลักเลขลำดับ" },
  {
    key: assetTagFormatTemplateKey,
    value: defaultAssetTagFormatTemplate,
    description:
      "รูปแบบรหัสทรัพย์สิน เช่น {assetCompanyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}",
  },
  {
    key: assetTagCategoryPrefixesKey,
    value: "{}",
    description: "JSON mapping หมวดหมู่ไปยังคำนำหน้ารหัสทรัพย์สิน เช่น {\"categoryId\":\"COM\"}",
  },
  {
    key: checkoutDocumentTemplateKey,
    value: defaultCheckoutDocumentTemplate,
    description: "แม่แบบเลขที่ใบส่งมอบทรัพย์สิน เช่น HO-{yyyyMM}-{running}",
  },
  {
    key: checkinDocumentTemplateKey,
    value: defaultCheckinDocumentTemplate,
    description: "แม่แบบเลขที่ใบรับคืนทรัพย์สิน เช่น RT-{yyyyMM}-{running}",
  },
  {
    key: operationDocumentRunningDigitsKey,
    value: "4",
    description: "จำนวนหลักเลขลำดับสำหรับเอกสารส่งมอบ/รับคืน",
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
  { key: "notification_return_due_soon_days", value: "3", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือนรายการยืมใช้ชั่วคราวที่ใกล้ครบกำหนดรับคืน" },
  { key: "notification_audit_action_due_soon_days", value: "7", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือนแผนแก้ไขจากการตรวจนับที่ใกล้ครบกำหนด" },
  { key: "notification_warranty_expiry_days", value: "30", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือนประกันทรัพย์สินใกล้หมดอายุ" },
  { key: "notification_license_expiry_days", value: "30", description: "จำนวนวันล่วงหน้าสำหรับแจ้งเตือน Software/License ใกล้หมดอายุ" },
  { key: retentionAttachmentDaysKey, value: "1095", description: "จำนวนวันที่เก็บไฟล์แนบ/รูปหลักฐานก่อนพิจารณา archive" },
  { key: retentionAuditLogDaysKey, value: "2555", description: "จำนวนวันที่เก็บประวัติการแก้ไขก่อนพิจารณา archive ตามนโยบายองค์กร" },
  { key: retentionOrphanFileDaysKey, value: "90", description: "จำนวนวันที่เก็บไฟล์ orphan จาก storage governance ก่อนพิจารณา archive/delete" },
  { key: workflowApprovalDisposalRequiredKey, value: "true", description: "บังคับใช้ขั้นตอนอนุมัติก่อนตัดจำหน่ายทรัพย์สิน" },
  { key: workflowApprovalAuditCloseRequiredKey, value: "true", description: "บังคับใช้ผู้อนุมัติแยกจากผู้สร้างรอบ ก่อนปิดรอบตรวจนับ" },
  { key: workflowApprovalMinApproversKey, value: "1", description: "จำนวนผู้อนุมัติขั้นต่ำสำหรับขั้นตอนงานที่ต้องอนุมัติ" },
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
  { key: "ldap_user_dn_template", value: "", description: "แม่แบบ DN สำหรับ direct bind เช่น CN={username},OU=Users,DC=company,DC=local" },
  { key: "ldap_auto_provision", value: "false", description: "สร้าง user ในระบบอัตโนมัติเมื่อ LDAP auth สำเร็จ" },
  { key: "ldap_default_role", value: "asset_user", description: "บทบาทเริ่มต้นสำหรับ LDAP auto-provision" },
  { key: "ldap_sync_enabled", value: "false", description: "เปิดใช้งานการซิงก์ employee/user จาก LDAP" },
  { key: "ldap_sync_base_dn", value: "", description: "Base DN สำหรับซิงก์ ถ้าไม่ระบุจะใช้ ldap_base_dn" },
  { key: "ldap_sync_filter", value: "(&(objectCategory=person)(objectClass=user)(employeeID=*)(company=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))", description: "ตัวกรองสำหรับดึง user ที่ต้องซิงก์" },
  { key: "ldap_sync_mode", value: "preview", description: "โหมดซิงก์: preview, manual, scheduled" },
  { key: "ldap_sync_schedule", value: "0 2 * * *", description: "Cron schedule เวลาไทย (Asia/Bangkok) สำหรับซิงก์ LDAP" },
  { key: "ldap_sync_default_company_code", value: "", description: "Company code เริ่มต้นสำหรับ employee ที่ซิงก์จาก LDAP" },
  { key: "ldap_sync_default_branch_code", value: "", description: "Branch code เริ่มต้นสำหรับ employee ที่ซิงก์จาก LDAP" },
  { key: "ldap_sync_default_department_code", value: "", description: "Department code เริ่มต้นสำหรับ employee ที่ซิงก์จาก LDAP" },
  { key: "ldap_sync_deactivate_missing", value: "false", description: "ปิดใช้งาน employee ที่ไม่พบในผลซิงก์ LDAP" },
  {
    key: ldapSyncMaxScheduledDeactivationsKey,
    value: String(defaultLdapSyncMaxScheduledDeactivations),
    description: "จำนวน employee สูงสุดที่การซิงก์ LDAP ตามรอบเวลาสามารถปิดใช้งานได้ต่อรอบก่อนระบบ block เพื่อรอตรวจสอบ",
  },
  { key: "asset_label_default_tape_size", value: "18", description: "ขนาดเทปเริ่มต้นสำหรับพิมพ์ป้ายทรัพย์สิน: 12, 18, 24 หรือ custom" },
  { key: "asset_label_compact_asset_name_enabled", value: "true", description: "ย่อชื่อทรัพย์สินเฉพาะตอนพิมพ์ป้าย โดยตัดชื่อหมวดหมู่ที่ซ้ำจากชื่อแนะนำ" },
  { key: assetQrPublicBaseUrlKey, value: "", description: "Public base URL ถาวรสำหรับ QR Code ที่พิมพ์บนป้าย เช่น https://asset.company.com" },
  { key: "asset_label_12_width_mm", value: "60", description: "ความกว้างป้ายสำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_height_mm", value: "12", description: "ความสูงป้ายสำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_qr_size", value: "34", description: "ขนาด QR Code สำหรับเทป 12mm หน่วย px" },
  { key: "asset_label_12_margin_mm", value: "1.5", description: "ระยะขอบป้ายสำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_gap_mm", value: "1.5", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับเทป 12mm หน่วยมิลลิเมตร" },
  { key: "asset_label_12_layout", value: "qr-left", description: "รูปแบบป้ายสำหรับเทป 12mm" },
  { key: "asset_label_12_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับเทป 12mm" },
  { key: "asset_label_12_secondary_template", value: "{scanHint}", description: "บรรทัดรองสำหรับเทป 12mm" },
  { key: "asset_label_12_tertiary_template", value: "", description: "บรรทัดที่สามสำหรับเทป 12mm" },
  { key: "asset_label_18_width_mm", value: "70", description: "ความกว้างป้ายสำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_height_mm", value: "18", description: "ความสูงป้ายสำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_qr_size", value: "44", description: "ขนาด QR Code สำหรับเทป 18mm หน่วย px" },
  { key: "asset_label_18_margin_mm", value: "1.5", description: "ระยะขอบป้ายสำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_gap_mm", value: "1.5", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับเทป 18mm หน่วยมิลลิเมตร" },
  { key: "asset_label_18_layout", value: "qr-left", description: "รูปแบบป้ายสำหรับเทป 18mm" },
  { key: "asset_label_18_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับเทป 18mm" },
  { key: "asset_label_18_secondary_template", value: "{labelAssetName}", description: "บรรทัดรองสำหรับเทป 18mm" },
  { key: "asset_label_18_tertiary_template", value: "{serialNumber}", description: "บรรทัดที่สามสำหรับเทป 18mm" },
  { key: "asset_label_24_width_mm", value: "80", description: "ความกว้างป้ายสำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_height_mm", value: "24", description: "ความสูงป้ายสำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_qr_size", value: "58", description: "ขนาด QR Code สำหรับเทป 24mm หน่วย px" },
  { key: "asset_label_24_margin_mm", value: "2", description: "ระยะขอบป้ายสำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_gap_mm", value: "2", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับเทป 24mm หน่วยมิลลิเมตร" },
  { key: "asset_label_24_layout", value: "qr-left", description: "รูปแบบป้ายสำหรับเทป 24mm" },
  { key: "asset_label_24_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับเทป 24mm" },
  { key: "asset_label_24_secondary_template", value: "{assetName}", description: "บรรทัดรองสำหรับเทป 24mm" },
  { key: "asset_label_24_tertiary_template", value: "{location}", description: "บรรทัดที่สามสำหรับเทป 24mm" },
  { key: "asset_label_custom_width_mm", value: "60", description: "ความกว้างป้ายขนาด custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_height_mm", value: "40", description: "ความสูงป้ายขนาด custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_qr_size", value: "70", description: "ขนาด QR Code สำหรับป้ายขนาด custom หน่วย px" },
  { key: "asset_label_custom_margin_mm", value: "2", description: "ระยะขอบป้ายขนาด custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_gap_mm", value: "2", description: "ช่องว่างระหว่าง QR กับข้อความสำหรับป้ายขนาด custom หน่วยมิลลิเมตร" },
  { key: "asset_label_custom_layout", value: "qr-left", description: "รูปแบบป้ายขนาด custom" },
  { key: "asset_label_custom_primary_template", value: "{assetTag}", description: "บรรทัดหลักสำหรับป้ายขนาด custom" },
  { key: "asset_label_custom_secondary_template", value: "{assetName}", description: "บรรทัดรองสำหรับป้ายขนาด custom" },
  { key: "asset_label_custom_tertiary_template", value: "{serialNumber}", description: "บรรทัดที่สามสำหรับป้ายขนาด custom" },
]

export const knownSystemSettingKeys = new Set(systemSettingDefaults.map((setting) => setting.key))
export { assetLabelSettingKeys }
export { workflowApprovalSettingKeys }
export { retentionPolicySettingKeys }
