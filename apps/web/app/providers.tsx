"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { useState } from "react";

const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: {
    name: "Somnia Test Token",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://api.infra.testnet.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://shannon-explorer.somnia.network",
    },
  },
  testnet: true,
});

export const chain = somniaTestnet;

function makeConfig() {
  return createConfig({
    chains: [somniaTestnet],
    connectors: [injected()],
    transports: {
      [somniaTestnet.id]: http(),
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(() => makeConfig());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#d4a843",
            accentColorForeground: "#1a1612",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
