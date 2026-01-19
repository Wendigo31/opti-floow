import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContactDialogProps {
  userEmail?: string;
  userName?: string;
  companyName?: string;
  licenseCode?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

const subjectOptions = [
  { value: 'Problème technique', label: 'Problème technique' },
  { value: 'Problème de facturation', label: 'Problème de facturation' },
  { value: 'Demande d\'ajout de fonctionnalités', label: 'Demande d\'ajout de fonctionnalités' },
];

export function ContactDialog({ 
  userEmail, 
  userName, 
  companyName, 
  licenseCode,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true
}: ContactDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const handleSubmit = async () => {
    if (!subject || !message.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          subject,
          message,
          userEmail,
          userName,
          companyName,
          licenseCode,
        },
      });

      if (error) throw error;

      toast({
        title: 'Message envoyé',
        description: 'Votre message a été envoyé à l\'équipe technique.',
      });
      setOpen(false);
      setSubject('');
      setMessage('');
    } catch (error: any) {
      console.error('Error sending contact email:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            Contacter l'équipe technique
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contacter l'équipe technique</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Objet</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un objet" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Décrivez votre demande..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full gap-2">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Envoyer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
