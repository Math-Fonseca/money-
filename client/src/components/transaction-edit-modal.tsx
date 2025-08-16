import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RecurringEditModal from "./recurring-edit-modal";

const editTransactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  paymentMethod: z.string().optional(),
});

type EditTransactionFormData = z.infer<typeof editTransactionSchema>;

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  categoryId?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  parentTransactionId?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface TransactionEditModalProps {
  transaction: Transaction | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionEditModal({ 
  transaction, 
  categories, 
  isOpen, 
  onClose 
}: TransactionEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<any>(null);

  const form = useForm<EditTransactionFormData>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      description: transaction?.description || "",
      amount: transaction?.amount || "",
      date: transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : "",
      categoryId: transaction?.categoryId || "",
      paymentMethod: transaction?.paymentMethod || "dinheiro",
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (data: EditTransactionFormData) => {
      if (!transaction) return;
      await apiRequest("PUT", `/api/transactions/${transaction.id}`, {
        ...data,
        type: transaction.type,
      });
    },
    onSuccess: () => {
      toast({
        title: "Transação atualizada",
        description: "A transação foi atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar transação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EditTransactionFormData) => {
    const editData = {
      ...data,
      type: transaction?.type,
    };
    
    // Check if transaction is recurring
    const isRecurring = (transaction as any)?.isRecurring || (transaction as any)?.parentTransactionId;
    
    if (isRecurring) {
      setPendingEditData(editData);
      setShowRecurringModal(true);
    } else {
      updateTransactionMutation.mutate(data);
    }
  };

  const filteredCategories = categories.filter(c => c.type === transaction?.type);

  const paymentMethods = [
    { value: "dinheiro", label: "💵 Dinheiro" },
    { value: "debito", label: "💳 Débito" },
    { value: "credito", label: "💎 Crédito" },
    { value: "pix", label: "📱 PIX" },
    { value: "transferencia", label: "🏦 Transferência" },
  ];

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction && isOpen) {
      form.reset({
        description: transaction.description,
        amount: transaction.amount,
        date: new Date(transaction.date).toISOString().split('T')[0],
        categoryId: transaction.categoryId,
        paymentMethod: transaction.paymentMethod || "dinheiro",
      });
    }
  }, [transaction, isOpen, form]);

  if (!transaction) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Editar {transaction.type === 'income' ? 'Receita' : 'Despesa'}
            </DialogTitle>
          </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...form.register("description")}
              placeholder="Ex: Salário, Aluguel, etc."
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.amount.message}
                </p>
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
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="categoryId">Categoria</Label>
            <Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
            <Select value={form.watch("paymentMethod")} onValueChange={(value) => form.setValue("paymentMethod", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateTransactionMutation.isPending}
              className="bg-primary hover:bg-green-600"
            >
              {updateTransactionMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {showRecurringModal && (
      <RecurringEditModal
        transaction={transaction}
        editData={pendingEditData}
        isOpen={showRecurringModal}
        onClose={() => {
          setShowRecurringModal(false);
          setPendingEditData(null);
        }}
        onEditSingle={() => {
          updateTransactionMutation.mutate(pendingEditData);
        }}
        onEditAll={() => {
          // This will be handled by the RecurringEditModal itself
        }}
      />
    )}
    </>
  );
}