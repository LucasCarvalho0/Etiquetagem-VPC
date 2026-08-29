"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [loteExcluindo, setLoteExcluindo] = useState<Lote | null>(null);
  const [excluindo, setExcluindo] = useState(false);

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

  async function confirmarExclusao() {
    if (!loteExcluindo) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/lotes/${loteExcluindo.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLotes((prev) => prev.filter((l) => l.id !== loteExcluindo.id));
      }
    } finally {
      setExcluindo(false);
      setLoteExcluindo(null);
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
            <Card key={lote.id} className="cursor-pointer hover:bg-accent/50">
              <CardContent className="flex items-center justify-between p-4">
                <div
                  className="flex-1 min-w-0"
                  onClick={() => router.push(`/lote/${lote.id}`)}
                >
                  <p className="font-medium">{lote.codigo}</p>
                  <p className="text-sm text-muted-foreground">
                    {lote.operador.nome} · {lote._count.veiculos} veículos
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-1">Aberto</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setLoteExcluindo(lote); }}
                    aria-label="Excluir lote"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{lote.codigo}</p>
                    <p className="text-muted-foreground">
                      {new Date(lote.iniciadoEm).toLocaleDateString("pt-BR")} · {lote.operador.nome}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <span className="text-muted-foreground">{lote._count.veiculos} veíc.</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setLoteExcluindo(lote)}
                      aria-label="Excluir lote"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
              {lotesRecentes.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum lote finalizado ainda.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!loteExcluindo} onOpenChange={() => !excluindo && setLoteExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lote{" "}
              <b>{loteExcluindo?.codigo}</b>?{" "}
              Todos os <b>{loteExcluindo?._count.veiculos} veículos</b> e PDFs gerados serão removidos permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={confirmarExclusao}
              disabled={excluindo}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#dc2626",
                color: "#fff",
                fontWeight: 600,
                fontSize: "15px",
                border: "none",
                cursor: excluindo ? "not-allowed" : "pointer",
                opacity: excluindo ? 0.7 : 1,
              }}
            >
              {excluindo ? "Excluindo..." : "✓ Sim, excluir lote"}
            </button>
            <button
              onClick={() => !excluindo && setLoteExcluindo(null)}
              disabled={excluindo}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "inherit",
                fontWeight: 500,
                fontSize: "15px",
                border: "1px solid #e2e8f0",
                cursor: excluindo ? "not-allowed" : "pointer",
                opacity: excluindo ? 0.7 : 1,
              }}
            >
              ✕ Não, cancelar
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
