"use client";

// Imports
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Hammer,
  ChartColumnBig,
  Vote,
  Settings,
  Menu,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Menu items configuration
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Hammer, label: "Organize", href: "/organize" },
  { icon: Vote, label: "Vote", href: "/vote" },
  { icon: ChartColumnBig, label: "Results", href: "/results" },
];

// Interface for SidebarContent props
interface SidebarContentProps {
  pathname: string;
  setIsOpen?: (open: boolean) => void;
}

// Sidebar content component
const SidebarContent = ({ pathname, setIsOpen }: SidebarContentProps) => (
  <div className="flex flex-col h-full py-4">
    <div className="flex items-center gap-3 px-2 mb-8">
      <div className="size-8 bg-primary rounded flex items-center justify-center font-bold text-primary-foreground select-none">
        N
      </div>
      <span className="font-bold text-xl tracking-tight text-foreground select-none">
        Chain My Vote
      </span>
    </div>

    <nav className="flex-1 space-y-1">
      {menuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setIsOpen?.(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors select-none",
            pathname === item.href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}
          prefetch={false}
        >
          <item.icon size={18} />
          <span className="text-sm font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>

    <div className="mt-auto">
      <Separator className="mb-4" />
      <Link
        href="/settings"
        onClick={() => setIsOpen?.(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors select-none",
          pathname === "/settings"
            ? "text-foreground bg-accent/30"
            : "text-muted-foreground hover:text-foreground"
        )}
        prefetch={false}
      >
        <Settings size={18} />
        <span className="text-sm font-medium">Settings</span>
      </Link>
    </div>
  </div>
);

// Main Sidebar component
export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="size-9 bg-card/80 backdrop-blur-sm border-border" aria-label="Menu">
              <Menu size={18} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4 pt-2 bg-card">
            <SheetHeader className="invisible h-0">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContent pathname={pathname} setIsOpen={setIsOpen} />
          </SheetContent>
        </Sheet>
      </div>
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col p-4 h-screen sticky top-0">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}