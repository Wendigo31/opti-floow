import { HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ_ITEMS = [
  {
    question: 'Puis-je changer de forfait à tout moment ?',
    answer: 'Oui, vous pouvez passer à un forfait supérieur à tout moment. La différence de prix est calculée au prorata de votre période de facturation en cours. Le passage à un forfait inférieur prend effet à la prochaine date de renouvellement.',
  },
  {
    question: 'Comment fonctionne la facturation ?',
    answer: 'Vous choisissez entre une facturation mensuelle ou annuelle. Le paiement annuel vous fait bénéficier d\'une réduction allant jusqu\'à 27%. La facturation est automatique par carte bancaire via notre plateforme sécurisée Stripe.',
  },
  {
    question: 'Que se passe-t-il si j\'atteins mes limites ?',
    answer: 'Vous recevrez une notification lorsque vous approchez de vos limites (véhicules, calculs, clients). Vous pourrez alors activer un module complémentaire ou passer au forfait supérieur. Vos données existantes ne sont jamais supprimées.',
  },
  {
    question: 'Existe-t-il une période d\'essai ?',
    answer: 'Nous proposons un essai sans engagement. Contactez-nous à support@opti-group.fr pour obtenir un accès découverte et tester l\'application avec vos propres données.',
  },
  {
    question: 'Comment fonctionne le paiement ?',
    answer: 'Le paiement s\'effectue par carte bancaire (Visa, Mastercard, CB) via Stripe. Votre facture est disponible automatiquement après chaque paiement. Toutes les transactions sont sécurisées et conformes PCI-DSS.',
  },
  {
    question: 'Puis-je ajouter des utilisateurs supplémentaires ?',
    answer: 'Le forfait Start est limité à 1 utilisateur, le Pro à 3 utilisateurs, et l\'Enterprise est illimité. Vous pouvez également activer le module "Équipe" en complément pour gérer des accès supplémentaires sur les forfaits inférieurs.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Absolument. Vos données sont hébergées en Europe, chiffrées en transit et au repos. Chaque entreprise dispose de son espace isolé. Les rôles Direction et Exploitation permettent de contrôler finement qui voit quoi.',
  },
  {
    question: 'Les modules complémentaires sont-ils résiliables ?',
    answer: 'Oui, les add-ons sont activables et désactivables à tout moment depuis votre espace. La facturation est ajustée automatiquement au prochain cycle.',
  },
];

export default function PricingFAQ() {
  return (
    <section className="w-full max-w-3xl">
      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Questions fréquentes</h2>
        <p className="text-sm text-muted-foreground">
          Tout ce que vous devez savoir sur nos forfaits et notre facturation.
        </p>
      </div>

      <div className="glass-card p-6">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className={i === FAQ_ITEMS.length - 1 ? 'border-none' : ''}>
              <AccordionTrigger className="text-sm text-left font-medium hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
