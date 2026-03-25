import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a fully-qualified Stellar Expert transaction URL for the given
 * transaction hash, targeting the network configured via
 * NEXT_PUBLIC_STELLAR_NETWORK.
 *
 * Defaults to testnet when the variable is absent or unrecognised.
 */
export function getStellarExpertUrl(txHash: string): string {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK
  const explorer =
    network === "MAINNET"
      ? "https://stellar.expert/explorer/public/tx/"
      : "https://stellar.expert/explorer/testnet/tx/"
  return `${explorer}${txHash}`
}

export function generateIdenticon(address: string): string {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 65%, 55%)`
}
