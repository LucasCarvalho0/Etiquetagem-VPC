"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface Lote {
  id: string;
  codigo: string;
  status: "ABERTO" | "FINALIZADO" | "CANCELADO";
  clienteFrota?: string | null;
  iniciadoEm: string;
  operador: { nome: string; matricula: string };
  _count: { veiculos: number };
}

export default function HomePage() {
  const router = useRouter();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    fetch("/api/lotes")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => data && setLotes(data.lotes));
  }, [router]);

  async function iniciarNovoLote() {
    setCriando(true);
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) router.push(`/lote/${data.lote.id}`);
    } finally {
      setCriando(false);
    }
  }

  const lotesAbertos = lotes.filter((l) => l.status === "ABERTO");
  const lotesRecentes = lotes.filter((l) => l.status !== "ABERTO").slice(0, 10);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-4 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-semibold">Etiquetagem VPC</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={() => router.push("/configuracoes")} aria-label="Configurações">
            ⚙️
          </Button>
        </div>
      </header>

      <Button size="lg" onClick={iniciarNovoLote} disabled={criando}>
        {criando ? "Iniciando..." : "+ Iniciar novo lote"}
      </Button>

      {lotesAbertos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Lotes em andamento</h2>
          {lotesAbertos.map((lote) => (
            <Card key={lote.id} className="cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/lote/${lote.id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{lote.codigo}</p>
                  <p className="text-sm text-muted-foreground">{lote.operador.nome} · {lote._count.veiculos} veículos</p>
                </div>
                <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-1">Aberto</span>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Histórico recente</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Por data, lote e operador</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {lotesRecentes.map((lote) => (
                <li key={lote.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{lote.codigo}</p>
                    <p className="text-muted-foreground">
                      {new Date(lote.iniciadoEm).toLocaleDateString("pt-BR")} · {lote.operador.nome}
                    </p>
                  </div>
                  <span className="text-muted-foreground">{lote._count.veiculos} veíc.</span>
                </li>
              ))}
              {lotesRecentes.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum lote finalizado ainda.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
