# Department Timetable Coordination System

A comprehensive, full-stack web application for centralized timetable management with role-based access control. Built with Next.js 15, TypeScript, PostgreSQL, and Prisma.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-6.1-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

### 🔐 Role-Based Access Control
- **Admin**: Full system access, upload timetables, manage departments/users
- **Coordinator**: Edit own department timetables, request/approve cross-department slots
- **HOD (Head of Department)**: Read-only access to department data and statistics

### 📊 Timetable Management
- Interactive timetable grid with color-coded slots
- Excel file upload and parsing for bulk imports
- Real-time conflict detection
- Visual indicators for class types (theory/lab)

### 🔄 Cross-Department Slot Requests
- Request slots in other department's rooms
- Approval workflow with comments
- Audit trail for all actions

### 📈 Statistics & Analytics
- Room utilization tracking
- Section completion progress
- Department-wide insights

## 🎨 Color Coding System

| Color | Meaning |
|-------|---------|
| 🟢 Green | Theory class |
| 🔵 Blue | Lab session |
| ⬜ White/Gray | Free slot |
| 🟡 Yellow | Modified (pending) |
| 🟠 Orange | Pending approval |
| 🔴 Red | Conflict/Gap |

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17 or later
- PostgreSQL 14 or later
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd timetable-coordination-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/timetable_db"
   AUTH_SECRET="your-secret-key"
   AUTH_URL="http://localhost:3000"
   ```

4. **Generate Prisma client and push schema**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Test Accounts

After seeding the database, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@university.edu | password123 |
| CS Coordinator | cs.coordinator@university.edu | password123 |
| ECE Coordinator | ece.coordinator@university.edu | password123 |
| CS HOD | cs.hod@university.edu | password123 |

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **TanStack Query** - Server state management
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Relational database
- **NextAuth.js v5** - Authentication
- **Zod** - Schema validation

### Additional Libraries
- **SheetJS (xlsx)** - Excel file parsing
- **React Hot Toast** - Notifications
- **bcryptjs** - Password hashing

## 📁 Project Structure

```
├── app/
│   ├── (auth)/           # Authentication pages
│   │   └── login/
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── admin/        # Admin pages
│   │   ├── coordinator/  # Coordinator pages
│   │   └── hod/          # HOD pages
│   └── api/              # API routes
├── components/
│   ├── dashboard/        # Dashboard-specific components
│   ├── layout/           # Layout components (sidebar, header)
│   ├── providers/        # Context providers
│   ├── timetable/        # Timetable-specific components
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   ├── types.ts          # TypeScript types
│   ├── utils.ts          # Utility functions
│   └── validations.ts    # Zod schemas
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeding
└── middleware.ts         # Route protection
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed the database |

## 🔒 Security Features

- **Password hashing** with bcryptjs
- **JWT-based sessions** with NextAuth.js
- **Role-based middleware** protection
- **Input validation** with Zod schemas
- **CSRF protection** built-in with NextAuth

## 📝 API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints
- `POST /api/auth/register` - User registration

### Admin
- `GET/POST /api/admin/departments` - Department management
- `GET/POST /api/admin/users` - User management
- `POST /api/admin/upload` - Timetable upload

### Coordinator
- `GET /api/coordinator/sections` - Get coordinator's sections
- `GET /api/coordinator/sections/[id]` - Get section details
- `POST /api/coordinator/sections/[id]/allocations` - Create allocation
- `DELETE /api/coordinator/allocations/[id]` - Delete allocation
- `GET/POST /api/coordinator/slot-requests` - Slot requests
- `GET /api/coordinator/approvals/incoming` - Incoming requests
- `POST /api/coordinator/approvals/[id]` - Process approval

### General
- `GET /api/rooms/[id]` - Get room details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Next.js](https://nextjs.org/) team for the amazing framework
- [Prisma](https://prisma.io/) for the excellent ORM
