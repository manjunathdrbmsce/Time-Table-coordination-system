# Department Timetable Coordination System

## Project Overview
A Next.js 15 (App Router) + TypeScript + PostgreSQL full-stack application for centralized timetable management with role-based access control.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **State Management**: TanStack Query (React Query)
- **Excel Parsing**: SheetJS (xlsx)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## User Roles
- **Admin**: Upload timetables, manage departments/users, system settings
- **Coordinator**: Edit own department timetables, request/approve slots
- **HOD**: Read-only access to department data and statistics

## Project Structure
```
/app
├── (auth)/           - Login pages
├── (dashboard)/      - Protected dashboard routes
│   ├── admin/        - Admin pages
│   ├── coordinator/  - Coordinator pages
│   └── hod/          - HOD pages
├── api/              - API routes
/components           - Reusable UI components
/lib                  - Utilities and configurations
/prisma               - Database schema
```

## Development Guidelines
- Use server components by default, client components only when needed
- Follow the App Router conventions for routing
- Use Prisma for all database operations
- Implement role-based middleware for route protection
- Use TanStack Query for client-side data fetching
- Follow shadcn/ui patterns for consistent UI

## Color Coding System
- 🟢 Green: Class allocation (theory)
- 🔵 Blue: Lab allocation
- ⬜ White/Gray: Free slot
- 🟡 Yellow: Modified slot
- 🟠 Orange: Pending approval
- 🔴 Red: Conflict/Gap

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npx prisma studio` - Open Prisma Studio
- `npx prisma db push` - Push schema to database
