"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReferralLinkCard({
  link,
  title = "O seu link de recrutamento",
  description = "Partilhe com futuros produtores. Cada registo através deste link fica associado a si.",
}: {
  link: string;
  title?: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4 text-primary" />
          {title}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-4 flex gap-2">
          <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
