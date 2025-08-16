import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarIcon, CreditCardIcon, DollarSignIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react";
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditCard {
  id: string;
  name: string;
  brand: string;
  bank: string;
  limit: string;
  currentUsed: string;
  color: string;
  closingDay: number;
  dueDay: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  type: string;
  categoryId?: string;
  paymentMethod?: string;
  creditCardId?: string;
  installments?: number;
  installmentNumber?: number;
}

interface CreditCardInvoice {
  id: string;
  creditCardId: string;
  dueDate: string;
  totalAmount: string;
  paidAmount: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  isInstallment?: boolean;
  installmentCount?: number;
  installmentNumber?: number;
  parentInvoiceId?: string;
}

interface CreditCardInvoiceModalProps {
  creditCard: CreditCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditCardInvoiceModal({ creditCard, isOpen, onClose }: CreditCardInvoiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedInvoice, setSelectedInvoice] = useState<CreditCardInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Generate invoice period based on card's closing day
  const getInvoicePeriod = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const closingDay = creditCard?.closingDay || 1;
    
    const startDate = new Date(year, month - 1, closingDay + 1);
    const endDate = new Date(year, month, closingDay);
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = creditCard ? getInvoicePeriod(currentDate) : { startDate: new Date(), endDate: new Date() };

  // Fetch transactions for current invoice period
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions", "credit-card", creditCard?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    enabled: !!creditCard && isOpen,
  });

  // Fetch invoice data
  const { data: invoice = null } = useQuery<CreditCardInvoice | null>({
    queryKey: ["/api/credit-card-invoices", creditCard?.id, format(endDate, 'yyyy-MM-dd')],
    enabled: !!creditCard && isOpen,
  });

  // Filter transactions for this credit card and period
  const creditCardTransactions = Array.isArray(transactions) ? transactions.filter((t: Transaction) => 
    t.creditCardId === creditCard?.id &&
    t.type === 'expense' &&
    new Date(t.date) >= startDate &&
    new Date(t.date) <= endDate
  ) : [];

  const totalInvoiceAmount = creditCardTransactions.reduce((sum: number, t: Transaction) => 
    sum + parseFloat(t.amount), 0
  );

  // Payment mutation
  const payInvoiceMutation = useMutation({
    mutationFn: async (data: { invoiceId: string; amount: string }) => {
      return await apiRequest("PUT", `/api/credit-card-invoices/${data.invoiceId}/pay`, data);
    },
    onSuccess: () => {
      toast({
        title: "Pagamento registrado",
        description: "O pagamento da fatura foi registrado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-card-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      setPaymentAmount("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar pagamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handlePayment = () => {
    if (!invoice || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    
    if (amount <= 0) {
      toast({
        title: "Erro",
        description: "Valor do pagamento deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    payInvoiceMutation.mutate({
      invoiceId: invoice.id,
      amount: paymentAmount
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const, icon: ClockIcon },
      paid: { label: "Paga", variant: "default" as const, icon: CheckCircleIcon },
      partial: { label: "Parcial", variant: "outline" as const, icon: DollarSignIcon },
      overdue: { label: "Vencida", variant: "destructive" as const, icon: XCircleIcon },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const navigateToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const navigateToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  if (!creditCard) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5" />
            Fatura - {creditCard.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Navigation and Period Info */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={navigateToPreviousMonth}>
              ← Mês Anterior
            </Button>
            <div className="text-center">
              <h3 className="font-semibold">
                {format(startDate, "dd 'de' MMMM", { locale: ptBR })} - {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
              <p className="text-sm text-gray-600">
                Vencimento: {format(addMonths(endDate, 0).setDate(creditCard.dueDay), "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <Button variant="outline" onClick={navigateToNextMonth}>
              Próximo Mês →
            </Button>
          </div>

          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resumo da Fatura</span>
                {invoice && getStatusBadge(invoice.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold text-red-600">
                    R$ {totalInvoiceAmount.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Valor Pago</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {invoice ? parseFloat(invoice.paidAmount).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Saldo Restante</p>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {(totalInvoiceAmount - (invoice ? parseFloat(invoice.paidAmount) : 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="payment">Pagamento</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transações da Fatura</CardTitle>
                </CardHeader>
                <CardContent>
                  {creditCardTransactions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma transação encontrada para este período.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {creditCardTransactions.map((transaction: Transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-gray-600">
                              {format(parseISO(transaction.date), "dd 'de' MMMM", { locale: ptBR })}
                              {transaction.installments && transaction.installments > 1 && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {transaction.installmentNumber}/{transaction.installments}
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="font-bold text-red-600">
                            R$ {parseFloat(transaction.amount).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Registrar Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="paymentAmount">Valor do Pagamento</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>

                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const remainingAmount = totalInvoiceAmount - (invoice ? parseFloat(invoice.paidAmount) : 0);
                        setPaymentAmount(remainingAmount.toString());
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Pagamento Total
                    </Button>
                    <Button
                      onClick={() => setPaymentAmount((totalInvoiceAmount * 0.1).toFixed(2))}
                      variant="outline"
                      className="flex-1"
                    >
                      Pagamento Mínimo (10%)
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handlePayment}
                    disabled={!paymentAmount || payInvoiceMutation.isPending}
                    className="w-full bg-primary hover:bg-green-600"
                  >
                    {payInvoiceMutation.isPending ? "Processando..." : "Registrar Pagamento"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}