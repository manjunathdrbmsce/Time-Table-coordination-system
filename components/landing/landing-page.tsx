"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  GraduationCap,
  DoorOpen,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Building2,
  Clock,
  BarChart3,
  Download,
  ArrowLeftRight,
  Bell,
  Zap,
  Globe,
  Lock,
  Layers,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Smart Timetable Management",
    description: "View and manage timetables with an intuitive weekly grid interface. Color-coded slots for easy understanding.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: GraduationCap,
    title: "Section-wise Organization",
    description: "Organize classes by year, division, and semester. Track theory and lab hours allocation progress.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: DoorOpen,
    title: "Room Utilization Tracking",
    description: "Monitor room usage with real-time utilization percentages. Find free slots instantly.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: Users,
    title: "Faculty Workload Management",
    description: "Track faculty assignments across sections. Prevent scheduling conflicts automatically.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: ArrowLeftRight,
    title: "Slot Exchange System",
    description: "Exchange slots between sections with a single click. Resolve conflicts effortlessly.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Bell,
    title: "Request & Approval Workflow",
    description: "Request rooms from other departments. Approve or reject with transparent tracking.",
    color: "from-red-500 to-pink-500",
  },
  {
    icon: Download,
    title: "Excel Export",
    description: "Export timetables to professional Excel sheets with breaks, ready for printing.",
    color: "from-teal-500 to-cyan-500",
  },
  {
    icon: BarChart3,
    title: "Analytics & Statistics",
    description: "Comprehensive dashboards with utilization stats, allocation progress, and insights.",
    color: "from-indigo-500 to-blue-500",
  },
];

const roles = [
  {
    title: "Admin",
    description: "Full system control with user management, department setup, and global timetable oversight.",
    icon: Shield,
    color: "bg-red-500",
    features: ["Manage all departments", "Upload timetables", "User management", "System settings", "Backup & restore"],
  },
  {
    title: "Coordinator",
    description: "Department-level timetable management with slot editing and cross-department coordination.",
    icon: Users,
    color: "bg-blue-500",
    features: ["Edit timetables", "Manage faculty", "Exchange slots", "Request rooms", "Export reports"],
  },
  {
    title: "HOD",
    description: "Read-only access to department data with comprehensive analytics and statistics.",
    icon: GraduationCap,
    color: "bg-green-500",
    features: ["View timetables", "Analytics dashboard", "Statistics reports", "Room utilization", "Department overview"],
  },
];

const stats = [
  { value: "40+", label: "Slots/Week", icon: Clock },
  { value: "100%", label: "Digital", icon: Globe },
  { value: "Real-time", label: "Updates", icon: Zap },
  { value: "Secure", label: "Access", icon: Lock },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  BMSCE
                </span>
                <span className="text-[10px] text-muted-foreground font-medium -mt-1">Centralized Timetable</span>
              </div>
            </div>

            {/* Login Button */}
            <Link href="/login">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/25">
                Login
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000" />
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-100 mb-6">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Streamlined Academic Scheduling</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                BMSCE Centralized
              </span>
              <br />
              <span className="text-slate-900">Timetable System</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              A comprehensive timetable coordination platform for efficient academic scheduling, 
              room management, and seamless inter-department collaboration.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-purple-500/25 text-lg px-8">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Explore Features
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="p-4 rounded-2xl bg-white shadow-lg shadow-slate-200/50 border">
                  <stat.icon className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need for
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Perfect Scheduling</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed to simplify timetable management and enhance coordination across departments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg shadow-slate-200/50 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">Role-Based Access</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Tailored Access for
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Every Role</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three distinct user roles with carefully designed permissions for secure and efficient operations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((role, index) => (
              <Card key={index} className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 shadow-xl">
                <div className={`absolute top-0 left-0 right-0 h-1 ${role.color}`} />
                <CardHeader className="text-center pb-2">
                  <div className={`w-16 h-16 rounded-2xl ${role.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <role.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {role.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple Steps to
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Get Started</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Login", desc: "Access with your credentials", icon: Lock },
              { step: "2", title: "Navigate", desc: "Choose your department section", icon: Layers },
              { step: "3", title: "Manage", desc: "View, edit, and coordinate", icon: CalendarDays },
              { step: "4", title: "Export", desc: "Download and share reports", icon: Download },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto shadow-xl shadow-purple-500/30">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-slate-900 font-bold text-sm flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-0 shadow-2xl shadow-purple-500/25 overflow-hidden">
            <CardContent className="p-12 text-center text-white">
              <Building2 className="w-12 h-12 mx-auto mb-6 opacity-90" />
              <h2 className="text-3xl font-bold mb-4">Ready to Streamline Your Scheduling?</h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Join the digital transformation of academic timetable management at BMSCE.
              </p>
              <Link href="/login">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90 shadow-xl text-lg px-8">
                  Login Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  BMSCE
                </span>
                <span className="text-[10px] text-muted-foreground font-medium -mt-1">Centralized Timetable</span>
              </div>
            </div>

            {/* Credits */}
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} BMSCE Centralized Timetable System
              </p>
              <p className="text-sm font-medium mt-1">
                <span className="text-muted-foreground">Developed by </span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                  Manjunath D R
                </span>
                <span className="text-muted-foreground">, BMSCE</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
