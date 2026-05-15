
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { ShippingInfo } from "@/types";
import { resolveProductImage } from "@/lib/product-image";

const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_FEE = 7;

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } =
    useCart();
  const { user, isAuthenticated, placeOrder } = useAuth();
  const { refreshProducts } = useProducts();
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [shipping, setShipping] = useState<ShippingInfo>({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
  });

  const handleCheckout = () => {
    setShowConfirm(true);
  };

  const isShippingValid =
    shipping.firstName.trim() &&
    shipping.lastName.trim() &&
    shipping.phone.trim() &&
    shipping.address.trim();

  const shippingCost =
    totalPrice > FREE_SHIPPING_THRESHOLD || totalPrice === 0 ? 0 : SHIPPING_FEE;
  const totalWithShipping = totalPrice + shippingCost;

  const confirmOrder = async () => {
    if (!isShippingValid) return;

    const orderData = {
      userId: user?.id,
      userName: `${shipping.firstName} ${shipping.lastName}`,
      userEmail: user?.email,
      shipping,
      items: items.map(({ product, quantity }) => ({ product, quantity })),
      total: totalWithShipping,
    };

    const orderCreated = await placeOrder(orderData);
    if (!orderCreated) return;

    await refreshProducts();

    clearCart();
    setShowConfirm(false);
    setOrderPlaced(true);
    setShipping({ firstName: "", lastName: "", phone: "", address: "" });
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="mt-4 font-display text-2xl font-bold">
            Commande confirmée !
          </h2>
          <p className="mt-2 text-muted-foreground">
            Merci pour votre achat. L'administrateur a reçu votre commande.
          </p>
          <div className="mt-6 flex gap-3">
            {isAuthenticated && (
              <Link to="/dashboard">
                <Button>Voir mes commandes</Button>
              </Link>
            )}
            <Link to="/">
              <Button variant="outline">Continuer mes achats</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
          <p className="mt-4 text-lg text-muted-foreground">
            Votre panier est vide.
          </p>
          <Link to="/">
            <Button className="mt-4">Découvrir nos produits</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Continuer mes achats
        </Link>
        <h1 className="font-display text-3xl font-bold">Panier</h1>

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-4 rounded-lg border bg-card p-4"
              >
                <img
                  src={resolveProductImage(product.image)}
                  alt={product.name}
                  className="h-24 w-24 rounded-md object-cover"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link
                      to={`/product/${product.id}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {product.price.toFixed(2)} DT
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold">
                    {(product.price * quantity).toFixed(2)} DT
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-display text-xl font-bold">Résumé</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{totalPrice.toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span className={shippingCost === 0 ? "text-green-600" : ""}>
                  {shippingCost === 0
                    ? "Gratuite"
                    : `${shippingCost.toFixed(2)} DT`}
                </span>
              </div>
              {shippingCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  Livraison gratuite a partir de {FREE_SHIPPING_THRESHOLD} DT.
                </p>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{totalWithShipping.toFixed(2)} DT</span>
                </div>
              </div>
            </div>
            <Button className="mt-6 w-full" size="lg" onClick={handleCheckout}>
              Commander
            </Button>
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={clearCart}
            >
              Vider le panier
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmer votre commande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!isAuthenticated && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                Vous pouvez commander sans creer de compte. Entrez simplement votre numero de telephone et votre adresse.
              </div>
            )}
            {/* Shipping form */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Informations de livraison
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    placeholder="Prénom"
                    value={shipping.firstName}
                    onChange={(e) =>
                      setShipping((s) => ({ ...s, firstName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    placeholder="Nom"
                    value={shipping.lastName}
                    onChange={(e) =>
                      setShipping((s) => ({ ...s, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={shipping.phone}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Adresse complète *</Label>
                <Input
                  id="address"
                  placeholder="Rue, ville, code postal"
                  value={shipping.address}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, address: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Articles ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {product.name} × {quantity}
                    </span>
                    <span className="font-medium">
                      {(product.price * quantity).toFixed(2)} DT
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{totalPrice.toFixed(2)} DT</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span className={shippingCost === 0 ? "text-green-600" : ""}>
                  {shippingCost === 0
                    ? "Gratuite"
                    : `${shippingCost.toFixed(2)} DT`}
                </span>
              </div>
              <div className="mt-3 border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{totalWithShipping.toFixed(2)} DT</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Annuler
            </Button>
            <Button onClick={confirmOrder} disabled={!isShippingValid}>
              Confirmer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cart;
