import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      const loggedUser = await register(name, email, password);
      if (loggedUser) navigate("/dashboard");
    } else {
      const loggedUser = await login(email, password);
      if (loggedUser) {
        // Rediriger l'admin vers le tableau de bord administrateur
        navigate(loggedUser.role === "admin" ? "/admin" : "/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-lg border bg-card p-8">
          <h1 className="text-center font-display text-2xl font-bold">
            {isRegister ? "Créer un compte" : "Connexion"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {isRegister ? "Rejoignez-nous dès maintenant" : "Connectez-vous à votre compte"}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" required />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@exemple.com" required />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button className="w-full" type="submit">
              {isRegister ? "S'inscrire" : "Se connecter"}
            </Button>
          </form>

          {!isRegister && (
            <p className="mt-3 text-center text-sm">
              <Link to="/forgot-password" className="text-muted-foreground underline-offset-4 hover:underline hover:text-foreground">
                Mot de passe oublié ?
              </Link>
            </p>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="font-medium text-primary underline-offset-4 hover:underline">
              {isRegister ? "Se connecter" : "S'inscrire"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
