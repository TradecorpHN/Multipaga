import toast from 'react-hot-toast'

// Copy text to clipboard
export async function copyToClipboard(
  text: string,
  successMessage: string = 'Copied to clipboard!',
  errorMessage: string = 'Failed to copy'
): Promise<boolean> {
  try {
    // Modern way - Navigator Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
      return true
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        toast.success(successMessage)
        return true
      } else {
        throw new Error('Copy command failed')
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    toast.error(errorMessage)
    return false
  }
}

// Read from clipboard
export async function readFromClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      const text = await navigator.clipboard.readText()
      return text
    } else {
      // Fallback not available for reading
      toast.error('Clipboard reading not supported in this browser')
      return null
    }
  } catch (error) {
    console.error('Failed to read from clipboard:', error)
    toast.error('Failed to read clipboard')
    return null
  }
}

// Copy complex data as JSON
export async function copyAsJSON(
  data: any,
  successMessage: string = 'Data copied as JSON!',
  errorMessage: string = 'Failed to copy data'
): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    return await copyToClipboard(jsonString, successMessage, errorMessage)
  } catch (error) {
    console.error('Failed to stringify data:', error)
    toast.error('Failed to format data')
    return false
  }
}

// Copy table data as CSV
export async function copyAsCSV(
  headers: string[],
  rows: any[][],
  successMessage: string = 'Table copied as CSV!',
  errorMessage: string = 'Failed to copy table'
): Promise<boolean> {
  try {
    const csv = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape cells containing commas or quotes
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')
    
    return await copyToClipboard(csv, successMessage, errorMessage)
  } catch (error) {
    console.error('Failed to create CSV:', error)
    toast.error('Failed to format table')
    return false
  }
}

// Copy formatted address
export function copyAddress(address: {
  line1?: string
  line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}): Promise<boolean> {
  const parts = [
    address.line1,
    address.line2,
    address.city && address.state ? `${address.city}, ${address.state}` : address.city || address.state,
    address.postal_code,
    address.country,
  ].filter(Boolean)
  
  return copyToClipboard(parts.join('\n'), 'Address copied!')
}

// Copy payment details
export function copyPaymentDetails(payment: {
  payment_id: string
  amount: number
  currency: string
  status: string
  created_at: string
}): Promise<boolean> {
  const details = [
    `Payment ID: ${payment.payment_id}`,
    `Amount: ${payment.currency} ${(payment.amount / 100).toFixed(2)}`,
    `Status: ${payment.status}`,
    `Date: ${new Date(payment.created_at).toLocaleString()}`,
  ].join('\n')
  
  return copyToClipboard(details, 'Payment details copied!')
}

// Check if clipboard is available
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && window.isSecureContext) || !!document.execCommand
}

// Copy with custom formatting
export async function copyWithFormat(
  data: any,
  formatter: (data: any) => string,
  successMessage?: string,
  errorMessage?: string
): Promise<boolean> {
  try {
    const formatted = formatter(data)
    return await copyToClipboard(formatted, successMessage, errorMessage)
  } catch (error) {
    console.error('Failed to format data:', error)
    toast.error('Failed to format data')
    return false
  }
}