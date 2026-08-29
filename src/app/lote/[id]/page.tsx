"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QrScanner } from "@/components/scanner/QrScanner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gerarBarcodePng } from "@/lib/barcode";
import { MoreVertical, Pencil, Trash } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Veiculo {
  id: string;
  vin: string;
  modelo?: string | null;
  cor?: string | null;
  lidoEm: string;
}

export default function LotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const loteId = params.id;

  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [scannerAtivo, setScannerAtivo] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Usar ref para evitar recriar o callback a cada leitura
  const processandoLeituraRef = useRef(false);

  // States for deleting
  const [veiculoExcluindo, setVeiculoExcluindo] = useState<Veiculo | null>(null);

  // States for editing
  const [veiculoEditando, setVeiculoEditando] = useState<Veiculo | null>(null);
  const [editForm, setEditForm] = useState({ vin: "", modelo: "", cor: "" });

  const carregarVeiculos = useCallback(async () => {
    const res = await fetch(`/api/lotes/${loteId}/veiculos`);
    if (res.ok) {
      const data = await res.json();
      setVeiculos(data.veiculos);
    }
  }, [loteId]);

  useEffect(() => {
    carregarVeiculos();
  }, [carregarVeiculos]);

  const handleLeitura = useCallback(
    async (conteudo: string) => {
      if (processandoLeituraRef.current) return;
      processandoLeituraRef.current = true;
      try {
        const res = await fetch(`/api/lotes/${loteId}/veiculos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCodeBruto: conteudo }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMensagem({ tipo: "erro", texto: data.erro });
          if (navigator.vibrate) navigator.vibrate(200);
          return;
        }
        setVeiculos((prev) => [...prev, data.veiculo]);
        setMensagem({ tipo: "ok", texto: `VIN ${data.veiculo.vin} adicionado` });
        if (navigator.vibrate) navigator.vibrate(60);
      } catch {
        setMensagem({ tipo: "erro", texto: "Erro de conexão ao registrar leitura" });
      } finally {
        processandoLeituraRef.current = false;
        setTimeout(() => setMensagem(null), 2500);
      }
    },
    [loteId]
  );

  async function handleGerarPdf() {
    if (veiculos.length === 0) return;
    setGerandoPdf(true);
    setScannerAtivo(false);
    try {
      // 1. Finaliza no banco
      await fetch(`/api/lotes/${loteId}/finalizar`, { method: "POST" });
      
      // 2. Aciona o download nativo pelo navegador
      window.location.href = `/api/lotes/${loteId}/pdf`;
      
      // 3. Aguarda 1 segundo e volta para a página inicial
      setTimeout(() => router.push("/"), 1200);
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro de conexão ao finalizar lote" });
      setGerandoPdf(false);
      setScannerAtivo(true);
    }
  }

  async function confirmarExclusao() {
    if (!veiculoExcluindo) return;
    try {
      const res = await fetch(`/api/lotes/${loteId}/veiculos/${veiculoExcluindo.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVeiculos((prev) => prev.filter((v) => v.id !== veiculoExcluindo.id));
        setMensagem({ tipo: "ok", texto: "Veículo excluído com sucesso." });
      } else {
        const data = await res.json();
        setMensagem({ tipo: "erro", texto: data.erro || "Erro ao excluir veículo." });
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro de rede ao excluir." });
    } finally {
      setVeiculoExcluindo(null);
      setTimeout(() => setMensagem(null), 2500);
    }
  }

  function iniciarEdicao(veiculo: Veiculo) {
    setScannerAtivo(false);
    setVeiculoEditando(veiculo);
    setEditForm({
      vin: veiculo.vin,
      modelo: veiculo.modelo || "",
      cor: veiculo.cor || "",
    });
  }

  async function salvarEdicao() {
    if (!veiculoEditando) return;
    try {
      const payload = {
        vin: editForm.vin !== veiculoEditando.vin ? editForm.vin : undefined,
        modelo: editForm.modelo || undefined,
        cor: editForm.cor || undefined,
      };

      const res = await fetch(`/api/lotes/${loteId}/veiculos/${veiculoEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setVeiculos((prev) =>
          prev.map((v) => (v.id === veiculoEditando.id ? data.veiculo : v))
        );
        setMensagem({ tipo: "ok", texto: "Veículo atualizado." });
      } else {
        setMensagem({ tipo: "erro", texto: data.erro || "Erro ao atualizar." });
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro de rede ao atualizar." });
    } finally {
      setVeiculoEditando(null);
      setScannerAtivo(true);
      setTimeout(() => setMensagem(null), 3000);
    }
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4 bg-background">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Leitura de Veículos</h1>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>Voltar</Button>
      </header>

      <QrScanner ativo={scannerAtivo && !veiculoEditando && !veiculoExcluindo} onLeitura={handleLeitura} />

      {mensagem && (
        <div
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            mensagem.tipo === "erro" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b p-4">
            <span className="text-sm font-medium">Veículos lidos</span>
            <span className="text-sm text-muted-foreground">{veiculos.length}</span>
          </div>
          <ul className="max-h-[40vh] overflow-y-auto divide-y">
            {veiculos.map((v) => (
              <li key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-mono font-medium">{v.vin}</span>
                  <span className="text-muted-foreground text-xs">{[v.modelo, v.cor].filter(Boolean).join(" · ")}</span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Opções</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => iniciarEdicao(v)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => setVeiculoExcluindo(v)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </li>
            ))}
            {veiculos.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum veículo lido ainda. Aponte a câmera para o QR Code.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Button size="lg" disabled={veiculos.length === 0 || gerandoPdf} onClick={handleGerarPdf}>
        {gerandoPdf ? "Gerando PDF..." : `Gerar PDF do lote (${veiculos.length})`}
      </Button>

      {/* DIALOG DE EXCLUSÃO */}
      <AlertDialog open={!!veiculoExcluindo} onOpenChange={() => setVeiculoExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja remover o veículo <b>{veiculoExcluindo?.vin}</b> deste lote? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG DE EDIÇÃO */}
      <Dialog open={!!veiculoEditando} onOpenChange={(val) => { 
        if(!val) { setVeiculoEditando(null); setScannerAtivo(true); } 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vin">VIN lido</Label>
              <Input
                id="vin"
                value={editForm.vin}
                onChange={(e) => setEditForm(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                className="font-mono uppercase transition-all"
                maxLength={17}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  placeholder="Ex: Corolla"
                  value={editForm.modelo}
                  onChange={(e) => setEditForm({ ...editForm, modelo: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cor">Cor</Label>
                <Input
                  id="cor"
                  placeholder="Ex: Prata"
                  value={editForm.cor}
                  onChange={(e) => setEditForm({ ...editForm, cor: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVeiculoEditando(null); setScannerAtivo(true); }}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
