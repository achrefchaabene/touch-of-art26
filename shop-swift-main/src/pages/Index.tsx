import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowUpDown, Search, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/context/ProductContext";

const SkeletonCard = () => (
  <div className="animate-pulse overflow-hidden rounded-lg border bg-card">
    <div className="aspect-square bg-muted" />
    <div className="space-y-3 p-4">
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/4 rounded bg-muted" />
      <div className="flex items-center justify-between pt-1">
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
      </div>
    </div>
  </div>
);

const Index = () => {
  const { products, categories, loading } = useProducts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [sortBy, setSortBy] = useState("default");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const exactBarcodeMatch = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return null;
    return products.find((product) => (product.barcode ?? "").toLowerCase() === term) ?? null;
  }, [products, search]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (exactBarcodeMatch) {
      return [exactBarcodeMatch];
    }

    let list = products.filter((product) => {
      const matchSearch =
        term.length === 0 ||
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        (product.barcode ?? "").toLowerCase().includes(term);

      const matchCategory = activeCategory === "Tous" || product.category === activeCategory;
      return matchSearch && matchCategory;
    });

    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return list;
  }, [products, search, activeCategory, sortBy, exactBarcodeMatch]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="border-b bg-primary px-4 py-10 text-center text-primary-foreground sm:py-12 md:py-14">
        <h1 className="font-display text-3xl font-bold sm:text-4xl md:text-5xl">Touch of Art</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80 sm:text-base">
          L&apos;art qui vous ressemble
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 h-5 w-5 text-primary/50" />
            <Input
              ref={inputRef}
              placeholder="Rechercher un produit, une categorie ou un code-barres..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-12 rounded-full border-0 bg-background pl-12 pr-12 text-foreground shadow-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  inputRef.current?.focus();
                }}
                className="absolute right-4 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={activeCategory === category ? "default" : "outline"}
                onClick={() => setActiveCategory(category)}
                className="max-w-full whitespace-normal text-left"
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Chargement..."
                : `${filtered.length} produit${filtered.length !== 1 ? "s" : ""}${search ? ` pour "${search}"` : ""}`}
            </p>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-48">
                <ArrowUpDown className="mr-1 h-3 w-3" />
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Par defaut</SelectItem>
                <SelectItem value="price-asc">Prix croissant</SelectItem>
                <SelectItem value="price-desc">Prix decroissant</SelectItem>
                <SelectItem value="rating">Meilleures notes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {exactBarcodeMatch && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            Produit selectionne automatiquement par code-barres: <strong>{exactBarcodeMatch.name}</strong>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                highlighted={Boolean(exactBarcodeMatch && exactBarcodeMatch.id === product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">Aucun produit trouve</p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        )}
      </main>

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Remonter en haut"
          className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:bg-primary/90"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Index;
