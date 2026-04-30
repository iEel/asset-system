import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    roles: string[]
    permissions: string[]
    employeeId?: string | null
  }

  interface Session {
    user: {
      id: string
      name: string
      email?: string | null
      roles: string[]
      permissions: string[]
      employeeId?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    roles: string[]
    permissions: string[]
    employeeId?: string | null
  }
}
