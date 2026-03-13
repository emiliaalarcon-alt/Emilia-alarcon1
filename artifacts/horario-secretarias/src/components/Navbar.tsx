import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, Home, Grid3x3, Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/horarios", label: "Horarios", icon: Grid3x3 },
];

export default function Navbar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md group-hover:shadow-primary/20 transition-all duration-300 group-hover:scale-105">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-foreground hidden sm:block">
                Horario Temuco
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active = location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border/50 px-4 py-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
        <div className="flex items-center justify-around p-2 pb-safe">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${active ? "bg-primary/10" : ""}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
