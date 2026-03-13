import { createContext, useContext, useState, type ReactNode } from "react";
import { type HorarioId, HORARIOS, type HorarioConfig } from "@/data/schedule";

interface HorarioContextValue {
  horarioId: HorarioId;
  horario: HorarioConfig;
  setHorarioId: (id: HorarioId) => void;
}

const HorarioContext = createContext<HorarioContextValue | null>(null);

export function HorarioProvider({ children }: { children: ReactNode }) {
  const [horarioId, setHorarioIdState] = useState<HorarioId>(() => {
    const stored = sessionStorage.getItem("selected-horario") as HorarioId | null;
    return stored && HORARIOS[stored] ? stored : "TEMUCO";
  });

  function setHorarioId(id: HorarioId) {
    sessionStorage.setItem("selected-horario", id);
    setHorarioIdState(id);
  }

  return (
    <HorarioContext.Provider value={{ horarioId, horario: HORARIOS[horarioId], setHorarioId }}>
      {children}
    </HorarioContext.Provider>
  );
}

export function useHorario() {
  const ctx = useContext(HorarioContext);
  if (!ctx) throw new Error("useHorario must be used inside HorarioProvider");
  return ctx;
}
