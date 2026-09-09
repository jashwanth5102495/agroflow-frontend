import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { 
  Package, 
  Users, 
  ShoppingCart, 
  LogOut,
  Menu,
  Bell,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getCashierLinks = (shopId: string) => [
  { name: "Sales", href: `/cashier/${shopId}/sales`, icon: ShoppingCart },
  { name: "Farmers", href: `/cashier/${shopId}/farmers`, icon: Users },
  { name: "Inventory", href: `/cashier/${shopId}/inventory`, icon: Package },
];

export default function CashierLayout() {
  const { shopId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    return document.cookie.includes("googtrans=/en/kn") ? "kn" : "en";
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleLanguage = () => {
    const newLang = language === "en" ? "kn" : "en";
    setLanguage(newLang);
    
    if (newLang === "kn") {
      document.cookie = "googtrans=/en/kn; path=/";
    } else {
      document.cookie = "googtrans=/en/en; path=/";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
    }
    window.location.reload();
  };

  const shopData = localStorage.getItem("shop");
  const userData = localStorage.getItem("user");
  const currentShop = shopData ? JSON.parse(shopData) : null;
  const currentUser = userData ? JSON.parse(userData) : null;

  const displayName = currentUser?.name || "Cashier";
  const displaySubtext = currentShop?.name || "Store";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "C";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("shop");
    navigate("/auth/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`${sidebarOpen ? "w-64" : "w-20"} transition-all duration-300 ease-in-out border-r bg-card flex-col z-50 fixed md:relative h-full ${mobileMenuOpen ? "flex" : "hidden md:flex"}`}
      >
        <div className="h-16 flex items-center justify-center border-b px-4">
          {sidebarOpen ? (
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-xl font-bold text-primary leading-none">AgriFlow</h2>
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Cashier Desk</span>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-primary">AF</h2>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {getCashierLinks(shopId || '').map((link) => {
              const isActive = location.pathname === link.href || (location.pathname.startsWith(link.href) && link.href !== `/cashier/${shopId}`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                  title={!sidebarOpen ? link.name : undefined}
                >
                  <Icon className={`flex-shrink-0 ${sidebarOpen ? "mr-3" : "mx-auto"} h-5 w-5`} />
                  {sidebarOpen && <span>{link.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t space-y-2">
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className={`flex-shrink-0 ${sidebarOpen ? "mr-3" : "mx-auto"} h-5 w-5`} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="h-16 flex items-center justify-between border-b bg-card px-4 lg:px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex">
              <Menu className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-muted-foreground font-semibold px-2 border-primary/20 hover:bg-primary/5"
              onClick={toggleLanguage}
            >
              {language === "en" ? "EN/ಕನ್ನಡ" : "ಕನ್ನಡ/EN"}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:bg-primary/5 hidden sm:flex"
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {displaySubtext}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
