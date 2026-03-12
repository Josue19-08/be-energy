"use client";

import {
  ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
} from "@creit.tech/stellar-wallets-kit";
import { Horizon } from "@stellar/stellar-sdk";
import { storage } from "./storage"
import { networkPassphrase, stellarNetwork, getHorizonHost } from "./stellar-config";

// Initialize Stellar Wallets Kit
let kitInstance: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (typeof window === "undefined") {
    throw new Error("StellarWalletsKit can only be initialized in the browser");
  }

  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: networkPassphrase as WalletNetwork,
      modules: allowAllModules(),
    });
  }

  return kitInstance;
}

export type MappedBalances = Record<string, Horizon.HorizonApi.BalanceLine>;

export interface ConnectResult {
  address: string
  network: string
}

export const connectWallet = async (): Promise<ConnectResult | null> => {
  const kit = getKit();
  let resolveResult: (r: ConnectResult | null) => void;
  const resultPromise = new Promise<ConnectResult | null>((resolve) => {
    resolveResult = resolve;
  });

  await kit.openModal({
    modalTitle: "Conectar Wallet",
    onWalletSelected: (option: ISupportedWallet) => {
      const selectedId = option.id;
      kit.setWallet(selectedId);

      kit.getAddress().then(async (addrResult) => {
        if (!addrResult.address) {
          storage.setItem("walletId", "");
          storage.setItem("walletAddress", "");
          resolveResult(null);
          return;
        }

        storage.setItem("walletId", selectedId);
        storage.setItem("walletAddress", addrResult.address);

        let networkStr = "";
        try {
          const netResult = await kit.getNetwork();
          networkStr = netResult.network || "";
          storage.setItem("walletNetwork", networkStr);
          storage.setItem("networkPassphrase", netResult.networkPassphrase || "");
        } catch {
          // Wallet doesn't support getNetwork — use configured defaults
          storage.setItem("walletNetwork", stellarNetwork);
          storage.setItem("networkPassphrase", networkPassphrase);
        }

        resolveResult({ address: addrResult.address, network: networkStr });
      }).catch(() => {
        resolveResult(null);
      });
    },
  });

  return resultPromise;
};

export const disconnectWallet = async (): Promise<void> => {
  const kit = getKit();
  await kit.disconnect();
  storage.removeItem("walletId");
  storage.removeItem("walletAddress");
  storage.removeItem("walletNetwork");
  storage.removeItem("networkPassphrase");
};

// Create Horizon server instance
const horizon = new Horizon.Server(getHorizonHost(stellarNetwork), {
  allowHttp: stellarNetwork === "LOCAL",
});

const formatter = new Intl.NumberFormat();

export const fetchBalances = async (address: string): Promise<MappedBalances> => {
  try {
    const { balances } = await horizon.accounts().accountId(address).call();
    const mapped = balances.reduce((acc, b) => {
      b.balance = formatter.format(Number(b.balance));
      const key =
        b.asset_type === "native"
          ? "xlm"
          : b.asset_type === "liquidity_pool_shares"
            ? b.liquidity_pool_id
            : `${b.asset_code}:${b.asset_issuer}`;
      acc[key] = b;
      return acc;
    }, {} as MappedBalances);
    return mapped;
  } catch (err) {
    if (!(err instanceof Error && err.message.match(/not found/i))) {
      console.error(err);
    }
    return {};
  }
};

export const wallet = () => getKit();