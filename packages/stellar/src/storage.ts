/**
 * Typed wrapper around localStorage for wallet data persistence
 */

type Schema = {
  walletId: string;
  walletAddress: string;
  walletNetwork: string;
  networkPassphrase: string;
};

class TypedStorage<T> {
  private readonly storage: Storage | null;

  constructor() {
    this.storage = typeof window !== "undefined" ? localStorage : null;
  }

  public get length(): number {
    return this.storage?.length ?? 0;
  }

  public key<U extends keyof T>(index: number): U {
    return this.storage?.key(index) as U;
  }

  public getItem<U extends keyof T>(
    key: U,
    retrievalMode: "fail" | "raw" | "safe" = "fail"
  ): T[U] | null {
    const item = this.storage?.getItem(key.toString());

    if (item == null) {
      return item as null;
    }

    try {
      return JSON.parse(item) as T[U];
    } catch (error) {
      switch (retrievalMode) {
        case "safe":
          return null;
        case "raw":
          return item as unknown as T[U];
        default:
          throw error;
      }
    }
  }

  public setItem<U extends keyof T>(key: U, value: T[U]): void {
    this.storage?.setItem(key.toString(), JSON.stringify(value));
  }

  public removeItem<U extends keyof T>(key: U): void {
    this.storage?.removeItem(key.toString());
  }

  public clear(): void {
    this.storage?.clear();
  }
}

export const storage = new TypedStorage<Schema>();