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
            Você deseja excluir apenas esta parcela ou todas as parcelas?
            
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Atenção:</strong> Se você excluir todas as parcelas, o limite do cartão será 
                liberado completamente para esta compra. Se excluir apenas uma parcela, apenas o valor 
                desta parcela será liberado no limite.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleDeleteSingle}
            disabled={deleteSingleMutation.isPending}
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            {deleteSingleMutation.isPending ? "Excluindo..." : "Excluir apenas esta"}
          </Button>
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