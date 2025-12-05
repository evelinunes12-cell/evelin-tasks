import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, ArrowLeft } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is coming from password reset email
    const resetMode = searchParams.get("mode");
    if (resetMode === "reset") {
      setMode("reset");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && mode !== "reset") {
      navigate("/dashboard");
    }
  }, [user, navigate, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao entrar",
            description: error.message === "Invalid login credentials" 
              ? "Email ou senha incorretos" 
              : error.message,
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Bem-vindo de volta.",
          });
          navigate("/dashboard");
        }
      } else if (mode === "signup") {
        if (!fullName) {
          toast({
            variant: "destructive",
            title: "Campo obrigatório",
            description: "Por favor, informe seu nome completo.",
          });
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao criar conta",
            description: error.message === "User already registered" 
              ? "Este email já está cadastrado" 
              : error.message,
          });
        } else {
          toast({
            title: "Conta criada com sucesso!",
            description: "Você já pode fazer login.",
          });
          navigate("/dashboard");
        }
      } else if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao enviar email",
            description: error.message,
          });
        } else {
          toast({
            title: "Email enviado!",
            description: "Verifique sua caixa de entrada para redefinir sua senha.",
          });
          setMode("login");
        }
      } else if (mode === "reset") {
        if (password !== confirmPassword) {
          toast({
            variant: "destructive",
            title: "Senhas não conferem",
            description: "As senhas digitadas não são iguais.",
          });
          setLoading(false);
          return;
        }
        
        const { error } = await updatePassword(password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao redefinir senha",
            description: error.message,
          });
        } else {
          toast({
            title: "Senha redefinida!",
            description: "Sua senha foi alterada com sucesso.",
          });
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Bem-vindo de volta";
      case "signup": return "Criar conta";
      case "forgot": return "Recuperar senha";
      case "reset": return "Nova senha";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login": return "Entre com suas credenciais para acessar suas tarefas";
      case "signup": return "Preencha os dados para criar sua conta";
      case "forgot": return "Digite seu email para receber o link de recuperação";
      case "reset": return "Digite sua nova senha";
    }
  };

  const getButtonText = () => {
    if (loading) return "Carregando...";
    switch (mode) {
      case "login": return "Entrar";
      case "signup": return "Criar conta";
      case "forgot": return "Enviar email";
      case "reset": return "Redefinir senha";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {getTitle()}
          </CardTitle>
          <CardDescription>
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            
            {(mode === "login" || mode === "signup" || mode === "forgot") && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
            
            {(mode === "login" || mode === "signup" || mode === "reset") && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === "reset" ? "Nova Senha" : "Senha"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            
            {mode === "reset" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {getButtonText()}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm space-y-2">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground hover:text-primary hover:underline block w-full"
                >
                  Esqueceu sua senha?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline block w-full"
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </>
            )}
            
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline"
              >
                Já tem uma conta? Entre
              </button>
            )}
            
            {(mode === "forgot" || mode === "reset") && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
