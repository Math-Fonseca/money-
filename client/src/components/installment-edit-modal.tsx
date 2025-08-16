import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
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
}

interface InstallmentEditModalProps {
  transaction: Transaction | null;
  editData: any;
  isOpen: boolean;
  onClose: () => void;
  onEditSingle: () => void;
  onEditAll: () => void;
}

export default function InstallmentEditModal({ 
  transaction, 
  editData,
  isOpen, 
  onClose,
  onEditSingle,
  onEditAll
}: InstallmentEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editSingleMutation = useMutation({
    mutationFn: async () => {
      if (!transaction || !editData) return;
      await apiRequest("PUT", `/api/transactions/${transaction.id}`, editData);
    },
    onSuccess: () => {
      toast({
        title: "Parcela atualizada",
        description: "A parcela foi atualizada com sucesso!",
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
        description: "Erro ao atualizar parcela. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const editAllInstallmentsMutation = useMutation({
    mutationFn: async () => {
      if (!transaction || !editData) return;
      
      // Se é a primeira parcela (sem parentTransactionId), usar seu próprio ID
      // Se é uma parcela subsequente, usar o parentTransactionId
      const parentId = transaction.parentTransactionId || transaction.id;
      
      // Para parcelas, sempre implementar lógica proporcional quando alterando valor
      if (editData.amount) {
        // Se estamos editando qualquer parcela, todas as outras devem ter o mesmo valor
        await apiRequest("PUT", `/api/transactions/installments/${parentId}`, {
          ...editData,
          proportionalAmount: true // Flag para indicar atualização proporcional
        });
      } else {
        // Para outros campos que não sejam valor, atualizar normalmente
        await apiRequest("PUT", `/api/transactions/installments/${parentId}`, editData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Todas as parcelas atualizadas",
        description: "Todas as parcelas foram atualizadas com sucesso!",
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
        description: "Erro ao atualizar todas as parcelas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleEditSingle = () => {
    editSingleMutation.mutate();
  };

  const handleEditAll = () => {
    editAllInstallmentsMutation.mutate();
  };

  if (!transaction) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar transação parcelada</AlertDialogTitle>
          <AlertDialogDescription>
            Esta é uma transação parcelada ({transaction.installmentNumber}/{transaction.installments}x).
            Você deseja aplicar as alterações apenas para esta parcela ou para todas as parcelas?
            {editData?.amount && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>💡 Dica:</strong> Alterando o valor de qualquer parcela, todas as outras parcelas 
                  serão ajustadas para o mesmo valor, mantendo a estrutura de parcelamento.
                </p>
              </div>
            )}
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
            Apenas esta parcela
          </Button>
          <Button
            onClick={handleEditAll}
            className="bg-primary hover:bg-green-600"
            disabled={editAllInstallmentsMutation.isPending}
          >
            Todas as parcelas
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}