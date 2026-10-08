import { ArrowRight, CircleSlash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NavCategoryConfig } from '@/config/appNavigation';
import { Button } from '@/components/ui/button';

interface CategoryPageListProps {
  category: NavCategoryConfig;
}

export function CategoryPageList({ category }: CategoryPageListProps) {
  const navigate = useNavigate();

  if (category.pages.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 border border-dashed border-border bg-muted/20 p-6 text-center">
        <CircleSlash2 className="h-7 w-7 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">Aucun accès disponible</p>
          <p className="mt-1 text-sm text-muted-foreground">Cette catégorie ne contient aucune page accessible pour votre rôle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {category.pages.map((item) => (
        <Button
          key={item.to}
          variant="outline"
          className="h-auto min-h-16 justify-start gap-3 whitespace-normal px-4 py-3 text-left"
          onClick={() => navigate(item.to)}
        >
          <item.icon className="h-5 w-5 text-primary" />
          <span className="min-w-0 flex-1 font-medium">{item.label}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );
}
