import { Link } from "react-router-dom";
import { ShoppingCart, User, ShieldCheck, ClipboardList, Tags, BarChart2, Sun, Moon, Languages } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

import logo from "@/assets/photo_2026-04-11_20-13-59 (2).jpg";

const Navbar = () => {
  const { totalItems } = useCart();
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const toggleLang = () => {
    const next = isAr ? "fr" : "ar";
    i18n.changeLanguage(next);
    document.documentElement.setAttribute("dir", next === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", next);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-3 md:h-16 md:flex-row md:items-center md:justify-between md:py-0">
        <Link to="/" className="flex min-w-0 items-center gap-3 text-primary">
          <img
            src={logo}
            alt="Touch of Art"
            className="h-10 w-10 shrink-0 rounded-full object-cover md:h-11 md:w-11"
          />

          <div className="min-w-0 leading-none">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Boutique
            </p>
            <p className="truncate font-display text-lg font-bold sm:text-xl md:text-2xl">
              Touch of Art
            </p>
          </div>
        </Link>

        <nav className="flex w-full flex-wrap items-center justify-between gap-2 sm:justify-end md:w-auto">
          <Link to="/">
            <Button variant="ghost" size="sm" className="px-3 text-xs sm:text-sm">
              Boutique
            </Button>
          </Link>

          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent p-0 text-xs text-accent-foreground">
                  {totalItems}
                </Badge>
              )}
            </Button>
          </Link>

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className="gap-1 px-3 text-xs font-semibold"
          >
            <Languages className="h-4 w-4" />
            {isAr ? "FR" : "AR"}
          </Button>

          {isAuthenticated ? (
            <>
              {user?.role === "admin" && (
                <>
                  <Link to="/admin">
                    <Button variant="ghost" size="icon">
                      <ShieldCheck className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/admin/orders">
                    <Button variant="ghost" size="icon">
                      <ClipboardList className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/admin/categories">
                    <Button variant="ghost" size="icon">
                      <Tags className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/admin/stats">
                    <Button variant="ghost" size="icon">
                      <BarChart2 className="h-5 w-5" />
                    </Button>
                  </Link>
                </>
              )}

              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>

              <Button variant="outline" size="sm" className="px-3 text-xs sm:text-sm" onClick={logout}>
                Deconnexion
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm" className="px-3 text-xs sm:text-sm">
                Connexion
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
