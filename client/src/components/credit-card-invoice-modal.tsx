import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarIcon, CreditCard, DollarSignIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react";
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

    // CORREÇÃO: A fatura inclui transações desde o dia de fechamento anterior + 1
    // até o dia de fechamento atual
    let startDate: Date;
    let endDate: Date;

    if (closingDay === 1) {
      // Caso especial: se fecha no dia 1, a fatura é do mês anterior
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month - 1, 31);
    } else {
      // Caso normal: fatura vai do fechamento anterior + 1 até o fechamento atual
      // Exemplo: se fecha no dia 5, a fatura vai do dia 6 do mês anterior até o dia 5 do mês atual
      startDate = new Date(year, month - 1, closingDay + 1);
      endDate = new Date(year, month, closingDay);
    }

    // Debug: verificar se as datas estão corretas
    console.log(`Período calculado para ${creditCard?.name}:`, {
      startDate: format(startDate, 'dd/MM/yyyy'),
      endDate: format(endDate, 'dd/MM/yyyy'),
      closingDay,
      currentMonth: month + 1,
      currentYear: year
    });

    return { startDate, endDate };
  };

  const { startDate, endDate } = creditCard ? getInvoicePeriod(currentDate) : { startDate: new Date(), endDate: new Date() };

  // Debug: mostrar período da fatura
  console.log(`Período da fatura para ${creditCard?.name}:`, {
    startDate: format(startDate, 'dd/MM/yyyy'),
    endDate: format(endDate, 'dd/MM/yyyy'),
    currentDate: format(currentDate, 'dd/MM/yyyy'),
    closingDay: creditCard?.closingDay
  });

  // Debug: verificar se as datas estão corretas
  console.log(`Exemplo para Cartão Principal (fecha dia 5):`);
  console.log(`- Se estamos em agosto/2025, a fatura deve incluir:`);
  console.log(`  - Transações de 06/07/2025 até 05/08/2025`);
  console.log(`- Se estamos em setembro/2025, a fatura deve incluir:`);
  console.log(`  - Transações de 06/08/2025 até 05/09/2025`);

  // Fetch transactions for current invoice period - CORRIGIDO URL
  const { data: transactions = [] } = useQuery({
    queryKey: [`/api/transactions/credit-card/${creditCard?.id}/${format(startDate, 'yyyy-MM-dd')}/${format(endDate, 'yyyy-MM-dd')}`],
    enabled: !!creditCard && isOpen,
  });

  // Debug: mostrar transações recebidas
  console.log(`Transações recebidas para ${creditCard?.name}:`, transactions);

  // Fetch subscriptions for current invoice period - CORRIGIDO URL
  const { data: subscriptions = [] } = useQuery({
    queryKey: [`/api/subscriptions/credit-card/${creditCard?.id}/${format(startDate, 'yyyy-MM-dd')}/${format(endDate, 'yyyy-MM-dd')}`],
    enabled: !!creditCard && isOpen,
  });

  // Fetch invoice data - CORRIGIDO URL
  const { data: invoice = null } = useQuery<CreditCardInvoice | null>({
    queryKey: [`/api/credit-card-invoices/${creditCard?.id}/${format(endDate, 'yyyy-MM-dd')}`],
    enabled: !!creditCard && isOpen,
  });

  // As transações já vêm filtradas do backend para o período correto
  const creditCardTransactions = Array.isArray(transactions) ? transactions : [];

  // ⚡️ USAR DIRETAMENTE AS ASSINATURAS DO BACKEND - JÁ FILTRADAS
  const creditCardSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];

  // ⚡️ TOTAL APENAS DAS TRANSAÇÕES - ASSINATURAS JÁ VÊM INCLUÍDAS
  const totalInvoiceAmount = creditCardTransactions.reduce((sum: number, t: Transaction) =>
    sum + parseFloat(t.amount), 0
  );

  // Calculate invoice status based on dates and payments
  const getInvoiceStatus = () => {
    const today = new Date();
    const closingDate = new Date(endDate);
    const dueDate = new Date(closingDate);
    dueDate.setDate(creditCard?.dueDay || 10);

    const paidAmount = invoice?.paidAmount ? parseFloat(invoice.paidAmount) : 0;

    if (paidAmount >= totalInvoiceAmount && totalInvoiceAmount > 0) {
      return { status: "PAGO", color: "text-green-600" };
    } else if (paidAmount > 0 && paidAmount < totalInvoiceAmount) {
      return { status: "PARCIAL", color: "text-yellow-600" };
    } else if (today > dueDate && totalInvoiceAmount > 0) {
      return { status: "VENCIDA", color: "text-red-600" };
    } else if (today > closingDate) {
      return { status: "FECHADA", color: "text-blue-600" };
    } else {
      return { status: "ABERTA", color: "text-gray-600" };
    }
  };

  const invoiceStatus = getInvoiceStatus();

  // Payment mutation
  const payInvoiceMutation = useMutation({
    mutationFn: async (data: { invoiceId: string; amount: string }) => {
      return await apiRequest(`/api/credit-card-invoices/${data.invoiceId}/pay`, "PUT", { amount: data.amount });
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

  const getStatusBadge = (status: string, invoiceEndDate: Date, totalAmount: number, paidAmount: number) => {
    const today = new Date();
    // Criar data de fechamento baseada no dia de fechamento do cartão
    const closingDate = new Date(invoiceEndDate);

    // Criar data de vencimento (dia do vencimento no mês seguinte ao fechamento)
    const dueDate = new Date(invoiceEndDate);
    dueDate.setMonth(invoiceEndDate.getMonth() + 1);
    dueDate.setDate(creditCard!.dueDay);

    const isAfterClosingDate = today > closingDate;
    const isAfterDueDate = today > dueDate;

    // Determinar status baseado na lógica de negócio CORRIGIDA
    let finalStatus = status;
    let label = "Pendente";

    if (paidAmount >= totalAmount && totalAmount > 0) {
      finalStatus = "paid";
      label = "Paga";
    } else if (isAfterDueDate && totalAmount > 0) {
      finalStatus = "overdue";
      label = "Vencida";
    } else if (isAfterClosingDate && totalAmount > 0) {
      finalStatus = "closed";
      label = "Fechada";
    } else if (totalAmount === 0) {
      finalStatus = "closed";
      label = "Sem movimentação";
    }

    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const, icon: ClockIcon },
      paid: { label: "Paga", variant: "default" as const, icon: CheckCircleIcon },
      closed: { label: "Fechada", variant: "outline" as const, icon: ClockIcon },
      partial: { label: "Parcial", variant: "outline" as const, icon: DollarSignIcon },
      overdue: { label: "Vencida", variant: "destructive" as const, icon: XCircleIcon },
    };

    const config = statusConfig[finalStatus as keyof typeof statusConfig] || { label, variant: "secondary" as const, icon: ClockIcon };
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
            <CreditCard className="w-5 h-5" />
            Fatura - {creditCard.name}
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie a fatura do cartão de crédito
          </DialogDescription>
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
                <Badge
                  className={`${invoiceStatus.status === 'VENCIDA' ? 'bg-red-500 text-white border-red-600' : invoiceStatus.status === 'FECHADA' ? 'bg-gray-100 text-gray-600 border-gray-300' : invoiceStatus.status === 'ABERTA' ? 'bg-green-500 text-white border-green-600' : invoiceStatus.color}`}
                >
                  {invoiceStatus.status}
                </Badge>
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
                      {/* Transações regulares */}
                      {creditCardTransactions.map((transaction: Transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-gray-600">
                              {format(parseISO(transaction.date), "dd 'de' MMMM", { locale: ptBR })}
                              {transaction.installments && transaction.installments > 1 && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {transaction.installmentNumber || 1}/{transaction.installments}
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="font-bold text-red-600">
                            R$ {parseFloat(transaction.amount).toFixed(2)}
                          </p>
                        </div>
                      ))}

                      {/* ⚡️ ASSINATURAS JÁ VÊM COMO TRANSAÇÕES DO BACKEND - NÃO DUPLICAR */}
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

                  {/* Informação sobre pagamento total */}
                  {paymentAmount && parseFloat(paymentAmount) >= (totalInvoiceAmount - (invoice ? parseFloat(invoice.paidAmount) : 0)) && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Pagamento Total:</strong> Após quitar esta fatura, o limite será liberado e automaticamente reservado para as assinaturas do próximo mês.
                      </p>
                    </div>
                  )}

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