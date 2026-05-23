import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { ImagePlus, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductContext";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { resolveProductImage } from "@/lib/product-image";

const emptyForm = {
  name: "",
  barcode: "",
  description: "",
  price: "",
  salePrice: "",
  purchasePrice: "",
  image: "",
  category: "Accessoires",
  stock: "",
  rating: "4.5",
};

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/login" />;
  }

  const productCategories = categories.filter((category) => category !== "Tous");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (!normalizedSearch) return true;

    return (
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.category.toLowerCase().includes(normalizedSearch) ||
      (product.barcode ?? "").toLowerCase().includes(normalizedSearch)
    );
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.barcode.trim() || !form.price || !form.stock) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires, y compris le code-barres.",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      name: form.name,
      barcode: form.barcode.trim(),
      description: form.description,
      price: parseFloat(form.price),
      salePrice: form.salePrice.trim() !== "" && parseFloat(form.salePrice) > 0
        ? parseFloat(form.salePrice)
        : null,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
      image: form.image || "",
      category: form.category,
      stock: parseInt(form.stock, 10),
      rating: parseFloat(form.rating),
    };

    if (editingId) {
      await updateProduct(editingId, productData, imageFile);
    } else {
      await addProduct(productData, imageFile);
    }

    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setDialogOpen(false);
  };

  const startEdit = (product: Product) => {
    setForm({
      name: product.name,
      barcode: product.barcode ?? "",
      description: product.description,
      price: product.price.toString(),
      salePrice: product.salePrice != null ? product.salePrice.toString() : "",
      purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : "",
      image: product.image,
      category: product.category,
      stock: product.stock.toString(),
      rating: product.rating.toString(),
    });
    setImageFile(null);
    setImagePreview(resolveProductImage(product.image));
    setEditingId(product.id);
    setDialogOpen(true);
  };

  const openNew = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold">Administration</h1>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau produit
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="barcode">Code-barres *</Label>
                  <Input
                    id="barcode"
                    value={form.barcode}
                    onChange={(event) => setForm({ ...form, barcode: event.target.value })}
                    placeholder="Ex : 6191234567890"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Prix (DT) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(event) => setForm({ ...form, price: event.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock *</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(event) => setForm({ ...form, stock: event.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salePrice">
                      Prix promo (DT) <span className="text-xs text-muted-foreground">- optionnel</span>
                    </Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex : 49.99"
                      value={form.salePrice}
                      onChange={(event) => setForm({ ...form, salePrice: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchasePrice">
                      Prix d'achat (DT) <span className="text-xs text-muted-foreground">- optionnel</span>
                    </Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex : 30.00"
                      value={form.purchasePrice}
                      onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Categorie</Label>
                  <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Image du produit</Label>
                  <div
                    className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Apercu" className="h-32 w-32 rounded object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImagePlus className="h-10 w-10" />
                        <span className="text-sm">Cliquez pour choisir une image</span>
                        <span className="text-xs">JPG, PNG, WEBP - max 5 Mo</span>
                      </div>
                    )}
                    {imageFile && (
                      <span className="max-w-full truncate text-xs text-muted-foreground">{imageFile.name}</span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    aria-label="Image du produit"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                <div>
                  <Label htmlFor="rating">Note</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating}
                    onChange={(event) => setForm({ ...form, rating: event.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1">
                    {editingId ? "Enregistrer" : "Creer"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Produits ({filteredProducts.length})</CardTitle>
              <div className="w-full sm:w-80">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher par nom ou code-barres"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Code-barres</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveProductImage(product.image)}
                          alt={product.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs">{product.barcode || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.category}</Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price ? (
                        <span className="flex flex-col items-end gap-0.5">
                          <span className="text-xs text-muted-foreground line-through">{product.price.toFixed(2)} DT</span>
                          <span className="font-bold text-red-500">{product.salePrice.toFixed(2)} DT</span>
                        </span>
                      ) : (
                        <span>{product.price.toFixed(2)} DT</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <span
                        className={
                          product.stock === 0
                            ? "font-bold text-destructive"
                            : product.stock <= 5
                              ? "font-semibold text-orange-500"
                              : ""
                        }
                      >
                        {product.stock === 0 ? "Rupture" : product.stock}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Aucun produit trouve pour cette recherche.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
