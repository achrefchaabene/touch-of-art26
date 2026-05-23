import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPlaceholderImage, resolveProductImage } from "@/lib/product-image";

const ProductCard = ({ product, highlighted = false }: { product: Product; highlighted?: boolean }) => {
  const { addItem } = useCart();

  return (
    <div
      className={`group animate-fade-in overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg ${
        highlighted ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""
      }`}
    >
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden">
          {highlighted && (
            <span className="absolute right-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow">
              Selectionne
            </span>
          )}
          {product.salePrice && product.salePrice < product.price && (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
              Promo
            </span>
          )}
          <img
            src={resolveProductImage(product.image)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              const placeholder = new URL(getPlaceholderImage(), window.location.origin).toString();
              if (t.src !== placeholder) {
                t.src = getPlaceholderImage();
              }
            }}
          />
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {product.category}
          </p>
          {product.stock === 0 ? (
            <Badge variant="destructive" className="text-xs">Rupture</Badge>
          ) : product.stock <= 5 ? (
            <Badge variant="outline" className="text-xs text-orange-500 border-orange-400">
              Plus que {product.stock}
            </Badge>
          ) : null}
        </div>
        <Link to={`/product/${product.id}`}>
          <h3 className="mt-1 font-display text-lg font-semibold text-foreground hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-col">
            {product.salePrice && product.salePrice < product.price ? (
              <>
                <span className="text-xs line-through text-muted-foreground">{product.price.toFixed(2)} DT</span>
                <span className="text-lg font-bold text-red-500">{product.salePrice.toFixed(2)} DT</span>
              </>
            ) : (
              <span className="text-lg font-bold text-foreground">{product.price.toFixed(2)} DT</span>
            )}
          </div>
          <Button size="sm" onClick={() => addItem(product)} disabled={product.stock === 0}>
            <ShoppingCart className="mr-1 h-4 w-4" />
            {product.stock === 0 ? "Indisponible" : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
