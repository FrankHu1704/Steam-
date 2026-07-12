import { z } from 'zod'

export const sendSmsSchema = z.object({
  to: z.string().min(9, 'Número inválido'),
  message: z.string().min(1, 'Mensagem obrigatória').max(1600, 'Mensagem demasiado longa'),
  sender_id: z.string().max(11).optional(),
  flash: z.boolean().optional(),
  scheduled_at: z.string().datetime().optional(),
})

const recipientSchema = z.union([z.string(), z.object({ phone: z.string(), name: z.string().optional() })])

export const bulkSendSchema = z.object({
  recipients: z.array(recipientSchema).min(1, 'Pelo menos um destinatário').max(50000, 'Máximo de 50 000 destinatários'),
  message: z.string().min(1, 'Mensagem obrigatória').max(1600, 'Mensagem demasiado longa'),
  sender_id: z.string().max(11).optional(),
  flash: z.boolean().optional(),
  scheduled_at: z.string().datetime().optional(),
  batch_name: z.string().max(120).optional(),
})

export const createContactSchema = z.object({
  name: z.string().max(120).optional(),
  phone: z.string().min(9),
  list_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

export const createContactListSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
})

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Nome demasiado curto'),
    companyName: z.string().optional(),
    phone: z.string().min(9, 'Número inválido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
})

export const purchaseCreditsSchema = z.object({
  plan_id: z.string().uuid().optional(),
  credits: z.number().positive().optional(),
  amount: z.number().positive(),
  payment_method: z.enum(['mpesa', 'emola', 'card', 'paypal', 'stripe']),
  phone: z.string().optional(),
})
