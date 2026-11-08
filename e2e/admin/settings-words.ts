// The words the settings page spec reads on screen (page group 12 plan 5 Task 5, board AD-Settings), as the app writes
// them in messages/th.json systemSettingsPage and common (tests/e2e-review.test.ts checks every value). Plain data, no
// imports, so a node test can load it.
// The spec never clicks บันทึก, ทดสอบ, ดูตัวอย่าง or ซิงก์: the two sync buttons' names are here only to read their
// aria-disabled state, and tests/e2e-review.test.ts pins that no click names them.
export const SETTINGS_WORDS = {
  title: "ตั้งค่าระบบ",
  // The left menu's four group headings (h2), and the two tabs the spec opens.
  groupAssetsDocuments: "ทรัพย์สินและเอกสาร", groupOrganizationWork: "องค์กรและการทำงาน", groupSignIn: "การเข้าสู่ระบบ", groupOther: "อื่น ๆ",
  tabOrganization: "องค์กร", tabLdapLogin: "AD/LDAP Login", tabLdapSync: "ซิงก์ LDAP",
  // Below lg: the jump select's label and the disclosure that holds the stacked menu.
  menuJump: "ไปที่กลุ่มการตั้งค่า", menuShowAll: "ดูทุกกลุ่มการตั้งค่า",
  // The tabs' panel headings.
  organizationDefaults: "ค่าองค์กร", ldapSettings: "ตั้งค่า AD/LDAP", ldapSyncStrategy: "แนวทางซิงก์ LDAP",
  // The two fields the spec edits (and never saves).
  companyName: "ชื่อบริษัท", ldapUrl: "LDAP URL",
  // A changed field: "แก้แล้ว", "เดิม: <saved>" (an empty saved value reads ไม่มีข้อมูล).
  fieldChanged: "แก้แล้ว", fieldWas: "เดิม: {value}", noValue: "ไม่มีข้อมูล",
  // The review table (its caption names it) and its first column.
  changeReview: "ตรวจสอบก่อนบันทึก", reviewSetting: "การตั้งค่า",
  // The sticky footer's status line, its ยกเลิกการแก้ไข and the confirm that asks first.
  footerUnsaved: "เปลี่ยน {count, number} ค่า ยังไม่บันทึก", footerNoChanges: "ยังไม่มีการเปลี่ยนแปลง",
  discardChanges: "ยกเลิกการแก้ไข", discardConfirmTitle: "ยกเลิกการแก้ไขทั้ง {count, number} ค่า?",
  // The LDAP bind password's box: stored, or not set.
  bindStored: "•••••••• บันทึกไว้แล้ว", bindNotSet: "ยังไม่ได้ตั้ง",
  // The sync tab: the two buttons (read only, never pressed) and the lock note while an LDAP value is unsaved.
  syncPreviewButton: "ดูตัวอย่างการซิงก์", syncApplyButton: "ซิงก์ทันที", syncLocked: "บันทึกค่า LDAP ก่อน",
} as const
