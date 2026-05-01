import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { API_URL } from "@/lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSent(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-lg border bg-card p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="text-xl font-bold">Email envoyé !</h2>
              <p className="text-sm text-muted-foreground">
                Si un compte existe avec <strong>{email}</strong>, vous recevrez un lien
                de réinitialisation valable <strong>30 minutes</strong>.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-2 w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <Mail className="mx-auto h-10 w-10 text-primary" />
                <h1 className="mt-3 font-display text-2xl font-bold">Mot de passe oublié</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entrez votre email et nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Envoi en cours…" : "Envoyer le lien"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  <ArrowLeft className="mr-1 inline h-3 w-3" />
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
