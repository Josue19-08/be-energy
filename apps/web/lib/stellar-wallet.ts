"use client";

import {
  ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
  sep43Modules,
} from "@creit.tech/stellar-wallets-kit";
import { Horizon } from "@stellar/stellar-sdk";
import storage from "./storage";
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
      modules: sep43Modules(),
    });
  }

  return kitInstance;
}

export type MappedBalances = Record<string, Horizon.HorizonApi.BalanceLine>;

export const connectWallet = async (): Promise<void> => {
  const kit = getKit();
  await kit.openModal({
    modalTitle: "Conectar Wallet",
    onWalletSelected: (option: ISupportedWallet) => {
      const selectedId = option.id;
      kit.setWallet(selectedId);

      void kit.getAddress().then((address) => {
        if (address.address) {
          storage.setItem("walletId", selectedId);
          storage.setItem("walletAddress", address.address);
        } else {
          storage.setItem("walletId", "");
          storage.setItem("walletAddress", "");
        }
      });

      if (selectedId === "freighter" || selectedId === "hot-wallet") {
        void kit.getNetwork().then((network) => {
          if (network.network && network.networkPassphrase) {
            storage.setItem("walletNetwork", network.network);
            storage.setItem("networkPassphrase", network.networkPassphrase);
          } else {
            storage.setItem("walletNetwork", "");
            storage.setItem("networkPassphrase", "");
          }
        });
      }
    },
  });
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
