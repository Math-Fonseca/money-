import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  icon: z.string().min(1, "Ícone é obrigatório"),
  color: z.string().min(1, "Cor é obrigatória"),
  type: z.enum(["income", "expense"]),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const incomeIcons = [
  "💰", "💵", "💸", "🏦", "💎", "🎁", "💳", "🪙", 
  "📊", "📈", "💹", "🚇", "🍽️", "💻", "🎯", "⚡"
];

const expenseIcons = [
  "🍔", "🚗", "🏠", "🏥", "📚", "🎭", "👕", "📄", 
  "📦", "⚡", "🛒", "🎮", "🎬", "🏃", "💊", "🔧"
];

const colors = [
  "#EF4444", "#F59E0B", "#10B981", "#2563EB", "#8B5CF6", 
  "#EC4899", "#06B6D4", "#84CC16", "#6B7280", "#F97316",
  "#14B8A6", "#3B82F6", "#7C3AED", "#DB2777", "#0EA5E9"
];

interface CategoryManagerProps {
  categories: Array<{ id: string; name: string; icon: string; color: string; type: string }>;
}

export default function CategoryManager({ categories }: CategoryManagerProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      type: "expense",
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Categoria criada",
        description: "A categoria foi criada com sucesso!",
      });
      form.reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar categoria. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  const selectedType = form.watch("type");
  const availableIcons = selectedType === "income" ? incomeIcons : expenseIcons;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gerenciar Categorias</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Criar Nova Categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Categoria</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(value) => form.setValue("type", value as "income" | "expense")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Ex: Freelances"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label>Escolha um Ícone</Label>
                <div className="grid grid-cols-8 gap-2 p-3 border rounded-md max-h-32 overflow-y-auto">
                  {availableIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`p-2 text-xl rounded hover:bg-gray-100 ${
                        form.watch("icon") === icon ? "bg-blue-100 border-2 border-blue-500" : "border"
                      }`}
                      onClick={() => form.setValue("icon", icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                {form.formState.errors.icon && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.icon.message}</p>
                )}
              </div>

              <div>
                <Label>Escolha uma Cor</Label>
                <div className="grid grid-cols-5 gap-2 p-3 border rounded-md">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-10 h-10 rounded-full border-2 ${
                        form.watch("color") === color ? "border-gray-800" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => form.setValue("color", color)}
                    />
                  ))}
                </div>
                {form.formState.errors.color && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.color.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending}>
                  {createCategoryMutation.isPending ? "Criando..." : "Criar Categoria"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Categorias de Receita</h4>
          <div className="space-y-2">
            {categories.filter(c => c.type === "income").map((category) => (
              <div key={category.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                <span className="text-lg mr-2">{category.icon}</span>
                <span className="flex-1">{category.name}</span>
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: category.color }}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Categorias de Despesa</h4>
          <div className="space-y-2">
            {categories.filter(c => c.type === "expense").map((category) => (
              <div key={category.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                <span className="text-lg mr-2">{category.icon}</span>
                <span className="flex-1">{category.name}</span>
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: category.color }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}