'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderContextValue {
  leftSlot: ReactNode;
  setLeftSlot: (slot: ReactNode) => void;
}

const HeaderContext = createContext<HeaderContextValue>({
  leftSlot: null,
  setLeftSlot: () => {},
});

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [leftSlot, setLeftSlot] = useState<ReactNode>(null);
  return (
    <HeaderContext.Provider value={{ leftSlot, setLeftSlot }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderSlot() {
  return useContext(HeaderContext);
}
