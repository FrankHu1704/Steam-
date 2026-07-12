export type Plan = {
  id: string;
  name: string;
  price: number;
  memory: string;
  storage: string;
  cpu: string;
  popular?: boolean;
  trialHours?: number;
};

export const trialPlan: Plan = {
  id: "trial",
  name: "Teste Grátis",
  price: 0,
  memory: "512 MB",
  storage: "5 GB",
  cpu: "0.5 vCPU",
  trialHours: 48,
};

export const paidPlans: Plan[] = [
  { id: "ls1", name: "LS 1", price: 100, memory: "512 MB", storage: "5 GB", cpu: "0.5 vCPU" },
  { id: "ls2", name: "LS 2", price: 180, memory: "1 GB", storage: "10 GB", cpu: "1 vCPU", popular: true },
  { id: "ls3", name: "LS 3", price: 260, memory: "1.5 GB", storage: "15 GB", cpu: "1 vCPU" },
  { id: "ls4", name: "LS 4", price: 350, memory: "2 GB", storage: "20 GB", cpu: "1.5 vCPU", popular: true },
  { id: "ls5", name: "LS 5", price: 450, memory: "3 GB", storage: "25 GB", cpu: "2 vCPU" },
  { id: "ls6", name: "LS 6", price: 550, memory: "4 GB", storage: "30 GB", cpu: "2 vCPU" },
  { id: "ls10", name: "LS 10", price: 850, memory: "6 GB", storage: "40 GB", cpu: "3 vCPU" },
  { id: "ls16", name: "LS 16", price: 1300, memory: "8 GB", storage: "60 GB", cpu: "4 vCPU" },
  { id: "ls24", name: "LS 24", price: 1900, memory: "12 GB", storage: "100 GB", cpu: "6 vCPU" },
];

export const plans: Plan[] = [trialPlan, ...paidPlans];
