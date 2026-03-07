/**
 * Configuración de los contratos de BeEnergy
 *
 * IMPORTANTE: Actualiza estas direcciones después de deployar los contratos
 */

export const CONTRACTS = {
  // Energy token contract
  ENERGY_TOKEN: process.env.NEXT_PUBLIC_ENERGY_TOKEN_CONTRACT || "",

  // Distribution contract
  ENERGY_DISTRIBUTION: process.env.NEXT_PUBLIC_ENERGY_DISTRIBUTION_CONTRACT || "",

  // Governance contract
  COMMUNITY_GOVERNANCE: process.env.NEXT_PUBLIC_COMMUNITY_GOVERNANCE_CONTRACT || "",
}

export const STELLAR_CONFIG = {
  NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK || "TESTNET",
  RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org",
  HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
}

export const NETWORK_PASSPHRASE =
  STELLAR_CONFIG.NETWORK === "TESTNET"
    ? "Test SDF Network ; September 2015"
    : STELLAR_CONFIG.NETWORK === "LOCAL"
    ? "Standalone Network ; February 2017"
    : "Public Global Stellar Network ; September 2015"

export const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || ""
