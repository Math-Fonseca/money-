import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const settingsSchema = z.object({
  dailyVT: z.string().min(0),
  dailyVR: z.string().min(0),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery<Array<{
    key: string;
    value: string;
  }>>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dailyVT: "0",
      dailyVR: "0",
    }
  });

  // Load current settings
  useEffect(() => {
    const vtSetting = settings.find(s => s.key === "dailyVT");
    const vrSetting = settings.find(s => s.key === "dailyVR");
    
    if (vtSetting) form.setValue("dailyVT", vtSetting.value);
    if (vrSetting) form.setValue("dailyVR", vrSetting.value);
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const promises = [
        apiRequest("POST", "/api/settings", { key: "dailyVT", value: data.dailyVT }),
        apiRequest("POST", "/api/settings", { key: "dailyVR", value: data.dailyVR })
      ];
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "As configurações de VT/VR foram salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const calculateWorkingDays = (date: Date = new Date()): number => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let workingDays = 0;
    
    for (let day = firstDay.getDate(); day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  const workingDays = calculateWorkingDays();
  const monthlyVT = parseFloat(form.watch("dailyVT") || "0") * workingDays;
  const monthlyVR = parseFloat(form.watch("dailyVR") || "0") * workingDays;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações Automáticas</h3>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dailyVT">Valor Diário VT (R$)</Label>
            <Input
              id="dailyVT"
              type="number"
              step="0.01"
              {...form.register("dailyVT")}
              placeholder="26.00"
            />
            <p className="text-sm text-gray-600 mt-1">
              Mensal: {formatCurrency(monthlyVT)} ({workingDays} dias úteis)
            </p>
          </div>
          
          <div>
            <Label htmlFor="dailyVR">Valor Diário VR (R$)</Label>
            <Input
              id="dailyVR"
              type="number"
              step="0.01"
              {...form.register("dailyVR")}
              placeholder="15.00"
            />
            <p className="text-sm text-gray-600 mt-1">
              Mensal: {formatCurrency(monthlyVR)} ({workingDays} dias úteis)
            </p>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Configure os valores diários de VT e VR</li>
            <li>• Ao cadastrar um salário, VT e VR serão incluídos automaticamente</li>
            <li>• O cálculo considera apenas dias úteis do mês</li>
            <li>• Os valores podem ser alterados a qualquer momento</li>
          </ul>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </form>
    </div>
  );
}