"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);
  if (!montado) return <div className="h-11 w-11" />;

  const escuro = theme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={() => setTheme(escuro ? "light" : "dark")}
    >
      {escuro ? "☀️" : "🌙"}
    </Button>
  );
}
