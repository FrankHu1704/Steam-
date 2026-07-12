export type ProfileStatus = "pendente" | "ativo" | "pausado" | "erro";

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan_id: string | null;
  status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
};

export type BotFileRow = {
  id: string;
  customer_id: string;
  name: string;
  size_bytes: number;
  storage_path: string;
  uploaded_at: string;
};
