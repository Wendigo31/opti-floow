import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useVisibleNavigation } from '@/hooks/useVisibleNavigation';
import { isNavigationItemActive } from '@/config/appNavigation';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import optiflowLogo from '@/assets/optiflow-logo.svg';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const categories = useVisibleNavigation().filter((category) => category.items.length > 0);
  const activeCategory = categories.find((category) => category.items.some((item) => isNavigationItemActive(item, pathname)))?.id;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-6 w-6" /><span className="sr-only">Menu</span></Button></SheetTrigger>
      <SheetContent side="left" className="w-80 border-sidebar-border bg-sidebar p-0">
        <VisuallyHidden><SheetTitle>Menu de navigation</SheetTitle></VisuallyHidden>
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          <NavLink to="/" onClick={() => setOpen(false)} className="flex items-center gap-3 text-sidebar-foreground"><img src={optiflowLogo} alt="OptiFlow" className="h-9 w-9" /><div><h1 className="font-bold">OptiFlow</h1><span className="text-xs text-sidebar-foreground/60">Pilotage de rentabilité</span></div></NavLink>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-sidebar-foreground"><X /></Button>
        </div>
        <nav className="max-h-[calc(100vh-80px)] overflow-y-auto p-4">
          <Accordion type="multiple" defaultValue={activeCategory ? [activeCategory] : [categories[0]?.id].filter(Boolean)}>
            {categories.map((category) => <AccordionItem key={category.id} value={category.id} className="border-sidebar-border">
              <AccordionTrigger className="text-sidebar-foreground hover:no-underline"><span className="flex items-center gap-3"><category.icon className="h-5 w-5 text-sidebar-primary" />{category.label}</span></AccordionTrigger>
              <AccordionContent className="space-y-1 pb-3">
                {category.items.map((item) => {
                  const active = isNavigationItemActive(item, pathname);
                  return <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={cn('flex min-h-10 items-center gap-3 px-3 py-2 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', active && 'bg-sidebar-primary text-sidebar-primary-foreground')}><item.icon className="h-4 w-4" />{item.label}</NavLink>;
                })}
              </AccordionContent>
            </AccordionItem>)}
          </Accordion>
        </nav>
      </SheetContent>
    </Sheet>
  );
}