import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';

interface ConfettiContextType {
  triggerConfetti: () => void;
}

const ConfettiContext = createContext<ConfettiContextType | undefined>(undefined);

export const ConfettiProvider = ({ children }: { children: ReactNode }) => {
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const { width, height } = useWindowSize();

  const triggerConfetti = useCallback(() => {
    setIsConfettiActive(true);
    // Desativa após 3 segundos
    setTimeout(() => {
      setIsConfettiActive(false);
    }, 3000);
  }, []);

  return (
    <ConfettiContext.Provider value={{ triggerConfetti }}>
      {isConfettiActive && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
      )}
      {children}
    </ConfettiContext.Provider>
  );
};

export const useConfetti = (): ConfettiContextType => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error('useConfetti must be used within a ConfettiProvider');
  }
  return context;
};
