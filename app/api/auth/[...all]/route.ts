import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

const handler = toNextJsHandler(auth)

// All users can sign in - quota limits are applied based on email domain
export const GET = handler.GET
export const POST = handler.POST
