import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingCart, Star, Package, Send, Pencil, Trash2, X } from "lucide-react";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Review } from "@/types";
import { getPlaceholderImage, resolveProductImage } from "@/lib/product-image";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9000";

const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onChange?.(s)}
        className={onChange ? "cursor-pointer" : "cursor-default"}
        aria-label={`${s} étoile${s > 1 ? "s" : ""}`}
      >
        <Star className={`h-5 w-5 ${s <= value ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
      </button>
    ))}
  </div>
);

const ProductDetail = () => {
  const { id } = useParams();
  const { addItem } = useCart();
  const { products, loading, refreshProducts } = useProducts();
  const { user, isAuthenticated } = useAuth();
  const product = products.find((p) => p.id === id);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");

  // Avis de l'utilisateur connecté
  const myReview = reviews.find((r) => r.userId === user?.id);

  // Note moyenne calculée localement pour mise à jour immédiate
  const liveRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : product?.rating ?? 0;

  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);
    fetch(`${API_URL}/api/reviews/${id}`)
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [id]);

  // ── Publier un avis ────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/reviews/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, userName: user.name, rating: newRating, comment: newComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.message || "Impossible d'envoyer l'avis", variant: "destructive" });
        return;
      }
      setReviews((prev) => [data, ...prev]);
      setNewComment("");
      setNewRating(5);
      refreshProducts(); // mise à jour de la note sur les cartes produits
      toast({ title: "Merci !", description: "Votre avis a été publié." });
    } catch {
      toast({ title: "Erreur", description: "Serveur inaccessible", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Modifier un avis ───────────────────────────────────────────────────────
  const handleStartEdit = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/reviews/review/${editingReview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, comment: editComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.message || "Modification impossible", variant: "destructive" });
        return;
      }
      setReviews((prev) => prev.map((r) => r.id === editingReview.id ? data : r));
      setEditingReview(null);
      refreshProducts();
      toast({ title: "Avis modifié", description: "Votre avis a été mis à jour." });
    } catch {
      toast({ title: "Erreur", description: "Serveur inaccessible", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Supprimer un avis ──────────────────────────────────────────────────────
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Supprimer cet avis ?")) return;
    try {
      const res = await fetch(`${API_URL}/api/reviews/review/${reviewId}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "Erreur", description: "Suppression impossible", variant: "destructive" });
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      refreshProducts();
      toast({ title: "Avis supprimé", variant: "destructive" });
    } catch {
      toast({ title: "Erreur", description: "Serveur inaccessible", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-lg text-muted-foreground">Produit introuvable.</p>
          <Link to="/">
            <Button variant="outline" className="mt-4">Retour à la boutique</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="grid gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg border">
            <img
              src={resolveProductImage(product.image)}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const t = e.currentTarget;
                const placeholder = new URL(getPlaceholderImage(), window.location.origin).toString();
                if (t.src !== placeholder) t.src = getPlaceholderImage();
              }}
            />
          </div>

          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="w-fit">{product.category}</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold">{product.name}</h1>

            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="text-sm font-medium">{liveRating}</span>
                {reviews.length > 0 && (
                  <span className="text-xs text-muted-foreground">({reviews.length} avis)</span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">•</span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                {product.stock > 0 ? `${product.stock} en stock` : "Rupture de stock"}
              </div>
            </div>

            <p className="mt-4 leading-relaxed text-muted-foreground">{product.description}</p>

            {product.salePrice && product.salePrice < product.price ? (
              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold text-red-500">{product.salePrice.toFixed(2)} DT</span>
                <span className="text-lg line-through text-muted-foreground">{product.price.toFixed(2)} DT</span>
                <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  -{Math.round((1 - product.salePrice / product.price) * 100)}%
                </span>
              </div>
            ) : (
              <p className="mt-6 font-display text-3xl font-bold text-foreground">{product.price.toFixed(2)} DT</p>
            )}

            <Button className="mt-6 w-full md:w-auto" size="lg" onClick={() => addItem(product)} disabled={product.stock === 0}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Ajouter au panier
            </Button>
          </div>
        </div>

        {/* ── Section Avis ── */}
        <section className="mt-14 border-t pt-10">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-bold">Avis clients</h2>
            {reviews.length > 0 && (
              <span className="text-lg text-muted-foreground">
                {liveRating} <Star className="inline h-4 w-4 fill-accent text-accent -mt-0.5" /> · {reviews.length} avis
              </span>
            )}
          </div>

          {/* ─ Formulaire selon l'état de l'utilisateur ─ */}
          {isAuthenticated ? (
            myReview && !editingReview ? (
              // L'utilisateur a déjà un avis — afficher son avis avec boutons
              <div className="mt-6 rounded-lg border-2 border-accent/30 bg-accent/5 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-accent">Votre avis</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleStartEdit(myReview)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteReview(myReview.id)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Supprimer
                    </Button>
                  </div>
                </div>
                <StarRating value={myReview.rating} />
                {myReview.comment && <p className="text-sm text-muted-foreground">{myReview.comment}</p>}
              </div>
            ) : editingReview ? (
              // Formulaire de modification
              <div className="mt-6 rounded-lg border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Modifier votre avis</p>
                  <button type="button" aria-label="Annuler la modification" onClick={() => setEditingReview(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <StarRating value={editRating} onChange={setEditRating} />
                <Textarea
                  placeholder="Modifiez votre commentaire…"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={submitting}>
                    <Send className="mr-1.5 h-4 w-4" />
                    {submitting ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingReview(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              // Formulaire pour nouvel avis
              <div className="mt-6 rounded-lg border bg-card p-5 space-y-3">
                <p className="text-sm font-semibold">Laisser un avis</p>
                <StarRating value={newRating} onChange={setNewRating} />
                <Textarea
                  placeholder="Partagez votre expérience avec ce produit…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button size="sm" onClick={handleSubmitReview} disabled={submitting}>
                  <Send className="mr-1.5 h-4 w-4" />
                  {submitting ? "Envoi…" : "Publier l'avis"}
                </Button>
              </div>
            )
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">Connectez-vous</Link> pour laisser un avis.
            </p>
          )}

          {/* ─ Liste des avis ─ */}
          <div className="mt-8 space-y-4">
            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-lg border bg-card p-4 animate-pulse space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun avis pour l'instant. Soyez le premier !</p>
            ) : (
              reviews.map((review) => {
                const isOwner = user?.id === review.userId;
                const isAdmin = user?.role === "admin";
                return (
                  <div
                    key={review.id}
                    className={`rounded-lg border bg-card p-4 space-y-1.5 ${isOwner ? "border-accent/40" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{review.userName}</span>
                        {isOwner && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                        <StarRating value={review.rating} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                        {isAdmin && !isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Supprimer (admin)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProductDetail;
