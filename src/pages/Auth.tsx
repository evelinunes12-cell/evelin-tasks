import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mountain, Zap, Target, ArrowLeft, Check, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneBR } from "@/lib/phoneMask";
import { TermsOfUseDialog } from "@/components/TermsOfUseDialog";
import { CitySearchInput } from "@/components/CitySearchInput";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const EDUCATION_LEVELS = [
  { value: "Ensino Fundamental", label: "Ensino Fundamental" },
  { value: "Ensino Médio", label: "Ensino Médio" },
  { value: "Cursos Livres", label: "Cursos Livres" },
  { value: "Curso Técnico", label: "Curso Técnico" },
  { value: "Ensino Superior", label: "Ensino Superior" },
  { value: "Pós-graduação", label: "Pós-graduação" },
  { value: "Mestrado/Doutorado", label: "Mestrado/Doutorado" },
  { value: "Outros", label: "Outros" },
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // New fields
  const [age, setAge] = useState<string>("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  
  const { signUp, signIn, user, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Password requirements
  const passwordRequirements = [
    { id: "length", label: "Pelo menos 8 caracteres", test: (p: string) => p.length >= 8 },
    { id: "uppercase", label: "Letra maiúscula (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
    { id: "lowercase", label: "Letra minúscula (a-z)", test: (p: string) => /[a-z]/.test(p) },
    { id: "number", label: "Número (0-9)", test: (p: string) => /\d/.test(p) },
    { id: "special", label: "Caractere especial (!@#...)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.test(password));

  useEffect(() => {
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneBR(e.target.value));
  };

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
            description: "Bem-vindo de volta ao Zenit.",
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
        
        if (!allRequirementsMet) {
          toast({
            variant: "destructive",
            title: "Senha fraca",
            description: "Por favor, siga os requisitos de senha listados.",
          });
          setLoading(false);
          return;
        }

        if (!termsAccepted) {
          toast({
            variant: "destructive",
            title: "Termos obrigatórios",
            description: "Você precisa aceitar os Termos de Uso para continuar.",
          });
          setLoading(false);
          return;
        }
        
        const { error } = await signUp({
          email,
          password,
          fullName,
          age: age ? parseInt(age, 10) : null,
          city: city || undefined,
          phone: phone || undefined,
          educationLevel: educationLevel || undefined,
          termsAccepted,
        });
        
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao criar conta",
            description: error.message.includes("already registered") 
              ? "Este email já está cadastrado." 
              : error.message,
          });
        } else {
          toast({
            title: "Conta criada com sucesso!",
            description: "Bem-vindo ao Zenit!",
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
        
        if (!allRequirementsMet) {
          toast({
            variant: "destructive",
            title: "Senha fraca",
            description: "Sua nova senha deve cumprir os requisitos.",
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
      case "login": return "Entre para gerenciar seus projetos e tarefas.";
      case "signup": return "Crie sua conta e eleve sua produtividade.";
      case "forgot": return "Digite seu email para receber o link de recuperação.";
      case "reset": return "Digite sua nova senha.";
    }
  };

  const getButtonText = () => {
    if (loading) return "Processando...";
    switch (mode) {
      case "login": return "Entrar";
      case "signup": return "Criar conta";
      case "forgot": return "Enviar email";
      case "reset": return "Redefinir senha";
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side: Brand and Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary-foreground/10 p-12 flex-col justify-between text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-foreground/20 rounded-xl">
            <Mountain className="w-8 h-8" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Zenit</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Eleve seu foco.
              <br />
              Alcance o Zenit.
            </h1>
            
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary-foreground/20 rounded-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <p className="text-lg opacity-90">Fluxo de trabalho otimizado e veloz</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary-foreground/20 rounded-lg">
                  <Target className="w-5 h-5" />
                </div>
                <p className="text-lg opacity-90">Organize tarefas e atinja objetivos</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm opacity-70">
          © {new Date().getFullYear()} Zenit Tasks. O ponto máximo da sua produtividade.
        </p>
      </div>

      {/* Right side: Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Mountain className="w-8 h-8 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">Zenit</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
              {getTitle()}
            </h2>
            <p className="text-muted-foreground">
              {getDescription()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="age">Idade</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Ex: 18"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min={10}
                      max={120}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <CitySearchInput
                      id="city"
                      value={city}
                      onChange={setCity}
                      placeholder="Buscar cidade..."
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Celular</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="educationLevel">Segmento de Ensino</Label>
                  <Select value={educationLevel} onValueChange={setEducationLevel}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecione seu segmento" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {EDUCATION_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {(mode === "login" || mode === "signup" || mode === "forgot") && (
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl"
                />
              </div>
            )}
            
            {(mode === "login" || mode === "signup" || mode === "reset") && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === "reset" ? "Nova Senha *" : "Senha *"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password requirements feedback */}
                {(mode === "signup" || mode === "reset") && password.length > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Sua senha deve conter:</p>
                    <ul className="space-y-1.5">
                      {passwordRequirements.map((req) => {
                        const isMet = req.test(password);
                        return (
                          <li
                            key={req.id}
                            className={cn(
                              "flex items-center gap-2 text-xs transition-colors",
                              isMet ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                            )}
                          >
                            {isMet ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            {req.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {mode === "reset" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl"
                />
              </div>
            )}

            {/* Terms checkbox for signup */}
            {mode === "signup" && (
              <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Li e concordo com os{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsDialog(true)}
                      className="text-primary hover:underline font-semibold"
                    >
                      Termos de Uso
                    </button>
                    {" "}*
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Você deve aceitar os termos para criar sua conta.
                  </p>
                </div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-base font-semibold" 
              disabled={loading}
            >
              {getButtonText()}
            </Button>
          </form>
          
          <div className="text-center text-sm space-y-3">
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
                  className="text-primary hover:underline block w-full font-medium"
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </>
            )}
            
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline font-medium"
              >
                Já tem uma conta? Entre
              </button>
            )}
            
            {(mode === "forgot" || mode === "reset") && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Terms Dialog */}
      <TermsOfUseDialog open={showTermsDialog} onOpenChange={setShowTermsDialog} />
    </div>
  );
};

export default Auth;
