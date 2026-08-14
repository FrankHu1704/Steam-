"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Trash2, ArrowUp, ArrowDown, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { updateCheckoutBlocks, generateCheckoutBlockContent } from "@/lib/actions/products";
import {
  CHECKOUT_BLOCK_TYPES,
  CHECKOUT_BLOCK_LABELS,
  MAX_BLOCKS_PER_PRODUCT,
  emptyBlock,
  type CheckoutBlock,
  type CheckoutBlockType,
} from "@/lib/checkout-blocks";

function BlockFields({
  block,
  onChange,
}: {
  block: CheckoutBlock;
  onChange: (next: CheckoutBlock) => void;
}) {
  if (block.type === "benefits") {
    return (
      <div className="space-y-2">
        <Input
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Título (ex.: O que vai receber)"
        />
        <Textarea
          value={block.items.join("\n")}
          onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })}
          placeholder={"Um benefício por linha\nEx.: Acesso imediato ao curso"}
          rows={4}
        />
      </div>
    );
  }
  if (block.type === "testimonials") {
    return (
      <div className="space-y-2">
        <Input
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Título (ex.: O que dizem os clientes)"
        />
        {block.items.map((item, i) => (
          <div key={i} className="flex gap-2 rounded-lg border border-border p-2">
            <div className="flex-1 space-y-1.5">
              <Input
                value={item.name}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...item, name: e.target.value };
                  onChange({ ...block, items });
                }}
                placeholder="Nome"
              />
              <Textarea
                value={item.text}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...item, text: e.target.value };
                  onChange({ ...block, items });
                }}
                placeholder="Depoimento"
                rows={2}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {block.items.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...block, items: [...block.items, { name: "", text: "" }] })}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar depoimento
          </Button>
        )}
      </div>
    );
  }
  if (block.type === "guarantee") {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label>Dias</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={block.days}
            onChange={(e) => onChange({ ...block, days: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Texto</Label>
          <Textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} rows={2} />
        </div>
      </div>
    );
  }
  if (block.type === "countdown") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Texto</Label>
          <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Termina em</Label>
          <Input
            type="datetime-local"
            value={block.endsAt.slice(0, 16)}
            onChange={(e) => onChange({ ...block, endsAt: new Date(e.target.value).toISOString() })}
          />
        </div>
      </div>
    );
  }
  // faq
  return (
    <div className="space-y-2">
      <Input
        value={block.title}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        placeholder="Título (ex.: Perguntas frequentes)"
      />
      {block.items.map((item, i) => (
        <div key={i} className="flex gap-2 rounded-lg border border-border p-2">
          <div className="flex-1 space-y-1.5">
            <Input
              value={item.question}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...item, question: e.target.value };
                onChange({ ...block, items });
              }}
              placeholder="Pergunta"
            />
            <Textarea
              value={item.answer}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...item, answer: e.target.value };
                onChange({ ...block, items });
              }}
              placeholder="Resposta"
              rows={2}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {block.items.length < 8 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...block, items: [...block.items, { question: "", answer: "" }] })}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar pergunta
        </Button>
      )}
    </div>
  );
}

export function CheckoutBlocksEditor({ productId, initialBlocks }: { productId: string; initialBlocks: CheckoutBlock[] }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<CheckoutBlock[]>(initialBlocks);
  const [newType, setNewType] = useState<CheckoutBlockType>("benefits");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateBlock(id: string, next: CheckoutBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? next : b)));
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addBlock() {
    if (blocks.length >= MAX_BLOCKS_PER_PRODUCT) {
      toast.error(`Máximo de ${MAX_BLOCKS_PER_PRODUCT} blocos por produto.`);
      return;
    }
    setBlocks((prev) => [...prev, emptyBlock(newType)]);
  }

  async function generateWithAi(block: CheckoutBlock) {
    setGeneratingId(block.id);
    const res = await generateCheckoutBlockContent(productId, block.type);
    setGeneratingId(null);
    if (res.error || !res.result) {
      toast.error(res.error ?? "Não foi possível gerar o conteúdo.");
      return;
    }
    updateBlock(block.id, { ...block, ...res.result } as CheckoutBlock);
    toast.success("Conteúdo gerado — reveja antes de guardar.");
  }

  async function handleSave() {
    setSaving(true);
    const res = await updateCheckoutBlocks(productId, blocks);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Página de checkout atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Adicione blocos para personalizar a página de checkout deste produto (benefícios, depoimentos, garantia,
        contagem decrescente, perguntas frequentes) — aparecem abaixo da descrição, antes do formulário de
        pagamento. Use "Gerar com IA" para rascunhar o conteúdo de cada bloco.
      </p>

      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Ainda não tem blocos personalizados nesta página.
        </p>
      )}

      <div className="space-y-3">
        {blocks.map((block, i) => (
          <Card key={block.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  {CHECKOUT_BLOCK_LABELS[block.type]}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveBlock(i, 1)}
                    disabled={i === blocks.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => generateWithAi(block)} disabled={generatingId === block.id}>
                    {generatingId === block.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Gerar com IA
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(block.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <BlockFields block={block} onChange={(next) => updateBlock(block.id, next)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Select value={newType} onChange={(e) => setNewType(e.target.value as CheckoutBlockType)} className="w-56">
          {CHECKOUT_BLOCK_TYPES.map((t) => (
            <option key={t} value={t}>
              {CHECKOUT_BLOCK_LABELS[t]}
            </option>
          ))}
        </Select>
        <Button type="button" variant="outline" onClick={addBlock}>
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar bloco
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving} className="ml-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
