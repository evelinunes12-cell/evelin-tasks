import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Mountain, Zap, Target, ArrowLeft, Check, X, Eye, EyeOff, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneBR } from "@/lib/phoneMask";
import { TermsOfUseDialog } from "@/components/TermsOfUseDialog";
import { CitySearchInput } from "@/components/CitySearchInput";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { EDUCATION_LEVELS } from "@/lib/constants";

type AuthMode = "login" | "signup" | "forgot" | "reset";

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
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
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
    } else if (resetMode === "signup") {
      setMode("signup");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && mode !== "reset") {
      const redirect = searchParams.get("redirect");
      navigate(redirect || "/dashboard");
    }
  }, [user, navigate, mode, searchParams]);

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
          const redirect = searchParams.get("redirect");
          navigate(redirect || "/dashboard");
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
          birthDate: birthDate ? format(birthDate, "yyyy-MM-dd") : undefined,
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
          const redirect = searchParams.get("redirect");
          navigate(redirect || "/dashboard");
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
            {/* Google OAuth button - always first for login/signup */}
            {(mode === "login" || mode === "signup") && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-14 rounded-xl text-base font-medium gap-3 bg-white dark:bg-white border border-border shadow-sm hover:shadow-md transition-shadow text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-50"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const result = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin,
                      });
                      if (result?.error) {
                        toast({
                          variant: "destructive",
                          title: "Erro ao entrar com Google",
                          description: String(result.error),
                        });
                      }
                    } catch {
                      toast({
                        variant: "destructive",
                        title: "Erro",
                        description: "Não foi possível conectar com o Google.",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continuar com Google
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground">ou continue com e-mail</span>
                  </div>
                </div>
              </>
            )}

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
                    <Label>Data de Nascimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-12 w-full justify-start text-left font-normal rounded-xl",
                            !birthDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {birthDate ? format(birthDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={birthDate}
                          onSelect={setBirthDate}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          className="pointer-events-auto"
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
