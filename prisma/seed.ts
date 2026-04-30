import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { createMssqlAdapter } from "../src/lib/db-config"

const adapter = createMssqlAdapter()
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Starting seed...")

  // ============================================================
  // Asset Statuses (14 items from requirement)
  // ============================================================
  const statuses = [
    { name: "Draft", nameTh: "ร่าง", colorCode: "#94A3B8", sortOrder: 1 },
    { name: "Ready", nameTh: "พร้อมใช้งาน", colorCode: "#22C55E", sortOrder: 2 },
    { name: "In Use", nameTh: "ใช้งานอยู่", colorCode: "#3B82F6", sortOrder: 3 },
    { name: "Reserved", nameTh: "จอง", colorCode: "#8B5CF6", sortOrder: 4 },
    { name: "Checked Out", nameTh: "ถูกเบิก", colorCode: "#F59E0B", sortOrder: 5 },
    { name: "In Transit", nameTh: "อยู่ระหว่างโอนย้าย", colorCode: "#06B6D4", sortOrder: 6 },
    { name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม", colorCode: "#F97316", sortOrder: 7 },
    { name: "Pending Repair", nameTh: "รอซ่อม", colorCode: "#EF4444", sortOrder: 8 },
    { name: "Under Inspection", nameTh: "อยู่ระหว่างตรวจสอบ", colorCode: "#A855F7", sortOrder: 9 },
    { name: "Lost", nameTh: "สูญหาย", colorCode: "#DC2626", sortOrder: 10 },
    { name: "Missing", nameTh: "หาไม่พบ", colorCode: "#B91C1C", sortOrder: 11 },
    { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย", colorCode: "#78716C", sortOrder: 12 },
    { name: "Disposed", nameTh: "ตัดจำหน่ายแล้ว", colorCode: "#57534E", sortOrder: 13 },
    { name: "Retired", nameTh: "ปลดระวาง", colorCode: "#44403C", sortOrder: 14 },
  ]

  for (const s of statuses) {
    await prisma.assetStatus.upsert({
      where: { name: s.name },
      update: { nameTh: s.nameTh, colorCode: s.colorCode, sortOrder: s.sortOrder },
      create: s,
    })
  }
  console.log(`  ✅ Asset Statuses: ${statuses.length} items`)

  // ============================================================
  // Asset Conditions (8 items from requirement)
  // ============================================================
  const conditions = [
    { name: "New", nameTh: "ใหม่", colorCode: "#22C55E", sortOrder: 1 },
    { name: "Excellent", nameTh: "ดีมาก", colorCode: "#16A34A", sortOrder: 2 },
    { name: "Good", nameTh: "ดี", colorCode: "#3B82F6", sortOrder: 3 },
    { name: "Fair", nameTh: "พอใช้", colorCode: "#F59E0B", sortOrder: 4 },
    { name: "Poor", nameTh: "แย่", colorCode: "#F97316", sortOrder: 5 },
    { name: "Damaged", nameTh: "เสียหาย", colorCode: "#EF4444", sortOrder: 6 },
    { name: "Non-functional", nameTh: "ใช้งานไม่ได้", colorCode: "#DC2626", sortOrder: 7 },
    { name: "Salvage", nameTh: "ซาก", colorCode: "#78716C", sortOrder: 8 },
  ]

  for (const c of conditions) {
    await prisma.assetCondition.upsert({
      where: { name: c.name },
      update: { nameTh: c.nameTh, colorCode: c.colorCode, sortOrder: c.sortOrder },
      create: c,
    })
  }
  console.log(`  ✅ Asset Conditions: ${conditions.length} items`)

  // ============================================================
  // System Settings (Asset Tag Prefix)
  // ============================================================
  const settings = [
    { key: "asset_tag_prefix", value: "AST", description: "Prefix สำหรับรหัสทรัพย์สิน" },
    { key: "asset_tag_separator", value: "-", description: "ตัวคั่นในรหัสทรัพย์สิน" },
    { key: "asset_tag_running_digits", value: "5", description: "จำนวนหลัก Running Number" },
    { key: "company_name", value: "บริษัท ตัวอย่าง จำกัด", description: "ชื่อบริษัทหลัก" },
    { key: "default_currency", value: "THB", description: "สกุลเงินเริ่มต้น" },
  ]

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
