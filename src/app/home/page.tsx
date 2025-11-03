"use client";

import type React from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { set, useForm } from "react-hook-form";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  UserPlus,
  LogOut,
  Clipboard,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { AuthenticatedRoute } from "@/components/auth/AuthenticatedRoute";
import { getDiagramsByUser } from "@/api/diagrams";
import { CreateDiagramDTO } from "@/types/diagrams/diagrams";
import {
  createDiagram,
  deleteDiagram,
  updateDiagram,
  bulkDeleteDiagrams,
} from "@/api/diagrams";
import { useSocket } from "@/socket/useSocket";

interface SearchForm {
  query: string;
}

interface DiagramForm {
  name: string;
  description: string;
  token?: string;
}

interface DeleteConfirmForm {
  confirm: boolean;
}

interface Diagram {
  id: number;
  name: string;
  description?: string;
  thumbnail: string;
  selected: boolean;
}

export default function DclassMigrator() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const socket = useSocket();

  const fetchDiagrams = async () => {
    // Verificar que el usuario esté disponible antes de hacer la llamada
    if (!user?.id) {
      console.warn("Usuario no disponible para cargar diagramas");
      return;
    }

    try {
      setIsLoadingDiagrams(true);
      const data = await getDiagramsByUser(user.id);
      console.log("Diagramas cargados:", data);
      setDiagrams(data);
    } catch (error) {
      console.error("Error al cargar diagramas:", error);
    } finally {
      setIsLoadingDiagrams(false);
    }
  };

  // useEffect que se ejecuta cuando el usuario está disponible
  useEffect(() => {
    if (user?.id) {
      fetchDiagrams();
    }
  }, [user?.id]); // Dependencia del user.id

  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoadingDiagrams, setIsLoadingDiagrams] = useState(false);

  const [btnVisibility, setBtnVisibility] = useState("visible");

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    diagramId: number;
  } | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDiagram, setEditingDiagram] = useState<Diagram | null>(null);
  const [deletingDiagram, setDeletingDiagram] = useState<Diagram | null>(null);
  const [isAddCollaboratorDialogOpen, setIsAddCollaboratorDialogOpen] =
    useState(false);
  const [collaboratorDiagram, setCollaboratorDiagram] =
    useState<Diagram | null>(null);

  const { register, handleSubmit, watch } = useForm<SearchForm>();
  const searchQuery = watch("query", "");

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
  } = useForm<DiagramForm>();
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
  } = useForm<DiagramForm>();
  const {
    register: registerDelete,
    handleSubmit: handleSubmitDelete,
    reset: resetDelete,
  } = useForm<DeleteConfirmForm>();

  const {
    register: registerCollaborator,
    handleSubmit: handleSubmitCollaborator,
    reset: resetCollaborator,
    setValue: setCollaboratorValue,
    watch: watchCollaborator,
  } = useForm<DiagramForm>();

  const filteredDiagrams = diagrams.filter((diagram) =>
    diagram.name.toLowerCase().includes(searchQuery?.toLowerCase() || "")
  );

  const selectedCount = diagrams.filter((d) => d.selected).length;

  const onSearch = (data: SearchForm) => {
    console.log("Searching for:", data.query);
  };

  const onAddDiagram = async (data: DiagramForm) => {
    if (!user?.id) {
      console.error("Usuario no disponible para crear diagrama");
      return;
    }

    try {
      const newDiagram: CreateDiagramDTO = {
        name: data.name,
        description: data.description,
        ownerId: user.id,
        model: JSON.parse("{}"),
      };
      console.log("Adding diagram:", newDiagram);
      const res = await createDiagram(newDiagram);
      console.log("Diagrama creado:", res);
      await fetchDiagrams(); // Recargar diagramas
      setIsAddDialogOpen(false);
      resetAdd();
    } catch (error) {
      console.error("Error al crear diagrama:", error);
    }
  };

  const onEditDiagram = async (data: DiagramForm) => {
    if (editingDiagram) {
      try {
        const res = await updateDiagram(editingDiagram.id.toString(), {
          name: data.name,
          description: data.description,
        });
        console.log("Diagrama actualizado:", res);
        await fetchDiagrams();
        setIsEditDialogOpen(false);
        setEditingDiagram(null);
        resetEdit();
      } catch (error) {
        console.error("Error al actualizar diagrama:", error);
      }
    }
  };

  const onDeleteDiagram = async (data: DeleteConfirmForm) => {
    if (deletingDiagram && data.confirm) {
      try {
        const res = await deleteDiagram(deletingDiagram.id.toString());
        console.log("Diagrama eliminado:", res);
        await fetchDiagrams();
        setIsDeleteDialogOpen(false);
        setDeletingDiagram(null);
        resetDelete();
      } catch (error) {
        console.error("Error al eliminar diagrama:", error);
      }
    }
  };

  const onCollaboratorDiagram = async (
    e?: React.FormEvent<HTMLFormElement>
  ) => {
    e?.preventDefault();
    if (collaboratorDiagram) {
      try {
        // Limpiar estado previo antes de generar nuevo token
        setCollaboratorValue("token", "");
        setBtnVisibility("visible");
        
        // Limpiar listener previo para evitar duplicados
        socket?.off("invite-created");
        
        socket?.emit("generate-invite", { diagramId: collaboratorDiagram.id });
        setIsAddCollaboratorDialogOpen(true);
        setCollaboratorDiagram(collaboratorDiagram);
        socket?.on("invite-created", (data: { token: string }) => {
          setCollaboratorValue("token", data.token); // Actualiza el input
          setBtnVisibility("hidden");
        });
      } catch (error) {
        console.error("Error al agregar colaborador:", error);
      }
    }
  };

  const toggleSelection = (id: number) => {
    setDiagrams((prev) => {
      const updatedDiagrams = prev.map((d) =>
        d.id === id ? { ...d, selected: !d.selected } : d
      );

      // Imprimir información del diagrama que se está toggleando
      const toggledDiagram = updatedDiagrams.find((d) => d.id === id);
      console.log("🔄 Diagrama toggleado:", {
        id: id,
        name: toggledDiagram?.name,
        selected: toggledDiagram?.selected,
      });

      // Imprimir todos los diagramas seleccionados actualmente
      const selectedDiagrams = updatedDiagrams.filter((d) => d.selected);
      console.log(
        "✅ Diagramas seleccionados:",
        selectedDiagrams.map((d) => ({
          id: d.id,
          name: d.name,
        }))
      );

      // Imprimir conteo de seleccionados
      console.log("📊 Total seleccionados:", selectedDiagrams.length);

      return updatedDiagrams;
    });
  };

  const selectAll = () => {
    const allSelected = diagrams.every((d) => d.selected);
    console.log(
      "🔄 Select All - Estado actual:",
      allSelected ? "Todos seleccionados" : "No todos seleccionados"
    );

    setDiagrams((prev) => {
      const updatedDiagrams = prev.map((d) => ({
        ...d,
        selected: !allSelected,
      }));

      // Imprimir resultado de la operación
      const selectedCount = updatedDiagrams.filter((d) => d.selected).length;
      console.log(
        `📊 Después de Select All: ${selectedCount}/${updatedDiagrams.length} diagramas seleccionados`
      );

      if (!allSelected) {
        console.log(
          "✅ Todos los diagramas seleccionados:",
          updatedDiagrams.map((d) => ({
            id: d.id,
            name: d.name,
          }))
        );
      } else {
        console.log("❌ Todos los diagramas deseleccionados");
      }

      return updatedDiagrams;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, diagramId: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, diagramId });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleAction = (action: string, diagramId?: number) => {
    console.log(
      `Action: ${action}`,
      diagramId ? `on diagram ${diagramId}` : ""
    );

    if (action === "add") {
      setIsAddDialogOpen(true);
    } else if (action === "edit" && diagramId) {
      const diagram = diagrams.find((d) => d.id === diagramId);
      if (diagram) {
        setEditingDiagram(diagram);
        setEditValue("name", diagram.name);
        setEditValue("description", diagram.description || "");
        setIsEditDialogOpen(true);
      }
    } else if (action === "delete" && diagramId) {
      const diagram = diagrams.find((d) => d.id === diagramId);
      if (diagram) {
        setDeletingDiagram(diagram);
        setIsDeleteDialogOpen(true);
      }
    } else if (action === "logout") {
      logout();
      router.push("/");
    } else if (action === "collaborate" && diagramId) {
      setIsAddCollaboratorDialogOpen(true);
      const diagram = diagrams.find((d) => d.id === diagramId);
      if (diagram) {
        setCollaboratorDiagram(diagram);
      }
    }

    closeContextMenu();
  };

  const deleteSelected = async () => {
    const selectedDiagrams = diagrams.filter((d) => d.selected);
    const remainingDiagrams = diagrams.filter((d) => !d.selected);

    console.log(
      "🗑️ Eliminando diagramas seleccionados:",
      selectedDiagrams.map((d) => ({
        id: d.id,
        name: d.name,
      }))
    );
    console.log("📊 Diagramas que permanecerán:", remainingDiagrams.length);

    if (selectedDiagrams.length === 0) {
      console.log("⚠️ No hay diagramas seleccionados para eliminar.");
      return;
    }
    try {
      const idsToDelete = selectedDiagrams.map((d) => d.id.toString());
      const res = await bulkDeleteDiagrams(idsToDelete);
      console.log("🗑️ Diagramas eliminados:", res);
    } catch (error) {
      console.error("Error al eliminar diagramas:", error);
    }

    setDiagrams((prev) => prev.filter((d) => !d.selected));
    setIsSelectionMode(false);

    console.log("✅ Operación de eliminación completada");
  };

  return (
    <AuthenticatedRoute>
      <div
        className="min-h-screen bg-background p-6"
        onClick={closeContextMenu}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                DClass Migrator
              </h1>
              <p className="text-xl text-muted-foreground">
                Estos son tus Diagramas
              </p>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-lg font-medium text-foreground">
                  Bienvenido, {user.username}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            )}
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-4 mb-8">
            <form onSubmit={handleSubmit(onSearch)} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("query")}
                  placeholder="Buscar Diagramas"
                  className="pl-10"
                />
              </div>
            </form>

            <div className="flex items-center gap-2">
              <Button onClick={() => handleAction("add")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>

              <Button
                variant={isSelectionMode ? "default" : "outline"}
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                size="sm"
              >
                Seleccionar
              </Button>

              {isSelectionMode && selectedCount > 0 && (
                <Button
                  variant="destructive"
                  onClick={deleteSelected}
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar ({selectedCount})
                </Button>
              )}
            </div>
          </div>

          {/* Selection Controls */}
          {isSelectionMode && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={
                    diagrams.length > 0 && diagrams.every((d) => d.selected)
                  }
                  onCheckedChange={selectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Seleccionar todos ({selectedCount}/{diagrams.length})
                </label>
              </div>
            </div>
          )}

          {/* Diagrams Grid */}
          {isLoadingDiagrams ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando diagramas...</p>
              </div>
            </div>
          ) : filteredDiagrams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground mb-4">
                No tienes diagramas aún
              </p>
              <Button onClick={() => handleAction("add")}>
                <Plus className="h-4 w-4 mr-2" />
                Crear tu primer diagrama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {filteredDiagrams.map((diagram) => (
                <Card
                  key={diagram.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    diagram.selected ? "ring-2 ring-primary" : ""
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, diagram.id)}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelection(diagram.id);
                    } else {
                      // Navegar al diagrama específico con su ID
                      router.push(`/diagram?id=${diagram.id}`);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="relative">
                      {isSelectionMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={diagram.selected}
                            onCheckedChange={() => toggleSelection(diagram.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        <img
                          src={diagram.thumbnail}
                          alt={diagram.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground">
                          {diagram.name}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction("edit", diagram.id);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction("collaborate", diagram.id);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Agregar Colaborador
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction("delete", diagram.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="fixed bg-popover border border-border rounded-md shadow-lg py-2 z-50"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center"
                onClick={() => handleAction("edit", contextMenu.diagramId)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center"
                onClick={() =>
                  handleAction("collaborate", contextMenu.diagramId)
                }
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Colaborador
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center text-destructive"
                onClick={() => handleAction("delete", contextMenu.diagramId)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </button>
            </div>
          )}

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Diagrama</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitAdd(onAddDiagram)}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-name" className="text-right">
                      Nombre
                    </Label>
                    <Input
                      id="add-name"
                      {...registerAdd("name", { required: true })}
                      className="col-span-3"
                      placeholder="Nombre del diagrama"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-description" className="text-right">
                      Descripción
                    </Label>
                    <Textarea
                      id="add-description"
                      {...registerAdd("description", { required: true })}
                      className="col-span-3"
                      placeholder="Descripción del diagrama"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Crear Diagrama</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Diagrama</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitEdit(onEditDiagram)}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">
                      Nombre
                    </Label>
                    <Input
                      id="edit-name"
                      {...registerEdit("name", { required: true })}
                      className="col-span-3"
                      placeholder="Nombre del diagrama"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">
                      Descripción
                    </Label>
                    <Textarea
                      id="edit-description"
                      {...registerEdit("description", { required: true })}
                      className="col-span-3"
                      placeholder="Descripción del diagrama"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar Cambios</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitDelete(onDeleteDiagram)}>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    ¿Estás seguro de que deseas eliminar el diagrama "
                    {deletingDiagram?.name}"? Esta acción no se puede deshacer.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirm-delete"
                      {...registerDelete("confirm", { required: true })}
                    />
                    <Label htmlFor="confirm-delete" className="text-sm">
                      Sí, estoy seguro de eliminar este diagrama
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="destructive">
                    Eliminar Diagrama
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isAddCollaboratorDialogOpen}
            onOpenChange={(open) => {
              setIsAddCollaboratorDialogOpen(open);
              if (!open) {
                // Limpiar estado cuando se cierra el modal
                setCollaboratorValue("token", "");
                setBtnVisibility("visible");
                setCollaboratorDiagram(null);
                resetCollaborator();
                // Limpiar listener de socket
                socket?.off("invite-created");
              }
            }}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Invitar Colaborador
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-2">
                  Comparte este enlace con la persona que quieres invitar al diagrama. 
                  Ella podrá acceder sin necesidad de crear una cuenta.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCollaboratorDiagram}>
                <div className="space-y-6">
                  {/* Sección de información del diagrama */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Diagrama: {collaboratorDiagram?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {collaboratorDiagram?.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sección de enlace de invitación */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                      <Label className="text-sm font-medium text-gray-900">
                        Enlace de invitación
                      </Label>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">
                        Comparte este enlace con tu colaborador:
                      </p>
                      <p className="text-sm font-mono text-blue-600 break-all">
                        http://localhost:3000/invitation
                      </p>
                    </div>
                  </div>

                  {/* Sección de token */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                      <Label className="text-sm font-medium text-gray-900">
                        Token de acceso
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="token"
                        type="text"
                        placeholder="Haz clic en 'Generar Token' para crear un enlace de invitación..."
                        className="flex-1 font-mono text-sm"
                        {...registerCollaborator("token")}
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                        onClick={() => {
                          const token = watchCollaborator("token");
                          if (token) {
                            navigator.clipboard.writeText(token);
                            // Aquí podrías agregar una notificación de éxito
                          } else {
                            navigator.clipboard.writeText("No hay token disponible");
                          }
                        }}
                        aria-label="Copiar token"
                      >
                        <Clipboard className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setIsAddCollaboratorDialogOpen(false);
                      // Limpiar estado al cancelar
                      setCollaboratorValue("token", "");
                      setBtnVisibility("visible");
                      setCollaboratorDiagram(null);
                      resetCollaborator();
                      // Limpiar listener de socket
                      socket?.off("invite-created");
                    }}
                  >
                    Cerrar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                    style={{ visibility: btnVisibility as any }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generar Token
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Footer */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => handleAction("logout")}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  );
}
