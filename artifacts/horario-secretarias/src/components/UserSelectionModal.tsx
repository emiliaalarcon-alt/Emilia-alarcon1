import { useState, useEffect } from "react";
import { Users, UserCircle2, ShieldCheck, LogIn } from "lucide-react";
import { useCurrentUser, UserAvatar, USER_COLORS, type CurrentUser } from "@/context/UserContext";
import { useHorario } from "@/context/HorarioContext";
import { apiUrl } from "@/lib/api";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  horarioId: string;
  color: string;
}

const ROLE_LABELS: Record<string, string> = {
  secretaria: "Secretaria",
  admin: "Administrador",
  invitado: "Invitado",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  secretaria: UserCircle2,
  admin: ShieldCheck,
  invitado: LogIn,
};

export default function UserSelectionModal() {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const { horarioId, horario } = useHorario();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(!currentUser);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(apiUrl(`/api/team?horarioId=${horarioId}`))
      .then(r => r.json())
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [open, horarioId]);

  useEffect(() => {
    if (!currentUser) setOpen(true);
  }, [currentUser]);

  if (!open) return null;

  const handleSelect = (member: TeamMember) => {
    setCurrentUser({
      id: member.id,
      name: member.name,
      role: member.role as CurrentUser["role"],
      horarioId: member.horarioId,
      color: member.color,
    });
    setOpen(false);
  };

  const handleGuest = () => {
    setCurrentUser({
      id: null,
      name: "Invitado",
      role: "invitado",
      horarioId,
      color: "slate",
    });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">¿Quién eres?</h2>
            <p className="text-sm text-muted-foreground mt-1">{horario.label}</p>
          </div>

          {/* Members list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <p>No hay usuarios configurados.</p>
              <p className="text-xs mt-1">El admin puede agregarlos en la sección Admin → Equipo.</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {members.map((member) => {
                const c = USER_COLORS[member.color] ?? USER_COLORS.violet;
                const Icon = ROLE_ICONS[member.role] ?? UserCircle2;
                return (
                  <button
                    key={member.id}
                    onClick={() => handleSelect(member)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${c.light} border-transparent hover:border-current/20`}
                  >
                    <UserAvatar name={member.name} color={member.color} size="md" />
                    <div className="flex-1 text-left">
                      <div className={`font-semibold text-sm ${c.text}`}>{member.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        {ROLE_LABELS[member.role] ?? member.role}
                      </div>
                    </div>
                    <LogIn className={`w-4 h-4 ${c.text} opacity-60`} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Guest option */}
          <button
            onClick={handleGuest}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
              <UserCircle2 className="w-5 h-5 text-slate-500" />
            </div>
            <span className="text-sm font-medium">Entrar como Invitado</span>
          </button>
        </div>
      </div>
    </div>
  );
}
