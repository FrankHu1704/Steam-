export type BotFile = {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
};

export type BotStatus = "ativo" | "pausado" | "erro";

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  planId: string;
  status: BotStatus;
  createdAt: string;
  files: BotFile[];
};

export const mockCustomers: Customer[] = [
  {
    id: "cus_1",
    name: "Amélia Machava",
    email: "amelia@example.com",
    phone: "+258 84 111 2233",
    planId: "ls2",
    status: "ativo",
    createdAt: "2026-05-02",
    files: [
      { id: "f1", name: "bot-atendimento.zip", sizeLabel: "4.2 MB", uploadedAt: "2026-05-02" },
    ],
  },
  {
    id: "cus_2",
    name: "Jorge Nhantumbo",
    email: "jorge@example.com",
    phone: "+258 82 445 6677",
    planId: "ls4",
    status: "ativo",
    createdAt: "2026-06-14",
    files: [
      { id: "f2", name: "loja-bot.zip", sizeLabel: "9.8 MB", uploadedAt: "2026-06-14" },
      { id: "f3", name: "loja-bot-v2.zip", sizeLabel: "10.1 MB", uploadedAt: "2026-07-01" },
    ],
  },
  {
    id: "cus_3",
    name: "Célia Muianga",
    email: "celia@example.com",
    phone: "+258 87 998 1122",
    planId: "ls1",
    status: "pausado",
    createdAt: "2026-06-20",
    files: [],
  },
  {
    id: "cus_4",
    name: "Baltazar Cossa",
    email: "baltazar@example.com",
    phone: "+258 84 332 1100",
    planId: "ls10",
    status: "erro",
    createdAt: "2026-04-11",
    files: [
      { id: "f4", name: "suporte-bot.zip", sizeLabel: "22.4 MB", uploadedAt: "2026-04-11" },
    ],
  },
];
