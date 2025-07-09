import { z } from 'zod'

export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string().optional(),
  postal_code: z.string(),
  country: z.string().length(2), // Código ISO de país, por ejemplo 'US'
})

export type Address = z.infer<typeof AddressSchema>