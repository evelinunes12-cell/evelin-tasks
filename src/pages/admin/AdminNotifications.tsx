import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { Send, Search, Megaphone, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminNotifications = () => {
  // Broadcast state
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bType, setBType] = useState<"info" | "warning" | "success">("info");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  // Individual state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; full_name: string | null; email: string } | null>(null);
  const [iTitle, setITitle] = useState("");
  const [iMessage, setIMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [sendingIndividual, setSendingIndividual] = useState(false);

  const handleBroadcastClick = async () => {
    if (!bTitle.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    // Fetch active count
    const { data, error } = await supabase.rpc("get_active_users_count");
    if (error) {
      toast.error("Erro ao buscar contagem de usuários.");
      return;
    }
    setActiveCount(data as number);
    setConfirmOpen(true);
  };

  const handleBroadcastConfirm = async () => {
    setConfirmOpen(false);
    setSending(true);
    const { error } = await supabase.rpc("send_broadcast_notification", {
      p_title: bTitle,
      p_message: bMessage || null,
      p_type: bType,
    });
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar: " + error.message);
    } else {
      toast.success("Notificação enviada para todos os usuários ativos!");
      setBTitle("");
      setBMessage("");
      setBType("info");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(10);
    setSearching(false);
    if (error) {
      toast.error("Erro na busca.");
      return;
    }
    setSearchResults(data || []);
  };

  const handleSendIndividual = async () => {
    if (!selectedUser) {
      toast.error("Selecione um usuário.");
      return;
    }
    if (!iTitle.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    setSendingIndividual(true);
    const { error } = await supabase.rpc("send_individual_notification", {
      p_user_id: selectedUser.id,
      p_title: iTitle,
      p_message: iMessage || null,
    });
    setSendingIndividual(false);
    if (error) {
      toast.error("Erro ao enviar: " + error.message);
    } else {
      toast.success(`Notificação enviada para ${selectedUser.full_name || selectedUser.email}!`);
      setITitle("");
      setIMessage("");
      setSelectedUser(null);
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Notificações</h1>

      <Tabs defaultValue="broadcast">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Geral (Broadcast)
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Individual
          </TabsTrigger>
        </TabsList>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enviar para Todos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="b-title">Título</Label>
                <Input
                  id="b-title"
                  placeholder="Ex: Manutenção programada"
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-message">Mensagem</Label>
                <Textarea
                  id="b-message"
                  placeholder="Detalhes da notificação..."
                  value={bMessage}
                  onChange={(e) => setBMessage(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={bType} onValueChange={(v) => setBType(v as "info" | "warning" | "success")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Informativo</SelectItem>
                    <SelectItem value="warning">⚠️ Alerta</SelectItem>
                    <SelectItem value="success">✅ Sucesso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleBroadcastClick} disabled={sending} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Enviando..." : "Enviar para Todos"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Tab */}
        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enviar Individual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Usuário</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome ou e-mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button variant="outline" onClick={handleSearch} disabled={searching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {searching && <Skeleton className="h-20 w-full" />}

              {searchResults.length > 0 && (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchResults([]);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors text-sm ${
                        selectedUser?.id === user.id ? "bg-accent" : ""
                      }`}
                    >
                      <p className="font-medium text-foreground">{user.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="p-3 rounded-md bg-muted text-sm">
                  <span className="font-medium">Destinatário:</span>{" "}
                  {selectedUser.full_name || selectedUser.email}
                  <button
                    className="ml-2 text-xs text-destructive hover:underline"
                    onClick={() => setSelectedUser(null)}
                  >
                    Remover
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="i-title">Título</Label>
                <Input
                  id="i-title"
                  placeholder="Título da notificação"
                  value={iTitle}
                  onChange={(e) => setITitle(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="i-message">Mensagem</Label>
                <Textarea
                  id="i-message"
                  placeholder="Mensagem..."
                  value={iMessage}
                  onChange={(e) => setIMessage(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <Button onClick={handleSendIndividual} disabled={sendingIndividual || !selectedUser} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {sendingIndividual ? "Enviando..." : "Enviar"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Broadcast Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio</AlertDialogTitle>
            <AlertDialogDescription>
              Isso notificará <strong>{activeCount ?? "..."}</strong> usuários ativos. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBroadcastConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNotifications;
