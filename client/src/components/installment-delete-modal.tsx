import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  installments?: number;
  installmentNumber?: number;
  parentTransactionId?: string;
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

  const deleteAllMutation = useMutation({
    mutationFn: async (parentId: string) => {
      // Se é a primeira parcela (sem parentTransactionId), usar seu próprio ID
      // Se é uma parcela subsequente, usar o parentTransactionId
      const targetId = transaction?.parentTransactionId || transaction?.id;
      await apiRequest("DELETE", `/api/transactions/installments/${targetId}`);
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
    if (transaction) {
      deleteSingleMutation.mutate(transaction.id);
    }
  };

  const handleDeleteAll = () => {
    if (transaction) {
      deleteAllMutation.mutate(transaction.id);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Excluir Transação Parcelada</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              Esta é uma transação parcelada ({transaction.installmentNumber}/{transaction.installments}).
            </p>
            <p>
              <strong>Transação:</strong> {transaction.description}
            </p>
            <p>
              <strong>Valor:</strong> R$ {parseFloat(transaction.amount).toFixed(2)}
            </p>
          </div>

          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
            ⚠️ <strong>Atenção:</strong> Escolha como deseja excluir:
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleDeleteSingle}
              disabled={deleteSingleMutation.isPending}
              variant="outline"
              className="w-full justify-start"
            >
              🗑️ Excluir apenas esta parcela
              <div className="text-xs text-gray-500 ml-auto">
                ({transaction.installmentNumber}/{transaction.installments})
              </div>
            </Button>

            <Button
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending}
              variant="destructive"
              className="w-full justify-start"
            >
              🗑️ Excluir todas as parcelas
              <div className="text-xs text-white/80 ml-auto">
                (Todas as {transaction.installments}x)
              </div>
            </Button>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              variant="ghost" 
              onClick={onClose}
              disabled={deleteSingleMutation.isPending || deleteAllMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}