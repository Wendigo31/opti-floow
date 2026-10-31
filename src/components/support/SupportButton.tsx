import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bug,
  HelpCircle,
  ImagePlus,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Send,
  X,
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
  FREQUENCY,
  KIND_LABELS,
  QUESTION_TOPICS,
  SEVERITY,
  compressImage,
  createGuestSupportThread,
  createSupportThread,
  guestSupportThreads,
  markGuestSupportRead,
  markSupportRead,
  mySupportThreads,
  replyGuestSupportThread,
  replySupportThread,
  supportContext,
  type Severity,
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
  // Formulaire détaillé (bug / question / discussion)
  const [severity, setSeverity] = useState<Severity>("genant");
  const [frequency, setFrequency] = useState<keyof typeof FREQUENCY>("toujours");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [topic, setTopic] = useState<string>(QUESTION_TOPICS[0]);
  const [phone, setPhone] = useState("");
  const [callback, setCallback] = useState(false);
  const [allowSession, setAllowSession] = useState(true);
  const [shots, setShots] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const addShots = async (files: Iterable<Blob>) => {
    setError(null);
    try {
      const out: string[] = [];
      for (const f of files) {
        if (shots.length + out.length >= 3) break;
        out.push(await compressImage(f));
      }
      setShots((prev) => [...prev, ...out].slice(0, 3));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image impossible à joindre");
    }
  };

  const resetForm = () => {
    setSubject("");
    setBody("");
    setSteps("");
    setExpected("");
    setShots([]);
    setCallback(false);
  };

  const send = () =>
    run(async () => {
      if (!body.trim()) throw new Error(kind === "bug" ? "Décrivez ce qui s'est passé" : "Écrivez votre message");
      if (guest && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
        throw new Error("Indiquez un email valide pour recevoir la réponse");
      const form: Record<string, unknown> =
        kind === "bug"
          ? { severity, frequency, steps: steps.trim(), expected: expected.trim(), allow_session: !guest && allowSession }
          : kind === "question"
            ? { topic }
            : { callback, phone: callback ? phone.trim() : "" };
      // Le message lisible reprend les champs, pour que la demande se comprenne partout.
      const parts =
        kind === "bug"
          ? [
              `Gravité : ${SEVERITY[severity]}`,
              `Fréquence : ${FREQUENCY[frequency]}`,
              `\nCe qui s'est passé :\n${body.trim()}`,
              steps.trim() && `\nÉtapes pour reproduire :\n${steps.trim()}`,
              expected.trim() && `\nRésultat attendu :\n${expected.trim()}`,
            ]
          : kind === "question"
            ? [`Sujet : ${topic}`, `\n${body.trim()}`]
            : [body.trim(), callback && phone.trim() && `\nÀ rappeler au ${phone.trim()}`];
      const text = parts.filter(Boolean).join("\n").slice(0, 5000);
      const ctx = { ...supportContext(app), form, screenshots: shots };
      const title =
        subject.trim() ||
        (kind === "question" ? `${topic} — ${body.trim().slice(0, 60)}` : body.trim().slice(0, 80));
      const id = licenseId
        ? await createSupportThread(licenseId, kind, title, text, ctx)
        : await createGuestSupportThread(email, name, kind, title, text, ctx);
      resetForm();
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
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-3">
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
            <div
              className="space-y-4 overflow-y-auto pr-1"
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
                if (files.length) {
                  e.preventDefault();
                  void addShots(files);
                }
              }}
            >
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

              {kind === "bug" && (
                <>
                  <fieldset className="space-y-1.5">
                    <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Gravité</legend>
                    <div className="grid gap-1.5 sm:grid-cols-3">
                      {(Object.keys(SEVERITY) as Severity[]).map((k) => {
                        const [title, hint] = SEVERITY[k].split(" — ");
                        const tone =
                          k === "bloquant"
                            ? "border-red-500 bg-red-500/10"
                            : k === "genant"
                              ? "border-amber-500 bg-amber-500/10"
                              : "border-sky-500 bg-sky-500/10";
                        return (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={severity === k}
                            onClick={() => setSeverity(k)}
                            className={`rounded-lg border p-2 text-left text-xs transition-colors ${severity === k ? tone : "hover:bg-accent"}`}
                          >
                            <span className="block font-semibold">{title}</span>
                            <span className="block text-muted-foreground">{hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <Field label="Ce qui s'est passé *">
                    <Textarea
                      rows={3}
                      placeholder="Ex. : en validant la facture, la page reste blanche et affiche « erreur 500 »."
                      value={body}
                      maxLength={2500}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </Field>
                  <Field label="Étapes pour reproduire">
                    <Textarea
                      rows={3}
                      placeholder={"1. Ouvrir Factures\n2. Choisir le client Dupont\n3. Cliquer sur Valider"}
                      value={steps}
                      maxLength={1500}
                      onChange={(e) => setSteps(e.target.value)}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Résultat attendu">
                      <Input
                        placeholder="Ex. : la facture est créée"
                        value={expected}
                        maxLength={500}
                        onChange={(e) => setExpected(e.target.value)}
                      />
                    </Field>
                    <Field label="Ça arrive">
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as keyof typeof FREQUENCY)}
                      >
                        {Object.entries(FREQUENCY).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </>
              )}

              {kind === "question" && (
                <>
                  <Field label="Sujet">
                    <div className="flex flex-wrap gap-1.5">
                      {QUESTION_TOPICS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={topic === t}
                          onClick={() => setTopic(t)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${topic === t ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Votre question *">
                    <Textarea
                      rows={5}
                      placeholder="Expliquez ce que vous cherchez à faire."
                      value={body}
                      maxLength={4000}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </Field>
                </>
              )}

              {kind === "chat" && (
                <>
                  <Field label="Votre message *">
                    <Textarea
                      rows={5}
                      placeholder="Bonjour, je souhaiterais…"
                      value={body}
                      maxLength={4000}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={callback}
                      onChange={(e) => setCallback(e.target.checked)}
                    />
                    Je préfère être rappelé par téléphone
                  </label>
                  {callback && (
                    <Input
                      type="tel"
                      placeholder="Votre numéro"
                      value={phone}
                      maxLength={30}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  )}
                </>
              )}

              <Field label="Titre (facultatif)">
                <Input
                  placeholder="Résumé en quelques mots"
                  value={subject}
                  maxLength={140}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Field>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Captures d'écran ({shots.length}/3) — vous pouvez aussi les coller (Ctrl + V)
                </p>
                <div className="flex flex-wrap gap-2">
                  {shots.map((src, i) => (
                    <div key={i} className="relative h-16 w-24 overflow-hidden rounded-md border">
                      <img src={src} alt={`Capture ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setShots((p) => p.filter((_, j) => j !== i))}
                        aria-label="Retirer la capture"
                        className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {shots.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-16 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[11px] text-muted-foreground hover:bg-accent"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Ajouter
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      if (e.target.files) void addShots(Array.from(e.target.files));
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {kind === "bug" && !guest && (
                <label className="flex items-start gap-2 rounded-lg border bg-muted/40 p-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={allowSession}
                    onChange={(e) => setAllowSession(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">J'autorise le support à ouvrir ma session</span> pour
                    reproduire le problème (accès tracé, fermé automatiquement après 2 h).
                  </span>
                </label>
              )}
              {kind === "bug" && (
                <p className="text-xs text-muted-foreground">
                  La page affichée, votre navigateur et les dernières erreurs techniques sont joints
                  automatiquement.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={() => void send()}
                disabled={busy || !body.trim() || (guest && !email.trim())}
                className="w-full"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Envoyer au support
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
