import { useState, useEffect, useRef, useCallback } from "react";
import { logError } from "@/lib/logger";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface City {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string;
        nome: string;
      };
    };
  };
}

interface CitySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function CitySearchInput({
  value,
  onChange,
  placeholder = "Buscar cidade...",
  className,
  id,
}: CitySearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedValue = useDebounce(inputValue, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch cities from IBGE API
  useEffect(() => {
    const fetchCities = async () => {
      if (debouncedValue.length < 2) {
        setCities([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`
        );
        const data: City[] = await response.json();
        
        // Filter cities by search term
        const filtered = data
          .filter((city) =>
            city.nome.toLowerCase().includes(debouncedValue.toLowerCase())
          )
          .slice(0, 20);
        
        setCities(filtered);
      } catch (error) {
        logError("Error fetching cities", error);
        setCities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, [debouncedValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setOpen(true);
  };

  const handleSelectCity = useCallback((city: City) => {
    const cityWithState = `${city.nome} - ${city.microrregiao.mesorregiao.UF.sigla}`;
    setInputValue(cityWithState);
    onChange(cityWithState);
    setOpen(false);
  }, [onChange]);

  const handleFocus = () => {
    if (inputValue.length >= 2) {
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn("pr-8", className)}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {open && cities.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ScrollArea className="max-h-[200px]">
            <ul className="py-1">
              {cities.map((city) => (
                <li
                  key={city.id}
                  onClick={() => handleSelectCity(city)}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {city.nome}
                    <span className="ml-1 text-muted-foreground">
                      - {city.microrregiao.mesorregiao.UF.sigla}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}

      {open && inputValue.length >= 2 && !loading && cities.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 shadow-lg">
          <p className="text-sm text-muted-foreground text-center">
            Nenhuma cidade encontrada
          </p>
        </div>
      )}
    </div>
  );
}
