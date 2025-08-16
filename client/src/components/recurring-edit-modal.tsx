import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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

interface RecurringEditModalProps {
  transaction: Transaction | null;
  editData: any;
  isOpen: boolean;
  onClose: () => void;
  onEditSingle: () => void;
  onEditAll: () => void;
}

export default function RecurringEditModal({ 
  transaction, 
  editData,
  isOpen, 
  onClose,
  onEditSingle,
  onEditAll
}: RecurringEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editSingleMutation = useMutation({
    mutationFn: async () => {
      if (!transaction || !editData) return;
      await apiRequest("PUT", `/api/transactions/${transaction.id}`, editData);
    },
    onSuccess: () => {
      toast({
        title: "Transação atualizada",
        description: "A transação foi atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      onEditSingle();
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

  const editAllRecurringMutation = useMutation({
    mutationFn: async () => {
      if (!transaction || !editData) return;
      const parentId = transaction.parentTransactionId || transaction.id;
      await apiRequest("PUT", `/api/transactions/recurring/${parentId}`, editData);
    },
    onSuccess: () => {
      toast({
        title: "Transações atualizadas",
        description: "Todas as transações recorrentes foram atualizadas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      onEditAll();
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar transações recorrentes. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleEditSingle = () => {
    editSingleMutation.mutate();
  };

  const handleEditAll = () => {
    editAllRecurringMutation.mutate();
  };

  if (!transaction) return null;

  const isRecurring = transaction.isRecurring || transaction.parentTransactionId;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar transação recorrente</AlertDialogTitle>
          <AlertDialogDescription>
            Esta é uma transação recorrente. Você deseja aplicar as alterações apenas 
            para esta transação ou para todas as transações recorrentes relacionadas?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleEditSingle}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
            disabled={editSingleMutation.isPending}
          >
            Apenas esta
          </Button>
          <Button
            onClick={handleEditAll}
            className="bg-primary hover:bg-green-600"
            disabled={editAllRecurringMutation.isPending}
          >
            Todas as recorrentes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}