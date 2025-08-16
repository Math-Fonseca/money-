import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Camera } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  profileImage: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfileProps {
  userData: { name: string; email: string; profileImage?: string };
  onUpdateProfile: (data: { name: string; email: string; profileImage?: string }) => void;
  onLogout: () => void;
}

export default function UserProfile({ userData, onUpdateProfile, onLogout }: UserProfileProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userData.name,
      email: userData.email,
      profileImage: userData.profileImage || "",
    },
  });

  const handleSubmit = (data: ProfileFormData) => {
    localStorage.setItem("userData", JSON.stringify(data));
    onUpdateProfile(data);
    setIsDialogOpen(false);
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram atualizadas com sucesso!",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("userData");
    onLogout();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso!",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-4">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-3 hover:bg-gray-100 rounded-lg p-2 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src={form.watch("profileImage") || userData.profileImage} alt={userData.name} />
              <AvatarFallback className="bg-primary text-white">
                {getInitials(userData.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{userData.name}</p>
              <p className="text-xs text-gray-500">{userData.email}</p>
            </div>
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={form.watch("profileImage") || userData.profileImage} alt={userData.name} />
                  <AvatarFallback className="bg-primary text-white text-lg">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  id="profile-image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Criar URL temporária para preview da imagem
                      const imageUrl = URL.createObjectURL(file);
                      form.setValue("profileImage", imageUrl);
                      toast({
                        title: "Foto carregada",
                        description: "Sua foto foi carregada! Clique em Salvar para confirmar.",
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 hover:bg-green-600 transition-colors"
                  onClick={() => {
                    document.getElementById('profile-image-upload')?.click();
                  }}
                >
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <p className="text-sm text-gray-500">Clique no ícone para alterar a foto</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Digite seu nome completo"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="Digite seu email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Salvar alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-gray-600 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">Sair</span>
      </Button>
    </div>
  );
}