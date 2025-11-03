"use client";

import {
  UmlClassIcon,
  UmlAssociationIcon,
  UmlAggregationIcon,
  UmlCompositionIcon,
  UmlGeneralizationIcon,
  UmlNoteIcon,
  UmlDependencyIcon,
  UmlRealizationIcon,
} from "@/components/custom/icons/UMLIcons";

import { useDiagramStore } from "@/store/diagram.store";
import {
  HomeIcon,
  SaveAllIcon,
  Hand,
  FileDown,
  FileJson,
  Bot,
  LogOut,
  Camera,
  Smartphone,
} from "lucide-react";
import { ChatInterface, type Message } from "@/components/chat/chat-interface";
import { useSocket } from "@/socket/useSocket";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useState } from "react";
import { RelationType } from "@/types/nodes/nodes";
import { useRouter } from "next/navigation";
import { getZip, getPostman } from "@/api/exports";
import { useAuthStore } from "@/store/auth.store";

// Elementos (nodos)
const nodeItems = [
  { title: "Clase", icon: UmlClassIcon, type: "class" },
  { title: "Nota", icon: UmlNoteIcon, type: "note" },
];

// Relaciones (edges)
const relationshipItems = [
  {
    title: "Asociación",
    icon: UmlAssociationIcon,
    type: "association" as RelationType,
  },
  {
    title: "Agregación",
    icon: UmlAggregationIcon,
    type: "aggregation" as RelationType,
  },
  {
    title: "Composición",
    icon: UmlCompositionIcon,
    type: "composition" as RelationType,
  },
  {
    title: "Herencia",
    icon: UmlGeneralizationIcon,
    type: "inheritance" as RelationType,
  },
  {
    title: "Realización",
    icon: UmlRealizationIcon,
    type: "realization" as RelationType,
  },
  {
    title: "Dependencia",
    icon: UmlDependencyIcon,
    type: "dependency" as RelationType,
  },
];

