import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { createMssqlAdapter } from "../src/lib/db-config"
import { systemSettingDefaults } from "../src/lib/system-setting-defaults"

const adapter = createMssqlAdapter()
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Starting seed...")

  // ============================================================
  // Asset Statuses (14 items from requirement)
  // ============================================================
  const statuses = [
    { name: "Draft", nameTh: "ร่าง", description: "บันทึกข้อมูลเบื้องต้นและยังไม่พร้อมนำไปใช้งาน", colorCode: "#94A3B8", sortOrder: 1 },
    { name: "Ready", nameTh: "พร้อมใช้งาน", description: "พร้อมสำหรับมอบหมาย เบิกใช้ หรือเริ่มกระบวนการอื่น", colorCode: "#22C55E", sortOrder: 2 },
    { name: "In Use", nameTh: "ใช้งานอยู่", description: "ทรัพย์สินระยะยาวที่มีผู้ครอบครองและกำลังใช้งาน", colorCode: "#3B82F6", sortOrder: 3 },
    { name: "Reserved", nameTh: "จอง", description: "กันทรัพย์สินไว้สำหรับรายการหรือผู้ใช้งานที่กำหนด", colorCode: "#8B5CF6", sortOrder: 4 },
    { name: "Checked Out", nameTh: "ถูกเบิก", description: "ถูกเบิกใช้งานชั่วคราวและมีรายการเบิกที่ยังเปิดอยู่", colorCode: "#F59E0B", sortOrder: 5 },
    { name: "In Transit", nameTh: "อยู่ระหว่างโอนย้าย", description: "อยู่ระหว่างการขนส่งหรือโอนย้ายที่ยังไม่เสร็จสิ้น", colorCode: "#06B6D4", sortOrder: 6 },
    { name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม", description: "มีงานซ่อมที่เริ่มดำเนินการแล้ว", colorCode: "#F97316", sortOrder: 7 },
    { name: "Pending Repair", nameTh: "รอซ่อม", description: "มีรายการซ่อมที่เปิดและกำลังรอเริ่มดำเนินการ", colorCode: "#EF4444", sortOrder: 8 },
    { name: "Under Inspection", nameTh: "อยู่ระหว่างตรวจสอบ", description: "กำลังตรวจสอบตำแหน่ง ผู้ถือครอง สภาพ หรือข้อมูล ก่อนสรุปขั้นตอนงานถัดไป", colorCode: "#A855F7", sortOrder: 9 },
    { name: "Lost", nameTh: "สูญหาย", description: "ยืนยันแล้วว่าทรัพย์สินสูญหาย", colorCode: "#DC2626", sortOrder: 10 },
    { name: "Missing", nameTh: "หาไม่พบ", description: "ยังไม่พบทรัพย์สินและอยู่ระหว่างติดตาม", colorCode: "#B91C1C", sortOrder: 11 },
    { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย", description: "มีคำขอตัดจำหน่ายที่ยังไม่เสร็จสิ้น", colorCode: "#78716C", sortOrder: 12 },
    { name: "Disposed", nameTh: "ตัดจำหน่ายแล้ว", description: "ตัดจำหน่ายออกจากการใช้งานแล้ว", colorCode: "#57534E", sortOrder: 13 },
    { name: "Retired", nameTh: "ปลดระวาง", description: "ยุติการใช้งานและเก็บเป็นประวัติ", colorCode: "#44403C", sortOrder: 14 },
  ]

  for (const s of statuses) {
    await prisma.assetStatus.upsert({
      where: { name: s.name },
      update: { nameTh: s.nameTh, description: s.description, colorCode: s.colorCode, sortOrder: s.sortOrder },
      create: s,
    })
  }
  console.log(`  ✅ Asset Statuses: ${statuses.length} items`)

  // ============================================================
  // Asset Conditions (9 items; Excellent/Poor retained for historical readability)
  // ============================================================
  const conditions = [
    { name: "Not Assessed", nameTh: "ยังไม่ประเมิน", description: "ยังไม่ได้ตรวจยืนยันสภาพจริงของทรัพย์สิน", colorCode: "#64748B", sortOrder: 1 },
    { name: "New", nameTh: "ใหม่", description: "ทรัพย์สินใหม่หรือยังไม่ผ่านการใช้งาน", colorCode: "#22C55E", sortOrder: 2 },
    { name: "Excellent", nameTh: "ดีมาก", description: "ค่าเดิมสำหรับอ่านประวัติ ไม่ใช้กับรายการใหม่", colorCode: "#16A34A", sortOrder: 3 },
    { name: "Good", nameTh: "ดี", description: "ใช้งานได้ตามปกติและไม่พบความเสียหายสำคัญ", colorCode: "#3B82F6", sortOrder: 4 },
    { name: "Fair", nameTh: "พอใช้", description: "ยังใช้งานได้แต่มีการสึกหรอหรือข้อสังเกต", colorCode: "#F59E0B", sortOrder: 5 },
    { name: "Poor", nameTh: "แย่", description: "ค่าเดิมสำหรับอ่านประวัติ ไม่ใช้กับรายการใหม่", colorCode: "#F97316", sortOrder: 6 },
    { name: "Damaged", nameTh: "เสียหาย", description: "พบความเสียหายและควรประเมินการซ่อม", colorCode: "#EF4444", sortOrder: 7 },
    { name: "Non-functional", nameTh: "ใช้งานไม่ได้", description: "ไม่สามารถใช้งานตามหน้าที่หลักได้", colorCode: "#DC2626", sortOrder: 8 },
    { name: "Salvage", nameTh: "ซาก", description: "ไม่เหมาะกับการใช้งานและรอพิจารณาตัดจำหน่าย", colorCode: "#78716C", sortOrder: 9 },
  ]

  for (const c of conditions) {
    await prisma.assetCondition.upsert({
      where: { name: c.name },
      update: { nameTh: c.nameTh, description: c.description, colorCode: c.colorCode, sortOrder: c.sortOrder },
      create: c,
    })
  }
  console.log(`  ✅ Asset Conditions: ${conditions.length} items`)

  // ============================================================
  // System Settings (Asset Tag Prefix)
  // ============================================================
  const settings = systemSettingDefaults

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log(`  ✅ System Settings: ${settings.length} items`)

  // ============================================================
  // Roles
  // ============================================================
  const roles = [
    { name: "system_admin", displayName: "System Administrator", displayNameTh: "ผู้ดูแลระบบ", isSystem: true },
    { name: "asset_admin", displayName: "Asset Administrator", displayNameTh: "ผู้ดูแลทรัพย์สิน", isSystem: true },
    { name: "it_staff", displayName: "IT Staff", displayNameTh: "เจ้าหน้าที่ IT", isSystem: false },
    { name: "admin_staff", displayName: "Admin Staff", displayNameTh: "เจ้าหน้าที่ธุรการ", isSystem: false },
    { name: "branch_staff", displayName: "Branch Staff", displayNameTh: "เจ้าหน้าที่สาขา", isSystem: false },
    { name: "department_manager", displayName: "Department Manager", displayNameTh: "หัวหน้าแผนก", isSystem: false },
    { name: "auditor", displayName: "Auditor", displayNameTh: "ผู้ตรวจนับ", isSystem: false },
    { name: "audit_reviewer", displayName: "Audit Reviewer", displayNameTh: "ผู้ตรวจสอบผลตรวจนับ", isSystem: false },
    { name: "accounting", displayName: "Accounting", displayNameTh: "ฝ่ายบัญชี", isSystem: false },
    { name: "employee", displayName: "Employee", displayNameTh: "พนักงาน", isSystem: false },
    { name: "viewer", displayName: "Viewer", displayNameTh: "ผู้ดูอย่างเดียว", isSystem: false },
  ]

  const createdRoles: Record<string, string> = {}
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { displayName: r.displayName, displayNameTh: r.displayNameTh },
      create: r,
    })
    createdRoles[r.name] = role.id
  }
  console.log(`  ✅ Roles: ${roles.length} items`)

  // ============================================================
  // Permissions
  // ============================================================
  const modules = [
    "dashboard", "asset", "checkout", "checkin", "transfer",
    "audit", "maintenance", "disposal", "report",
    "company", "branch", "department", "employee", "location",
    "category", "brand", "supplier", "status", "condition",
    "user", "role", "setting", "import", "export", "log",
  ]
  const actions = ["view", "create", "edit", "delete", "export", "approve"]

  let permCount = 0
  const permIds: Record<string, string> = {}
  for (const moduleName of modules) {
    for (const action of actions) {
      const perm = await prisma.permission.upsert({
        where: { module_action: { module: moduleName, action } },
        update: {},
        create: { module: moduleName, action, description: `${action} ${moduleName}` },
      })
      permIds[`${moduleName}:${action}`] = perm.id
      permCount++
    }
  }
  console.log(`  ✅ Permissions: ${permCount} items`)

  // ============================================================
  // System Admin gets ALL permissions
  // ============================================================
  const adminRoleId = createdRoles["system_admin"]
  for (const permId of Object.values(permIds)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRoleId, permissionId: permId } },
      update: {},
      create: { roleId: adminRoleId, permissionId: permId },
    })
  }
  console.log(`  ✅ System Admin permissions: all assigned`)

  // ============================================================
  // Default Admin User (admin / admin123)
  // ============================================================
  const passwordHash = await bcrypt.hash("admin123", 12)
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      displayName: "System Administrator",
      email: "admin@company.com",
      isActive: true,
    },
  })

  // Assign system_admin role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRoleId } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRoleId },
  })
  console.log(`  ✅ Admin user: admin / admin123`)

  console.log("\n🎉 Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
