import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminCategories = () => {
  const { user, isAuthenticated } = useAuth();
  const { categories, products, addCategory, updateCategory, deleteCategory, deleteAllCategories } = useProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/login" />;
  }

  const editableCategories = categories.filter((c) => c !== "Tous");

  const openNew = () => {
    setFormName("");
    setEditingName(null);
    setDialogOpen(true);
  };

  const startEdit = (name: string) => {
    setFormName(name);
    setEditingName(name);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) return;

    if (editingName) {
      await updateCategory(editingName, trimmed);
    } else {
      await addCategory(trimmed);
    }
    setDialogOpen(false);
    setFormName("");
    setEditingName(null);
  };

  const countProducts = (cat: string) => products.filter((p) => p.category === cat).length;

  const handleDeleteAll = async () => {
    await deleteAllCategories();
    setDeleteAllOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Tags className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold">Catégories</h1>
          </div>
          <div className="flex gap-2">
            {editableCategories.length > 0 && (
              <Button variant="destructive" onClick={() => setDeleteAllOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Tout supprimer
              </Button>
            )}
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle catégorie
            </Button>
          </div>
        </div>

        <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer toutes les catégories ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est definitive. Supprime d'abord tous les produits : une categorie utilisee par un produit ne peut pas etre supprimee.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteAll}>
                Tout supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingName ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="catName">Nom de la catégorie</Label>
                <Input
                  id="catName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Électronique"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingName ? "Enregistrer" : "Créer"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Catégories ({editableCategories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Produits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableCategories.map((cat) => (
                  <TableRow key={cat}>
                    <TableCell className="font-medium">{cat}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{countProducts(cat)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminCategories;
