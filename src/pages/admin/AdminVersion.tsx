import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Save, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AppVersion = {
  version: string;
  critical: boolean;
  message: string | null;
  updated_at: string;
  updated_by: string | null;
};

const bumpPatch = (v: string) => {
  const parts = v.split(".").map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  parts[2] = (isNaN(parts[2]) ? 0 : parts[2]) + 1;
  return parts.map((n) => (isNaN(n) ? 0 : n)).join(".");
};
const bumpMinor = (v: string) => {
  const parts = v.split(".").map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  parts[1] = (isNaN(parts[1]) ? 0 : parts[1]) + 1;
  parts[2] = 0;
  return parts.map((n) => (isNaN(n) ? 0 : n)).join(".");
};
const bumpMajor = (v: string) => {
  const parts = v.split(".").map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  parts[0] = (isNaN(parts[0]) ? 0 : parts[0]) + 1;
  parts[1] = 0;
  parts[2] = 0;
  return parts.map((n) => (isNaN(n) ? 0 : n)).join(".");
};

export default function AdminVersion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<AppVersion | null>(null);
  const [version, setVersion] = useState("");
  const [critical, setCritical] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_version")
      .select("version, critical, message, updated_at, updated_by")
      .eq("id", true)
      .maybeSingle();
    if (error) {
      toast.error("Erro ao carregar versão", { description: error.message });
    } else if (data) {
      setCurrent(data as AppVersion);
      setVersion(data.version);
      setCritical(data.critical);
      setMessage(data.message ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!version.trim()) {
      toast.error("Versão obrigatória");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_version")
      .update({
        version: version.trim(),
        critical,
        message: message.trim() ? message.trim() : null,
      })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Versão atualizada", {
      description: "Os usuários conectados receberão o aviso em até 1 minuto.",
    });
    load();
  };

  const isDirty =
    !!current &&
    (version !== current.version ||
      critical !== current.critical ||
      (message || "") !== (current.message || ""));

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Controle de versão</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Force os usuários conectados a atualizarem o app sem precisar de redeploy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Versão atual
          </CardTitle>
          <CardDescription>
            {loading
              ? "Carregando..."
              : current
              ? `Atualizada ${format(new Date(current.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
              : "Sem versão configurada."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="version">Número da versão</Label>
            <div className="flex gap-2 flex-wrap">
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="flex-1 min-w-[140px] font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVersion(bumpPatch(version || "1.0.0"))}
              >
                <ArrowUp className="h-3 w-3 mr-1" /> Patch
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVersion(bumpMinor(version || "1.0.0"))}
              >
                <ArrowUp className="h-3 w-3 mr-1" /> Minor
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVersion(bumpMajor(version || "1.0.0"))}
              >
                <ArrowUp className="h-3 w-3 mr-1" /> Major
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Qualquer mudança de número dispara o aviso de atualização para todos os usuários.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card">
            <div className="space-y-1">
              <Label htmlFor="critical" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className={"h-4 w-4 " + (critical ? "text-destructive" : "text-muted-foreground")} />
                Atualização obrigatória
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando ativo, o modal não pode ser fechado e o usuário só pode prosseguir após atualizar.
              </p>
            </div>
            <Switch id="critical" checked={critical} onCheckedChange={setCritical} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem personalizada (opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: Corrigimos um bug crítico no login. Atualize agora para continuar."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Substitui o texto padrão exibido no modal de atualização.
            </p>
          </div>

          {current && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">Atual: <span className="font-mono ml-1">{current.version}</span></Badge>
              {current.critical && <Badge variant="destructive">Crítica</Badge>}
              {current.message && <Badge variant="secondary">Mensagem personalizada</Badge>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={load} disabled={saving || loading}>
              Recarregar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading || !isDirty}>
              <Save className={"h-4 w-4 mr-2 " + (saving ? "animate-pulse" : "")} />
              {saving ? "Salvando..." : "Salvar e notificar usuários"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning/30">
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• O app verifica a versão a cada 1 minuto e ao retornar o foco para a aba.</p>
          <p>• Quando o número muda, todos os usuários conectados veem um modal pedindo para atualizar.</p>
          <p>• Marcando como <strong>crítica</strong>, o modal vira obrigatório (não pode ser fechado).</p>
          <p>• A atualização limpa o cache do navegador e ativa a versão mais recente automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
