import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateWorkingDays } from "@/lib/financial-utils";

const incomeSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  isRecurring: z.boolean().default(false),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface IncomeFormProps {
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
}

export default function IncomeForm({ categories }: IncomeFormProps) {
  const [includeVTVR, setIncludeVTVR] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery<Array<{
    key: string;
    value: string;
  }>>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
    }
  });

  const createIncomeMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      const transactions = [];
      
      // Main salary transaction
      const mainTransaction = {
        ...data,
        type: "income",
        paymentMethod: "transferencia",
        installments: 1,
        installmentNumber: 1,
      };
      transactions.push(apiRequest("POST", "/api/transactions", mainTransaction));
      
      // Auto-add VT and VR if enabled
      if (includeVTVR) {
        const vtSetting = settings.find(s => s.key === "dailyVT");
        const vrSetting = settings.find(s => s.key === "dailyVR");
        const vtCategory = categories.find(c => c.name === "Vale Transporte");
        const vrCategory = categories.find(c => c.name === "Vale Refeição");
        
        if (vtSetting && parseFloat(vtSetting.value) > 0 && vtCategory) {
          const workingDays = calculateWorkingDays(new Date(data.date));
          const monthlyVT = parseFloat(vtSetting.value) * workingDays;
          
          transactions.push(apiRequest("POST", "/api/transactions", {
            description: `VT ${new Date(data.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
            amount: monthlyVT.toFixed(2),
            date: data.date,
            type: "income",
            categoryId: vtCategory.id,
            paymentMethod: "transferencia",
            installments: 1,
            installmentNumber: 1,
          }));
        }
        
        if (vrSetting && parseFloat(vrSetting.value) > 0 && vrCategory) {
          const workingDays = calculateWorkingDays(new Date(data.date));
          const monthlyVR = parseFloat(vrSetting.value) * workingDays;
          
          transactions.push(apiRequest("POST", "/api/transactions", {
            description: `VR ${new Date(data.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
            amount: monthlyVR.toFixed(2),
            date: data.date,
            type: "income",
            categoryId: vrCategory.id,
            paymentMethod: "transferencia",
            installments: 1,
            installmentNumber: 1,
          }));
        }
      }
      
      const responses = await Promise.all(transactions);
      return responses[0].json();
    },
    onSuccess: () => {
      toast({
        title: "Receita cadastrada",
        description: includeVTVR 
          ? "Receita cadastrada com VT/VR incluídos automaticamente!" 
          : "A receita foi cadastrada com sucesso!",
      });
      form.reset();
      setIncludeVTVR(false);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      queryClient.refetchQueries({ queryKey: ["/api/financial-summary"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IncomeFormData) => {
    createIncomeMutation.mutate(data);
  };

  // Get VT/VR settings for display
  const vtSetting = settings.find(s => s.key === "dailyVT");
  const vrSetting = settings.find(s => s.key === "dailyVR");
  const workingDays = calculateWorkingDays(new Date());
  const monthlyVT = (vtSetting ? parseFloat(vtSetting.value) : 0) * workingDays;
  const monthlyVR = (vrSetting ? parseFloat(vrSetting.value) : 0) * workingDays;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Income Registration Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cadastrar Receita</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="categoryId">Tipo de Receita</Label>
            <Select
              value={form.watch("categoryId")}
              onValueChange={(value) => form.setValue("categoryId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...form.register("description")}
              placeholder="Ex: Salário Janeiro 2024"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register("amount")}
                placeholder="0,00"
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                {...form.register("date")}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={form.watch("isRecurring")}
                onCheckedChange={(checked) => form.setValue("isRecurring", !!checked)}
              />
              <Label htmlFor="recurring" className="text-sm">Receita recorrente</Label>
            </div>

            {(monthlyVT > 0 || monthlyVR > 0) && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeVTVR"
                  checked={includeVTVR}
                  onCheckedChange={(checked) => setIncludeVTVR(!!checked)}
                />
                <Label htmlFor="includeVTVR" className="text-sm">
                  Incluir VT/VR automaticamente ({formatCurrency(monthlyVT + monthlyVR)})
                </Label>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createIncomeMutation.isPending}
          >
            {createIncomeMutation.isPending ? "Cadastrando..." : "Cadastrar Receita"}
          </Button>
        </form>
      </div>

      {/* VT/VR Preview */}
      <div className="space-y-6">
        {(monthlyVT > 0 || monthlyVR > 0) && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Valores Configurados</h3>
            <div className="space-y-3">
              {monthlyVT > 0 && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <span className="text-gray-700">VT Mensal</span>
                    <p className="text-sm text-gray-600">{workingDays} dias úteis</p>
                  </div>
                  <span className="font-semibold text-secondary">{formatCurrency(monthlyVT)}</span>
                </div>
              )}
              {monthlyVR > 0 && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <span className="text-gray-700">VR Mensal</span>
                    <p className="text-sm text-gray-600">{workingDays} dias úteis</p>
                  </div>
                  <span className="font-semibold text-secondary">{formatCurrency(monthlyVR)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Income Tips */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dicas</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">💡 Configure VT/VR nas configurações para cálculo automático</p>
            <p className="text-sm text-gray-600">💡 Marque "Incluir VT/VR" ao cadastrar salário</p>
            <p className="text-sm text-gray-600">💡 Use receitas recorrentes para entradas mensais fixas</p>
            <p className="text-sm text-gray-600">💡 Organize receitas por categorias específicas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
