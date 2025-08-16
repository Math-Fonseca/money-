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

interface RecurringDeleteModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecurringDeleteModal({ 
  transaction, 
  isOpen, 
  onClose 
}: RecurringDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Transação excluída",
        description: "A transação foi excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir transação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteAllRecurringMutation = useMutation({
    mutationFn: async (parentId: string) => {
      await apiRequest("DELETE", `/api/transactions/recurring/${parentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Transações excluídas",
        description: "Todas as transações recorrentes foram excluídas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir transações recorrentes. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSingle = () => {
    if (transaction) {
      deleteSingleMutation.mutate(transaction.id);
    }
  };

  const handleDeleteAll = () => {
    if (transaction) {
      const parentId = transaction.parentTransactionId || transaction.id;
      deleteAllRecurringMutation.mutate(parentId);
    }
  };

  if (!transaction) return null;

  const isRecurring = transaction.isRecurring || transaction.parentTransactionId;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação</AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring ? (
              <>
                Esta é uma transação recorrente. Você deseja excluir apenas esta transação 
                ou todas as transações recorrentes relacionadas?
              </>
            ) : (
              `Tem certeza que deseja excluir a transação "${transaction.description}"? Esta ação não pode ser desfeita.`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {isRecurring ? (
            <>
              <Button
                onClick={handleDeleteSingle}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={deleteSingleMutation.isPending}
              >
                Apenas esta
              </Button>
              <Button
                onClick={handleDeleteAll}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteAllRecurringMutation.isPending}
              >
                Todas as recorrentes
              </Button>
            </>
          ) : (
            <AlertDialogAction
              onClick={handleDeleteSingle}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteSingleMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}