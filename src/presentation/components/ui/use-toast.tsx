// src/presentation/components/ui/use-toast.tsx

import { useToastContext } from "./ToastProvider"

// Exporta un hook limpio y avanzado, reutilizando la lógica segura
export function useToast() {
  return useToastContext()
}
