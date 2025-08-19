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
  installments?: number;
  installmentNumber?: number;
  parentTransactionId?: string;
  creditCardId?: string;
}

interface InstallmentDeleteModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallmentDeleteModal({ 
  transaction, 
  isOpen, 
  onClose 
}: InstallmentDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Parcela excluída",
        description: "A parcela foi excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir parcela. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteAllInstallmentsMutation = useMutation({
    mutationFn: async (parentId: string) => {
      await apiRequest("DELETE", `/api/transactions/installments/${parentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Todas as parcelas excluídas",
        description: "Todas as parcelas foram excluídas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir todas as parcelas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSingle = () => {
    if (!transaction) return;
    deleteSingleMutation.mutate(transaction.id);
  };

  const handleDeleteAllInstallments = () => {
    if (!transaction) return;
    
    // Se é a primeira parcela (sem parentTransactionId), usar seu próprio ID
    // Se é uma parcela subsequente, usar o parentTransactionId
    const parentId = transaction.parentTransactionId || transaction.id;
    deleteAllInstallmentsMutation.mutate(parentId);
  };

  if (!transaction) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação parcelada</AlertDialogTitle>
          <AlertDialogDescription>
            Esta é uma transação parcelada ({transaction.installmentNumber}/{transaction.installments}x).
            
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                <strong>⚠️ Atenção:</strong> Transações parceladas devem ser excluídas como um conjunto completo.
                Todas as {transaction.installments} parcelas serão removidas e o limite total da compra será liberado.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAllInstallments}
            disabled={deleteAllInstallmentsMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteAllInstallmentsMutation.isPending ? "Excluindo..." : "Excluir todas as parcelas"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}