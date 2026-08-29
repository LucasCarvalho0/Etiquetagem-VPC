"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface ConfiguracaoEmpresa {
  nomeEmpresa: string;
  margemTopoMm: number;
  margemBaixoMm: number;
  margemEsquerdaMm: number;
  margemDireitaMm: number;
  larguraEtiquetaMm: number;
  alturaEtiquetaMm: number;
  colunasPorPagina: number;
}

const CAMPOS_MARGEM: { chave: keyof ConfiguracaoEmpresa; label: string }[] = [
  { chave: "margemTopoMm", label: "Margem superior (mm)" },
  { chave: "margemBaixoMm", label: "Margem inferior (mm)" },
  { chave: "margemEsquerdaMm", label: "Margem esquerda (mm)" },
  { chave: "margemDireitaMm", label: "Margem direita (mm)" },
  { chave: "larguraEtiquetaMm", label: "Largura da etiqueta (mm)" },
  { chave: "alturaEtiquetaMm", label: "Altura da etiqueta (mm)" },
  { chave: "colunasPorPagina", label: "Colunas por página" },
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfiguracaoEmpresa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/configuracao")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => data && setConfig(data.config));
  }, [router]);

  function atualizarCampo(chave: keyof ConfiguracaoEmpresa, valor: string) {
    if (!config) return;
    const numerico = chave === "nomeEmpresa" ? undefined : Number(valor);
    setConfig({
      ...config,
      [chave]: chave === "nomeEmpresa" ? valor : (isNaN(numerico!) ? 0 : numerico),
    });
  }

  async function salvar() {
    if (!config) return;
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const res = await fetch("/api/configuracao", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Falha ao salvar configurações");
        return;
      }
      setConfig(data.config);
      setMensagem("Configurações salvas com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (!config) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-4 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>Voltar</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
            <Input
              id="nomeEmpresa"
              value={config.nomeEmpresa}
              onChange={(e) => atualizarCampo("nomeEmpresa", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margens e layout da etiqueta</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {CAMPOS_MARGEM.map(({ chave, label }) => (
            <div key={chave} className="flex flex-col gap-1.5">
              <Label htmlFor={chave}>{label}</Label>
              <Input
                id={chave}
                type="number"
                step="0.5"
                value={config[chave] as number}
                onChange={(e) => atualizarCampo(chave, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {mensagem && <p className="text-sm text-primary">{mensagem}</p>}

      <Button size="lg" onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar configurações"}
      </Button>
    </main>
  );
}
