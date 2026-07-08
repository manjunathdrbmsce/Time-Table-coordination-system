import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  const { pathname } = request.nextUrl

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api/auth']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
  // Root path shows landing page for unauthenticated users
  const isRootPath = pathname === '/'

  // API routes handling
  if (pathname.startsWith('/api/')) {
    // Allow auth routes
    if (pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }
    
    // All other API routes require authentication
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Admin API routes
    if (pathname.startsWith('/api/admin') && token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // Coordinator API routes
    if (pathname.startsWith('/api/coordinator') && 
        !['ADMIN', 'COORDINATOR'].includes(token.role as string)) {
      return NextResponse.json(
        { error: 'Forbidden: Coordinator access required' },
        { status: 403 }
      )
    }

    return NextResponse.next()
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login' && token) {
    const dashboardPath = getDashboardPath(token.role as string)
    return NextResponse.redirect(new URL(dashboardPath, request.url))
  }

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Allow root path (landing page handles auth check itself)
  if (isRootPath) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based route protection
  const userRole = token.role as string

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL(getDashboardPath(userRole), request.url))
    }
  }

  // Coordinator routes
  if (pathname.startsWith('/coordinator')) {
    if (!['ADMIN', 'COORDINATOR'].includes(userRole)) {
      return NextResponse.redirect(new URL(getDashboardPath(userRole), request.url))
    }
  }

  // HOD routes
  if (pathname.startsWith('/hod')) {
    if (!['ADMIN', 'HOD'].includes(userRole)) {
      return NextResponse.redirect(new URL(getDashboardPath(userRole), request.url))
    }
  }

  return NextResponse.next()
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'COORDINATOR':
      return '/coordinator'
    case 'HOD':
      return '/hod'
    default:
      return '/login'
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
