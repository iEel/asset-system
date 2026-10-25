import "next-auth"
import type { SessionClock } from "@/lib/session-deadline"

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
    /** The idle and ceiling deadlines (src/lib/session-deadline.ts); absent for a token without the claims. */
    clock?: SessionClock
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

// next-auth/jwt only re-exports @auth/core/jwt, so the callbacks' token type is merged here.
declare module "@auth/core/jwt" {
  interface JWT {
    /** Epoch seconds of the sign-in; never moves. */
    loginAt?: number
    /** Epoch seconds of the last keep-alive (or the sign-in); moves only on an update. */
    activeAt?: number
  }
}
