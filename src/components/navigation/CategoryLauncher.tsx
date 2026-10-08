import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AppNavigationCategory } from '@/config/appNavigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CategoryPageList } from './CategoryPageList';

interface CategoryLauncherProps {
  categories: AppNavigationCategory[];
}

export function CategoryLauncher({ categories }: CategoryLauncherProps) {
  const [selectedId, setSelectedId] = useState(categories[0]?.id);
  const selected = categories.find((category) => category.id === selectedId) ?? categories[0];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {categories.map((category) => {
          const active = category.id === selected?.id;
          return (
            <Button
              key={category.id}
              variant="outline"
              className={cn(
                'h-36 flex-col items-start justify-between whitespace-normal border-border bg-card p-4 text-left shadow-sm',
                active && 'border-primary bg-accent text-accent-foreground ring-1 ring-primary',
                category.id === 'profitability' && 'col-span-2 lg:col-span-1',
              )}
              aria-pressed={active}
              onClick={() => setSelectedId(category.id)}
            >
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-md bg-muted', active && 'bg-primary text-primary-foreground')}>
                <category.icon className="h-6 w-6" />
              </span>
              <span className="flex w-full items-end justify-between gap-2">
                <span className="font-semibold leading-tight">{category.label}</span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', active && 'rotate-180')} />
              </span>
            </Button>
          );
        })}
      </div>

      {selected && (
        <section aria-labelledby={`category-${selected.id}`} className="border-t border-border pt-6">
          <div className="mb-5">
            <h2 id={`category-${selected.id}`} className="text-xl font-semibold text-foreground">{selected.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
          </div>
          <CategoryPageList category={selected} />
        </section>
      )}
    </div>
  );
}