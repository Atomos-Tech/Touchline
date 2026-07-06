import { Globe } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useLocale } from "@/hooks/useLocale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LABEL: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
  ar: "العربية",
};

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-deep-foreground hover:bg-white/10 hover:text-deep-foreground"
          aria-label={`Change language, current ${LABEL[locale]}`}
        >
          <Globe className="size-4" aria-hidden />
          <span className="ml-1 hidden sm:inline">{LABEL[locale]}</span>
          <span className="ml-1 sm:hidden">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => setLocale(l)}>
            {LABEL[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
