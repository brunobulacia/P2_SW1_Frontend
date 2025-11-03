"use client";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Participant {
  socketId: string;
  userId?: string;
  username?: string;
  joinedAt: string;
}

interface ActiveParticipantsProps {
  diagramId: string;
  className?: string;
}

export function ActiveParticipants({ diagramId, className = "" }: ActiveParticipantsProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  
  // Debug: mostrar siempre el componente
  // console.log("🎨 ActiveParticipants: Renderizando con diagramId:", diagramId);
  // console.log("🎨 ActiveParticipants: Participantes actuales:", participants.length);

  useEffect(() => {
    const socket = getSocket();
    // console.log("🔌 ActiveParticipants: Socket conectado:", socket.connected);
    // console.log("🔌 ActiveParticipants: DiagramId:", diagramId);

    const handleParticipantsUpdate = (data: { participants: Participant[] }) => {
      // console.log("👥 ActiveParticipants: Recibida actualización de participantes:", data);
      setParticipants(data.participants || []);
    };

    const handleDisconnect = () => {
      // console.log("🔌 ActiveParticipants: Socket desconectado");
      // Limpiar participantes cuando se desconecta
      setParticipants([]);
    };

    const handleReconnect = () => {
      // console.log("🔌 ActiveParticipants: Socket reconectado");
      // Solicitar participantes nuevamente al reconectar
      socket.emit("get-participants", { diagramId });
    };

    // Escuchar actualizaciones de participantes
    socket.on("participants-updated", handleParticipantsUpdate);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleReconnect);

    // Solicitar lista inicial de participantes
    // console.log("🔌 ActiveParticipants: Solicitando participantes para diagrama:", diagramId);
    socket.emit("get-participants", { diagramId });

    // Configurar heartbeat para mantener la conexión activa
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("heartbeat", { diagramId });
      }
    }, 30000); // Cada 30 segundos

    return () => {
      clearInterval(heartbeatInterval);
      socket.off("participants-updated", handleParticipantsUpdate);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleReconnect);
    };
  }, [diagramId]);

  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinTime = (joinedAt: string) => {
    const date = new Date(joinedAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "ahora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Debug: Indicador visual temporal */}
      <div className="absolute -top-2 -left-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
      
      {/* Botón para mostrar/ocultar participantes */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg shadow-lg text-sm transition-colors"
      >
        <div className="flex -space-x-1">
          {participants.length > 0 ? (
            participants.slice(0, 3).map((participant, index) => (
              <Avatar key={participant.socketId} className="h-6 w-6 border-2 border-white">
                <AvatarFallback className="text-xs bg-blue-500 text-white">
                  {getInitials(participant.username || "U")}
                </AvatarFallback>
              </Avatar>
            ))
          ) : (
            <div className="h-6 w-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center">
              <span className="text-xs text-white font-medium">0</span>
            </div>
          )}
          {participants.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                +{participants.length - 3}
              </span>
            </div>
          )}
        </div>
        <span className="font-medium">
          {participants.length} {participants.length === 1 ? "participante" : "participantes"}
        </span>
      </button>

      {/* Lista de participantes */}
      {isVisible && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">
              Participantes activos
            </h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {participants.length > 0 ? (
              participants.map((participant) => (
                <div
                  key={participant.socketId}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500 text-white text-sm">
                      {getInitials(participant.username || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {participant.username || `Usuario ${participant.socketId.slice(0, 6)}`}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatJoinTime(participant.joinedAt)}
                      </Badge>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No hay participantes activos
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
