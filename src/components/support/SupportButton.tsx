import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bug,
  HelpCircle,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  KIND_LABELS,
  createGuestSupportThread,
  createSupportThread,
  guestSupportThreads,
  markGuestSupportRead,
  markSupportRead,
  mySupportThreads,
  replyGuestSupportThread,
  replySupportThread,
  supportContext,
  type SupportKind,
  type SupportThread,
} from "@/lib/support";
import { OptiGroupLink } from "./OptiGroupLink";

const KIND_ICONS = {
  bug: Bug,
  question: HelpCircle,
  chat: MessageCircle,
} as const;
const STATUS: Record<SupportThread["status"], string> = {
  open: "En attente",
  answered: "Répondu",
  closed: "Clos",
};
const time = (s: string) =>
  new Date(s).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

/**
 * Bouton « Support » en bas à gauche du volet d'onglets et de la page de connexion — identique
 * dans les 3 logiciels, accompagné du logo OptiGroup (lien vers opti-group.fr).
 * Signaler un bug, poser une question ou discuter avec un administrateur OptiGroup ;
 * les réponses d'OptiCentral arrivent ici. Sans compte connecté, le visiteur laisse son email
 * et l'appareil garde ses demandes pour afficher la réponse.
 */
export function SupportButton({
  licenseId,
  app,
  collapsed = false,
  floating = false,
}: {
  licenseId: string | null | undefined;
  app: string;
  collapsed?: boolean;
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [view, setView] = useState<"home" | "new" | string>("home");
  const [kind, setKind] = useState<SupportKind>("bug");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const guest = !licenseId;

  const load = useCallback(async () => {
    try {
      setThreads(
        licenseId
          ? await mySupportThreads(licenseId)
          : await guestSupportThreads(),
      );
    } catch {
      /* hors ligne ou session expirée : nouvel essai au prochain passage */
    }
  }, [licenseId]);

  // Réponses du support : vérifiées toutes les 15 s fenêtre ouverte, toutes les 2 min sinon.
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), open ? 15_000 : 120_000);
    return () => clearInterval(t);
  }, [load, open]);

  const unread = threads.filter((t) => t.unread).length;
  const current = threads.find((t) => t.id === view) ?? null;

  useEffect(() => {
    if (current?.unread)
      void (
        guest ? markGuestSupportRead(current.id) : markSupportRead(current.id)
      ).then(load);
    endRef.current?.scrollIntoView({ block: "end" });
  }, [current, load, guest]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      if (!body.trim()) throw new Error("Décrivez votre demande");
      const ctx = supportContext(app);
      const id = licenseId
        ? await createSupportThread(licenseId, kind, subject, body, ctx)
        : await createGuestSupportThread(email, name, kind, subject, body, ctx);
      setSubject("");
      setBody("");
      setView(id);
    });
  const reply = () =>
    run(async () => {
      if (!current || !body.trim()) return;
      await (guest
        ? replyGuestSupportThread(current.id, body)
        : replySupportThread(current.id, body));
      setBody("");
    });

  const trigger = floating ? (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
      <OptiGroupLink className="h-9 w-9 shadow-lg" />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm shadow-lg hover:bg-accent"
        aria-label="Support : signaler un bug ou discuter avec un administrateur"
      >
        <LifeBuoy className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Support</span>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>
    </div>
  ) : (
    <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Support : signaler un bug ou discuter avec un administrateur"
        aria-label="Support"
        className={`relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${collapsed ? "justify-center px-0" : ""}`}
      >
        <LifeBuoy className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 text-left">Support</span>}
        {unread > 0 && (
          <span
            className={`rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground ${collapsed ? "absolute right-1 top-1" : ""}`}
          >
            {unread}
          </span>
        )}
      </button>
      <OptiGroupLink className={collapsed ? "h-7 w-7" : "h-8 w-8"} />
    </div>
  );

  return (
    <>
      {trigger}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setView("home");
            setError(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {view !== "home" && (
                <button
                  type="button"
                  onClick={() => setView("home")}
                  aria-label="Retour"
                  className="rounded p-1 hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              {current
                ? current.subject
                : view === "new"
                  ? KIND_LABELS[kind]
                  : "Support OptiGroup"}
            </DialogTitle>
            <DialogDescription>
              {current
                ? `${KIND_LABELS[current.kind]} · ${STATUS[current.status]}`
                : guest
                  ? "Vous n'êtes pas connecté : laissez votre email, un administrateur vous répond ici (sur cet appareil) ou par email."
                  : "Un administrateur reçoit votre message et vous répond ici."}
            </DialogDescription>
          </DialogHeader>

          {view === "home" && (
            <div className="space-y-3 overflow-y-auto">
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(KIND_LABELS) as SupportKind[]).map((k) => {
                  const Icon = KIND_ICONS[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKind(k);
                        setView("new");
                      }}
                      className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center text-xs hover:bg-accent"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      {KIND_LABELS[k]}
                    </button>
                  );
                })}
              </div>
              {threads.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Mes demandes
                  </p>
                  <ul className="divide-y rounded-lg border">
                    {threads.map((t) => {
                      const Icon = KIND_ICONS[t.kind];
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setView(t.id)}
                            className="flex w-full items-center gap-2 p-2.5 text-left text-sm hover:bg-accent"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {t.subject}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {STATUS[t.status]} · {time(t.last_message_at)}
                              </span>
                            </span>
                            {t.unread && (
                              <span
                                className="h-2 w-2 rounded-full bg-primary"
                                aria-label="Nouvelle réponse"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {view === "new" && (
            <div className="space-y-3">
              {guest && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="email"
                    placeholder="Votre email *"
                    autoComplete="email"
                    value={email}
                    maxLength={200}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Nom et société"
                    autoComplete="name"
                    value={name}
                    maxLength={120}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <Input
                placeholder="Sujet (facultatif)"
                value={subject}
                maxLength={140}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Textarea
                rows={6}
                placeholder={
                  kind === "bug"
                    ? "Que s'est-il passé ? Que faisiez-vous juste avant ? Quel message d'erreur s'est affiché ?"
                    : kind === "question"
                      ? "Votre question"
                      : "Votre message"
                }
                value={body}
                maxLength={5000}
                onChange={(e) => setBody(e.target.value)}
              />
              {kind === "bug" && (
                <p className="text-xs text-muted-foreground">
                  La page affichée, votre navigateur et les dernières erreurs
                  techniques sont joints automatiquement pour aider à corriger.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={() => void send()}
                disabled={busy || !body.trim() || (guest && !email.trim())}
                className="w-full"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Envoyer
              </Button>
            </div>
          )}

          {current && (
            <>
              <div className="min-h-[180px] flex-1 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                {current.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        m.from_admin
                          ? "bg-card border"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {m.body}
                      </p>
                      <p
                        className={`mt-1 text-[10px] ${m.from_admin ? "text-muted-foreground" : "opacity-75"}`}
                      >
                        {m.from_admin ? `${m.author || "OptiGroup"} · ` : ""}
                        {time(m.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Votre réponse"
                  value={body}
                  maxLength={5000}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                      void reply();
                  }}
                />
                <Button
                  onClick={() => void reply()}
                  disabled={busy || !body.trim()}
                  aria-label="Envoyer"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
