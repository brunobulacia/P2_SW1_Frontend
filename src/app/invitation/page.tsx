"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { getDiagramByInvitationToken } from "@/api/invitations";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useState } from "react";

interface InvitationForm {
  token: string;
}

export default function InvitationPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<InvitationForm>();
  const { setCollaboratorAccess } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (data: InvitationForm) => {
    console.log("Unirse al diagrama", data);
    setIsLoading(true);
    setError(null);

    try {
      // Validar que no sea una URL
      if (data.token.includes('http://') || data.token.includes('https://')) {
        throw new Error("Por favor ingresa solo el token, no la URL completa");
      }

      const diagram = await getDiagramByInvitationToken(data.token);
      console.log("Diagrama obtenido:", diagram);
      
      if (diagram && diagram.id) {
        // Establecer acceso de colaborador en el store
        setCollaboratorAccess(data.token, diagram.id);
        
        // Redirigir al diagrama
        router.push(`/diagram/?id=${diagram.id}`);
      }
    } catch (error: any) {
      console.error("Error al unirse al diagrama:", error);
      setError(error.message || "Token inválido. Verifica que hayas ingresado el token correcto.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Token de invitación al diagrama</CardTitle>
          <CardDescription>
            Ingrese <strong>solo el token</strong> que ha recibido para unirse al diagrama.
            <br />
            <span className="text-xs text-gray-500 mt-1 block">
              ⚠️ No ingrese la URL completa, solo el código del token
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="token">Token de acceso</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="ej: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  required
                  {...register("token", {
                    required: "El token es requerido",
                    validate: (value) => {
                      if (value.includes('http://') || value.includes('https://')) {
                        return "Ingresa solo el token, no la URL completa";
                      }
                      return true;
                    }
                  })}
                />
                {errors.token && (
                  <p className="text-sm text-red-600">{errors.token.message}</p>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            onClick={handleSubmit(handleAction)}
            disabled={isLoading}
          >
            {isLoading ? "Verificando..." : "Unirse al diagrama"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
