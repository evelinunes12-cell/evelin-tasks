import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircleHelp, Command, ArrowRight, Mail } from "lucide-react";

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground text-xs font-mono font-semibold shadow-sm">
    {children}
  </kbd>
);

const ShortcutRow = ({
  keys,
  description,
}: {
  keys: React.ReactNode;
  description: string;
}) => (
  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
    <span className="text-sm text-foreground">{description}</span>
    <div className="flex items-center gap-1 shrink-0 ml-4">{keys}</div>
  </div>
);

const ShortcutsHelpDialog = () => {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl">
          <CircleHelp className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="w-5 h-5 text-primary" />
            Central de Ajuda
          </DialogTitle>
          <DialogDescription>
            Atalhos, suporte e canal de contato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Contact card */}
          <a
            href="mailto:appzenitio@gmail.com"
            className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Precisa de ajuda ou tem sugestões?</p>
              <p className="text-sm font-semibold text-primary mt-0.5 truncate">appzenitio@gmail.com</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clique para enviar um e-mail</p>
            </div>
          </a>

          {/* Command menu highlight */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-1">
              <Kbd>{modKey}</Kbd>
              <span className="text-muted-foreground text-xs">+</span>
              <Kbd>K</Kbd>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Abrir Menu de Comandos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Acesse tudo rapidamente de qualquer página</p>
            </div>
          </div>

          {/* Inside command menu */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
              Dentro do Menu de Comandos
            </h4>
            <div className="space-y-0.5">
              <ShortcutRow
                keys={<ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                description="Navegar entre páginas"
              />
              <ShortcutRow
                keys={<ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                description="Criar nova tarefa"
              />
              <ShortcutRow
                keys={<ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                description="Mudar tema claro/escuro"
              />
            </div>
          </div>

          {/* Direct shortcuts */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
              Atalhos Diretos
            </h4>
            <div className="space-y-0.5">
              <ShortcutRow
                keys={<><Kbd>{modKey}</Kbd><span className="text-muted-foreground text-xs">+</span><Kbd>D</Kbd></>}
                description="Ir para Dashboard"
              />
              <ShortcutRow
                keys={<><Kbd>{modKey}</Kbd><span className="text-muted-foreground text-xs">+</span><Kbd>N</Kbd></>}
                description="Nova Tarefa"
              />
              <ShortcutRow
                keys={<><Kbd>{modKey}</Kbd><span className="text-muted-foreground text-xs">+</span><Kbd>E</Kbd></>}
                description="Ir para Ambientes"
              />
              <ShortcutRow
                keys={<><Kbd>{modKey}</Kbd><span className="text-muted-foreground text-xs">+</span><Kbd>,</Kbd></>}
                description="Configurações"
              />
              <ShortcutRow
                keys={<><Kbd>{modKey}</Kbd><span className="text-muted-foreground text-xs">+</span><Kbd>T</Kbd></>}
                description="Alternar Tema"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShortcutsHelpDialog;
