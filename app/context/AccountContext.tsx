import React, { createContext, useContext, useEffect, useState } from "react";

interface AccountInfo {
  id: string;
  name: string;
  createdAt: string;
}

interface AccountContextValue {
  account: AccountInfo | null;
  loading: boolean;
  refreshAccount: () => Promise<AccountInfo | null>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshAccount() {
    const response = await fetch("/api/account");
    const data = (await response.json()) as { account?: AccountInfo };
    const nextAccount = data.account ?? null;
    setAccount(nextAccount);
    return nextAccount;
  }

  useEffect(() => {
    let cancelled = false;

    refreshAccount()
      .catch(() => {
        if (cancelled) return;
        setAccount(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AccountContext.Provider value={{ account, loading, refreshAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return ctx;
}
