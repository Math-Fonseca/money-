import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Category } from "@shared/schema";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  icon: z.string().min(1, "Ícone é obrigatório"),
  color: z.string().min(1, "Cor é obrigatória"),
  type: z.enum(["income", "expense", "subscription"], { required_error: "Tipo é obrigatório" }),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

const availableIcons = [
  "💰", "🍔", "🚗", "🏠", "🏥", "📚", "🎭", "👕", "📄", "📦",
  "🚇", "🍽️", "💻", "🎁", "💵", "🛒", "⛽", "🚖", "🅿️", "🏘️",
  "🏦", "🏢", "⚡", "💧", "🔥", "📡", "📞", "💊", "👨‍⚕️", "🦷",
  "🩺", "💪", "🎓", "📖", "✏️", "🎬", "✈️", "🏨", "🎉", "👞",
  "💍", "💄", "💇‍♀️", "📱", "🛋️", "🔧", "🐕", "🛡️", "📊", "❤️",
  "📺", "🎵", "🎮", "💼", "☁️", "📰", "🏃‍♀️", "🚚", "🎨", "📈",
  "🏪", "👥", "🧾", "🍕", "🍜", "🥗", "☕", "🍺", "🚌", "🚲",
  "🏬", "🎪", "🎸", "🎯", "🏆", "🎊", "🎂", "🎯", "💝", "🌟"
];

const availableColors = [
  "#EF4444", "#F59E0B", "#10B981", "#2563EB", "#8B5CF6", "#EC4899",
  "#06B6D4", "#84CC16", "#6B7280", "#DC2626", "#059669", "#7C3AED",
  "#0891B2", "#CA8A04", "#92400E", "#374151", "#FCD34D", "#A855F7"
];

export function CategoryManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      icon: "",
      color: "",
      type: "expense",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => {
      if (editingCategory) {
        return apiRequest("PUT", `/api/categories/${editingCategory.id}`, data);
      } else {
        return apiRequest("POST", "/api/categories", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      closeDialog();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    form.reset();
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type as "income" | "expense" | "subscription",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando categorias...</div>;
  }

  const incomeCategories = categories.filter((cat: Category) => cat.type === "income");
  const expenseCategories = categories.filter((cat: Category) => cat.type === "expense");
  const subscriptionCategories = categories.filter((cat: Category) => cat.type === "subscription");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Categorias</h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" aria-describedby="category-dialog-description">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <p id="category-dialog-description" className="text-sm text-gray-600">
                {editingCategory ? "Edite os dados da categoria" : "Crie uma nova categoria para organizar suas transações"}
              </p>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Alimentação" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Receita</SelectItem>
                          <SelectItem value="expense">Despesa</SelectItem>
                          <SelectItem value="subscription">Assinatura</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ícone</FormLabel>
                      <div className="grid grid-cols-10 gap-2 p-3 border rounded-md max-h-40 overflow-y-auto">
                        {availableIcons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            className={`text-2xl p-2 rounded hover:bg-gray-100 ${
                              field.value === icon ? "bg-blue-100 border-2 border-blue-500" : ""
                            }`}
                            onClick={() => field.onChange(icon)}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <div className="grid grid-cols-9 gap-2 p-3 border rounded-md">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              field.value === color ? "border-gray-800 scale-110" : "border-gray-300"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createCategoryMutation.isPending}>
                    {createCategoryMutation.isPending ? "Salvando..." : editingCategory ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categorias de Receita */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-green-600">📈 Categorias de Receita</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {incomeCategories.map((category) => (
            <Card key={category.id} className="relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: category.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <CardTitle className="text-sm">{category.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Categorias de Despesa */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-red-600">📉 Categorias de Despesa</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {expenseCategories.map((category) => (
            <Card key={category.id} className="relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: category.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <CardTitle className="text-sm">{category.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Categorias de Assinatura */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-purple-600">📱 Categorias de Assinatura</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subscriptionCategories.map((category) => (
            <Card key={category.id} className="relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: category.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <CardTitle className="text-sm">{category.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}