export function AppSidebar() {
  const addNode = useDiagramStore((state) => state.addNode);
  const setConnectionMode = useDiagramStore((state) => state.setConnectionMode);
  const currentConnectionMode = useDiagramStore(
    (state) => state.connectionMode
  );
  const saveDiagramToAPI = useDiagramStore((state) => state.saveDiagramToApi);
  const currentDiagramId = useDiagramStore((state) => state.currentDiagramId);
  const router = useRouter();

  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const setNodes = useDiagramStore((state) => state.setNodes);
  const setEdges = useDiagramStore((state) => state.setEdges);

  // Verificar si es colaborador (sin cuenta)
  const { isCollaborator, isAuthenticated, clearCollaboratorAccess } =
    useAuthStore();
  const isCollaboratorOnly = isCollaborator && !isAuthenticated;

  //socket
  const socket = useSocket();

  const handleInicio = () => {
    router.push("/home");
  };

  const handleSalirColaborador = () => {
    // Limpiar acceso de colaborador
    clearCollaboratorAccess();
    // Redirigir a la página de invitación
    router.push("/invitation");
  };

  const handleSave = async () => {
    await saveDiagramToAPI(currentDiagramId!);
  };

  const handleExportSpringBoot = async () => {
    const res = await getZip(currentDiagramId!);
    const url = window.URL.createObjectURL(new Blob([res]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "springboot_project.zip");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportPostman = async () => {
    const res = await getPostman(currentDiagramId!);
    const url = window.URL.createObjectURL(new Blob([res]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "postman_project.json");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleAddNode = (nodeType: string) => {
    setSelectedTool(null);
    setConnectionMode(null);
    addNode(nodeType);
  };

  const handleSelectRelationship = (relationType: RelationType) => {
    setSelectedTool(relationType);
    setConnectionMode(relationType);
  };

  const handleSelectPointer = () => {
    setSelectedTool(null);
    setConnectionMode(null);
  };

  //PARA ACTUALIZAR EN TIEMPO REAL EL DIAGRAMA DESDE UNA FOTO
  const handleDiagramGenerated = (diagram: any) => {
    // Actualizar el store del diagrama con el nuevo diagrama generado
    console.log('🎨 Frontend recibió diagrama:', diagram);
    console.log('📊 Nodos:', diagram.nodes?.length || 0);
    console.log('🔗 Edges:', diagram.edges?.length || 0);
    console.log('📋 Detalle edges:', diagram.edges);
    
    // Verificar el formato de cada edge
    if (diagram.edges && diagram.edges.length > 0) {
      console.log('🔍 Análisis de edges:');
      diagram.edges.forEach((edge: any, index: number) => {
        console.log(`  Edge ${index}:`, {
          id: edge.id,
          type: edge.type,
          source: edge.source,
          target: edge.target,
          data: edge.data,
          hasRequiredFields: !!(edge.id && edge.source && edge.target)
        });
      });
    }
    
    // Verificar el estado actual del store
    console.log('🔍 Estado actual del store:');
    console.log('  - Nodos en store:', nodes.length);
    console.log('  - Edges en store:', edges.length);
    
    setNodes(diagram.nodes || []);
    setEdges(diagram.edges || []);
    
    // Verificar el estado después de la actualización
    setTimeout(() => {
      console.log('✅ Estado después de actualización:');
      console.log('  - Nodos en store:', nodes.length);
      console.log('  - Edges en store:', edges.length);
    }, 100);
    
    // Opcional: mostrar notificación de éxito
    console.log('Diagrama generado exitosamente:', diagram);
  };



  const handleSubirFoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".jpg,.jpeg,.png";
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];

        // Convertir a base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Image = e.target?.result as string;

          console.log("📷 Enviando imagen al backend...", {
            name: file.name,
            type: file.type,
            size: file.size,
          });

          // Usar la instancia de socket ya existente
          if (socket) {
            socket.emit("process-diagram-image", {
              image: base64Image,
              diagramId: currentDiagramId,
              fileName: file.name,
            });

            // Escuchar la respuesta (solo una vez)
            socket.once("diagram-image-processed", (response) => {
              if (response.success) {
                console.log(
                  "✅ Diagrama generado desde imagen:",
                  response.diagram
                );
                handleDiagramGenerated(response.diagram);
              } else {
                console.error("❌ Error procesando imagen:", response.error);
                alert(`Error: ${response.error}`);
              }
            });
          } else {
            console.error("❌ Socket no conectado");
            alert("Error: No hay conexión con el servidor");
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
    setSelectedTool(null);
    setConnectionMode(null);
  };

  const handleGenerarFlutter = () => {
    console.log("Generar Flutter");
    setSelectedTool(null);
    setConnectionMode(null);
  };

  return (
    <Sidebar>
      <SidebarContent>
        {/* Herramienta de selección */}
        <SidebarGroup>
          <SidebarGroupLabel>Herramientas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={handleSelectPointer}
                    className={`w-full ${
                      selectedTool === null ? "bg-blue-100 border-blue-500" : ""
                    }`}
                  >
                    <Hand className="text-lg" />
                    <span>Seleccionar</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Elementos (Nodos) */}
        <SidebarGroup>
          <SidebarGroupLabel>Elementos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nodeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => handleAddNode(item.title)}
                      className={`w-full ${
                        selectedTool === item.type
                          ? "bg-blue-100 border-blue-500"
                          : ""
                      }`}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Relaciones (Edges) */}
        <SidebarGroup>
          <SidebarGroupLabel>Relaciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {relationshipItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => handleSelectRelationship(item.type)}
                      className={`w-full ${
                        selectedTool === item.type
                          ? "bg-blue-100 border-blue-500"
                          : ""
                      }`}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Acciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={handleSave} className="w-full">
                    <SaveAllIcon className="text-lg" />
                    <span>Guardar</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={handleExportSpringBoot} className="w-full">
                    <FileDown className="text-lg" />
                    <span>Exportar SpringBoot</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={handleExportPostman} className="w-full">
                    <FileJson className="text-lg" />
                    <span>Exportar Postman</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={handleSubirFoto} className="w-full">
                    <Camera className="text-lg" />
                    <span>Subir Foto Diagrama</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={handleGenerarFlutter} className="w-full">
                    <Smartphone className="text-lg" />
                    <span>Generar Flutter</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Solo mostrar botón "Volver" si NO es colaborador sin cuenta */}
              {!isCollaboratorOnly && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button onClick={handleInicio} className="w-full">
                      <HomeIcon className="text-lg" />
                      <span>Volver</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Mostrar botón "Salir" solo para colaboradores sin cuenta */}
              {isCollaboratorOnly && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button onClick={handleSalirColaborador} className="w-full">
                      <LogOut className="text-lg" />
                      <span>Salir</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
