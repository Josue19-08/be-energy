import { WalletNetwork } from "@creit.tech/stellar-wallets-kit";

export type NetworkType = "mainnet" | "testnet" | "futurenet" | "custom";

export interface Network {
  id: NetworkType;
  label: string;
  passphrase: string;
  rpcUrl: string;
  horizonUrl: string;
}

// Get environment variables with fallbacks for local development
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof window === "undefined") {
    return process.env[key] ?? fallback;
  }
  return (process.env[key] as string) ?? fallback;
};

export const stellarNetwork = getEnvVar("NEXT_PUBLIC_STELLAR_NETWORK", "TESTNET") as
  | "PUBLIC"
  | "FUTURENET"
  | "TESTNET"
  | "LOCAL";

export const networkPassphrase = getEnvVar(
  "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE",
  WalletNetwork.TESTNET
);

export const rpcUrl = getEnvVar(
  "NEXT_PUBLIC_STELLAR_RPC_URL",
  "https://soroban-testnet.stellar.org"
);

export const horizonUrl = getEnvVar(
  "NEXT_PUBLIC_STELLAR_HORIZON_URL",
  "https://horizon-testnet.stellar.org"
);

const networkToId = (network: string): NetworkType => {
  switch (network) {
    case "PUBLIC":
      return "mainnet";
    case "TESTNET":
      return "testnet";
    case "FUTURENET":
      return "futurenet";
    default:
      return "custom";
  }
};

export const network: Network = {
  id: networkToId(stellarNetwork),
  label: stellarNetwork.toLowerCase(),
  passphrase: networkPassphrase,
  rpcUrl: rpcUrl,
  horizonUrl: horizonUrl,
};

export function getHorizonHost(mode: string): string {
  switch (mode) {
    case "LOCAL":
      return "http://localhost:8000";
    case "FUTURENET":
      return "https://horizon-futurenet.stellar.org";
    case "TESTNET":
      return "https://horizon-testnet.stellar.org";
    case "PUBLIC":
      return "https://horizon.stellar.org";
    default:
      return "https://horizon-testnet.stellar.org";
  }
}

export function getRpcHost(mode: string): string {
  switch (mode) {
    case "LOCAL":
      return "http://localhost:8000/rpc";
    case "FUTURENET":
      return "https://rpc-futurenet.stellar.org";
    case "TESTNET":
      return "https://soroban-testnet.stellar.org";
    case "PUBLIC":
      return "https://soroban.stellar.org";
    default:
      return "https://soroban-testnet.stellar.org";
  }
}