import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Building2, FileText, PackagePlus, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9000";
const emptyProfile = { name: "", address: "", phone: "", email: "", taxId: "", vatRate: 0, currency: "DT" };

const AdminBusiness = () => {
  const { user, isAuthenticated } = useAuth();
  const { products, refreshProducts } = useProducts();
  const [profile, setProfile] = useState(emptyProfile);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [supplier, setSupplier] = useState({ name: "", contact: "", phone: "", email: "" });
  const [purchase, setPurchase] = useState({ supplier: "", productId: "", quantity: "1", unitCost: "", reference: "" });
  const [document, setDocument] = useState({ type: "quote", customerName: "", productId: "", quantity: "1" });
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const load = async () => {
    try {
      const [profileRes, suppliersRes, purchasesRes, docsRes] = await Promise.all([
        fetch(`${API_URL}/api/business/profile`), fetch(`${API_URL}/api/suppliers`),
        fetch(`${API_URL}/api/purchases`), fetch(`${API_URL}/api/documents`),
      ]);
      const nextProfile = await profileRes.json();
      setProfile({ ...emptyProfile, ...nextProfile });
      setSuppliers(await suppliersRes.json()); setPurchases(await purchasesRes.json()); setDocuments(await docsRes.json());
    } catch { toast({ title: "Erreur", description: "Impossible de charger la gestion commerciale.", variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);
  if (!isAuthenticated || user?.role !== "admin") return <Navigate to="/login" />;

  const request = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(`${API_URL}${url}`, { method, headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Operation impossible.");
    return data;
  };
  const saveProfile = async () => { try { await request("/api/business/profile", "PUT", profile); toast({ title: "Profil enregistre" }); } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); } };
  const importProfile = async () => {
    if (!profileFile) return; const data = new FormData(); data.append("file", profileFile);
    try { const result = await request("/api/business/profile/import", "POST", data); setProfile((prev) => ({ ...prev, ...result.extracted })); toast({ title: "Informations extraites", description: "Verifie puis enregistre le formulaire." }); }
    catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };
  const createSupplier = async () => { try { await request("/api/suppliers", "POST", supplier); setSupplier({ name: "", contact: "", phone: "", email: "" }); await load(); toast({ title: "Fournisseur ajoute" }); } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); } };
  const createPurchase = async () => {
    const product = products.find((entry) => entry.id === purchase.productId); if (!product) return;
    try { await request("/api/purchases", "POST", { ...purchase, items: [{ productId: product.id, quantity: Number(purchase.quantity), unitCost: Number(purchase.unitCost) }] }); setPurchase({ supplier: "", productId: "", quantity: "1", unitCost: "", reference: "" }); await refreshProducts(); await load(); toast({ title: "Achat enregistre", description: "Le stock a ete mis a jour." }); } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };
  const createDocument = async () => {
    const product = products.find((entry) => entry.id === document.productId); if (!product) return;
    try { await request("/api/documents", "POST", { ...document, vatRate: profile.vatRate, items: [{ productId: product.id, name: product.name, quantity: Number(document.quantity), unitPrice: product.salePrice || product.price }] }); setDocument({ type: "quote", customerName: "", productId: "", quantity: "1" }); await load(); toast({ title: "Document cree" }); } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };
  const productOptions = products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} ({product.stock})</SelectItem>);

  return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto space-y-6 px-4 py-8">
    <div className="flex items-center gap-3"><Building2 className="h-7 w-7 text-primary" /><h1 className="font-display text-3xl font-bold">Gestion commerciale</h1></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Informations de la société</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">{([['name','Nom société'],['phone','Téléphone'],['email','Email'],['taxId','Matricule fiscal'],['currency','Devise'],['vatRate','TVA %']] as const).map(([key,label]) => <div key={key}><Label>{label}</Label><Input type={key === 'vatRate' ? 'number' : 'text'} value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: key === 'vatRate' ? Number(e.target.value) : e.target.value })} /></div>)}</div>
        <div><Label>Adresse</Label><Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
        <div className="flex flex-wrap gap-2"><Button onClick={saveProfile}>Enregistrer</Button><Input className="max-w-xs" type="file" accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)} /><Button variant="outline" onClick={importProfile} disabled={!profileFile}>Extraire fichier</Button></div>
        <p className="text-xs text-muted-foreground">Formats acceptés : Excel, CSV, PDF, PNG, JPG et WEBP. Vérifie toujours les champs extraits avant de les enregistrer.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Fournisseurs</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">{([['name','Nom *'],['contact','Contact'],['phone','Téléphone'],['email','Email']] as const).map(([key,label]) => <div key={key}><Label>{label}</Label><Input value={supplier[key]} onChange={(e) => setSupplier({ ...supplier, [key]: e.target.value })} /></div>)}</div><Button onClick={createSupplier}>Ajouter fournisseur</Button>
        <div className="max-h-32 space-y-1 overflow-auto text-sm">{suppliers.map((item) => <div key={item.id} className="rounded border p-2">{item.name} <span className="text-muted-foreground">{item.phone || item.email}</span></div>)}</div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" />Nouvel achat et stock</CardTitle></CardHeader><CardContent className="space-y-3">
        <Select value={purchase.supplier} onValueChange={(supplier) => setPurchase({ ...purchase, supplier })}><SelectTrigger><SelectValue placeholder="Fournisseur" /></SelectTrigger><SelectContent>{suppliers.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select>
        <Select value={purchase.productId} onValueChange={(productId) => setPurchase({ ...purchase, productId })}><SelectTrigger><SelectValue placeholder="Produit" /></SelectTrigger><SelectContent>{productOptions}</SelectContent></Select>
        <div className="grid grid-cols-3 gap-2"><Input placeholder="Quantité" type="number" min="1" value={purchase.quantity} onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })} /><Input placeholder="Coût unit." type="number" min="0" value={purchase.unitCost} onChange={(e) => setPurchase({ ...purchase, unitCost: e.target.value })} /><Input placeholder="Référence" value={purchase.reference} onChange={(e) => setPurchase({ ...purchase, reference: e.target.value })} /></div><Button onClick={createPurchase} disabled={!purchase.productId}>Enregistrer achat</Button>
        <p className="text-xs text-muted-foreground">Chaque achat augmente le stock immédiatement et met à jour le prix d’achat.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Devis et factures</CardTitle></CardHeader><CardContent className="space-y-3">
        <Select value={document.type} onValueChange={(type) => setDocument({ ...document, type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quote">Devis</SelectItem><SelectItem value="invoice">Facture</SelectItem></SelectContent></Select>
        <Input placeholder="Nom du client" value={document.customerName} onChange={(e) => setDocument({ ...document, customerName: e.target.value })} />
        <Select value={document.productId} onValueChange={(productId) => setDocument({ ...document, productId })}><SelectTrigger><SelectValue placeholder="Produit" /></SelectTrigger><SelectContent>{productOptions}</SelectContent></Select>
        <div className="flex gap-2"><Input className="max-w-36" type="number" min="1" value={document.quantity} onChange={(e) => setDocument({ ...document, quantity: e.target.value })} /><Button onClick={createDocument} disabled={!document.customerName || !document.productId}>Créer</Button></div>
        <div className="max-h-28 space-y-1 overflow-auto text-sm">{documents.map((item) => <div key={item.id} className="rounded border p-2">{item.number} — {item.customerName} — {Number(item.total).toFixed(2)} {profile.currency}</div>)}</div>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Historique des achats</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{purchases.length ? purchases.map((item) => <div key={item.id} className="rounded border p-3">{new Date(item.date).toLocaleDateString("fr-FR")} — {item.supplier || "Sans fournisseur"} — {Number(item.total).toFixed(2)} {profile.currency}</div>) : <p className="text-muted-foreground">Aucun achat enregistré.</p>}</CardContent></Card>
  </main></div>;
};

export default AdminBusiness;
