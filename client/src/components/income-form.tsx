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
  const [dailyVT, setDailyVT] = useState("");
  const [dailyVR, setDailyVR] = useState("");
  const [workingDays, setWorkingDays] = useState(calculateWorkingDays(new Date()));
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
    }
  });

  const createIncomeMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      const response = await apiRequest("POST", "/api/transactions", {
        ...data,
        type: "income",
        paymentMethod: "transferencia",
        installments: 1,
        installmentNumber: 1,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receita cadastrada",
        description: "A receita foi cadastrada com sucesso!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
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

  const calculatedVT = parseFloat(dailyVT || "0") * workingDays;
  const calculatedVR = parseFloat(dailyVR || "0") * workingDays;

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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={form.watch("isRecurring")}
              onCheckedChange={(checked) => form.setValue("isRecurring", !!checked)}
            />
            <Label htmlFor="recurring" className="text-sm">Receita recorrente</Label>
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

      {/* VT/VR Calculator */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculadora VT/VR</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dailyVT">VT Diário (R$)</Label>
                <Input
                  id="dailyVT"
                  type="number"
                  step="0.01"
                  value={dailyVT}
                  onChange={(e) => setDailyVT(e.target.value)}
                  placeholder="26,00"
                />
              </div>
              <div>
                <Label htmlFor="dailyVR">VR Diário (R$)</Label>
                <Input
                  id="dailyVR"
                  type="number"
                  step="0.01"
                  value={dailyVR}
                  onChange={(e) => setDailyVR(e.target.value)}
                  placeholder="15,00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="workingDays">Dias Úteis no Mês</Label>
              <Input
                id="workingDays"
                type="number"
                value={workingDays}
                onChange={(e) => setWorkingDays(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                VT Mensal: <span className="font-semibold">{formatCurrency(calculatedVT)}</span>
              </p>
              <p className="text-sm text-gray-700">
                VR Mensal: <span className="font-semibold">{formatCurrency(calculatedVR)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Current Income Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Mensal</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">VT Calculado</span>
              <span className="font-semibold text-secondary">{formatCurrency(calculatedVT)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">VR Calculado</span>
              <span className="font-semibold text-secondary">{formatCurrency(calculatedVR)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
