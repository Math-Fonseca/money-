import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, CreditCard, Trash2, FileText } from "lucide-react";
import CreditCardInvoiceModal from "./credit-card-invoice-modal";

// Form schema para cartões de crédito
const creditCardFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  brand: z.string().min(1, "Bandeira é obrigatória"),
  bank: z.string().min(1, "Banco é obrigatório"),
  limit: z.string().min(1, "Limite é obrigatório"),
  color: z.string().min(1, "Cor é obrigatória"),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
});

type CreditCardFormData = z.infer<typeof creditCardFormSchema>;

// Opções de bandeiras de cartão
const cardBrands = [
  { id: 'mastercard', name: 'MasterCard', icon: '💳', color: '#EB001B' },
  { id: 'visa', name: 'Visa', icon: '💳', color: '#1A1F71' },
  { id: 'elo', name: 'Elo', icon: '💳', color: '#FFC700' },
  { id: 'american-express', name: 'American Express', icon: '💳', color: '#006FCF' },
  { id: 'hipercard', name: 'Hipercard', icon: '💳', color: '#E30613' }
];

// Opções de bancos
const banks = [
  { id: 'nubank', name: 'Nubank', icon: '🏦', color: '#8A05BE' },
  { id: 'itau', name: 'Itaú', icon: '🏦', color: '#F37900' },
  { id: 'bradesco', name: 'Bradesco', icon: '🏦', color: '#CC092F' },
  { id: 'santander', name: 'Santander', icon: '🏦', color: '#EC0000' },
  { id: 'caixa', name: 'Caixa', icon: '🏦', color: '#0066CC' },
  { id: 'bb', name: 'Banco do Brasil', icon: '🏦', color: '#FBB040' },
  { id: 'mercado-pago', name: 'Mercado Pago', icon: '🏦', color: '#009EE3' },
  { id: 'inter', name: 'Inter', icon: '🏦', color: '#FF7A00' },
  { id: 'c6', name: 'C6 Bank', icon: '🏦', color: '#FFD500' }
];

interface CreditCard {
  id: string;
  name: string;
  color: string;
  brand: string;
  bank: string;
  limit: string;
  currentUsed: string;
  closingDay: number;
  dueDay: number;
  isActive: boolean;
}

export default function CreditCardManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedCreditCard, setSelectedCreditCard] = useState<CreditCard | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: creditCards = [] } = useQuery<CreditCard[]>({
    queryKey: ["/api/credit-cards"],
  });

  const form = useForm<CreditCardFormData>({
    resolver: zodResolver(creditCardFormSchema),
    defaultValues: {
      name: "",
      brand: "",
      bank: "",
      limit: "",
      color: "#3B82F6",
      closingDay: 1,
      dueDay: 10,
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (data: CreditCardFormData) => {
      return apiRequest("POST", "/api/credit-cards", {
        ...data,
        limit: parseFloat(data.limit.replace(/[^\d,.-]/g, '').replace(',', '.')).toString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Cartão cadastrado!",
        description: "Cartão de crédito adicionado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao cadastrar o cartão de crédito.",
        variant: "destructive",
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/credit-cards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      toast({
        title: "Cartão removido",
        description: "Cartão de crédito removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover o cartão de crédito.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreditCardFormData) => {
    createCardMutation.mutate(data);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(amount));
  };

  const getUsagePercentage = (used: string, limit: string) => {
    const usedAmount = parseFloat(used);
    const limitAmount = parseFloat(limit);
    return limitAmount > 0 ? (usedAmount / limitAmount) * 100 : 0;
  };

  const getBrandInfo = (brandId: string) => {
    return cardBrands.find(b => b.id === brandId) || cardBrands[0];
  };

  const getBankInfo = (bankId: string) => {
    return banks.find(b => b.id === bankId) || banks[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h2>
          <p className="text-gray-600">Gerencie seus cartões e limites</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Cartão de Crédito</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cartão</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cartão Principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bandeira</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a bandeira" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cardBrands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                <div className="flex items-center gap-2">
                                  <span>{brand.icon}</span>
                                  {brand.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o banco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>
                                <div className="flex items-center gap-2">
                                  <span>{bank.icon}</span>
                                  {bank.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="R$ 1.000,00" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor do Cartão</FormLabel>
                        <FormControl>
                          <Input 
                            type="color"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="closingDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia de Fechamento</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="31" 
                            placeholder="5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia de Vencimento</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="31" 
                            placeholder="15"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createCardMutation.isPending}>
                    {createCardMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {creditCards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Nenhum cartão cadastrado ainda</p>
            <p className="text-sm text-gray-400">Cadastre seus cartões para acompanhar os gastos e limites</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creditCards.map((card) => {
            const brandInfo = getBrandInfo(card.brand);
            const bankInfo = getBankInfo(card.bank);
            const usagePercentage = getUsagePercentage(card.currentUsed, card.limit);
            const remainingLimit = parseFloat(card.limit) - parseFloat(card.currentUsed);

            return (
              <Card 
                key={card.id} 
                className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => handleCardClick(card)}
              >
                <div 
                  className="absolute top-0 left-0 w-full h-1"
                  style={{ backgroundColor: bankInfo.color }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: brandInfo.color }}>{brandInfo.icon}</span>
                      <CardTitle className="text-lg">{card.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(card);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCardMutation.mutate(card.id);
                        }}
                        disabled={deleteCardMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {brandInfo.name} • {bankInfo.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Usado: {formatCurrency(card.currentUsed)}</span>
                        <span>Limite: {formatCurrency(card.limit)}</span>
                      </div>
                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300 rounded-full"
                          style={{ 
                            width: `${Math.min(usagePercentage, 100)}%`,
                            backgroundColor: usagePercentage >= 90 ? '#EF4444' : usagePercentage >= 70 ? '#F59E0B' : '#10B981'
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Disponível: {formatCurrency(remainingLimit.toString())}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Fechamento</p>
                        <p className="font-medium">Dia {card.closingDay}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Vencimento</p>
                        <p className="font-medium">Dia {card.dueDay}</p>
                      </div>
                    </div>

                    <Badge 
                      variant={usagePercentage > 80 ? "destructive" : usagePercentage > 60 ? "default" : "secondary"}
                    >
                      {usagePercentage.toFixed(1)}% utilizado
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreditCardInvoiceModal
        creditCard={selectedCreditCard}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedCreditCard(null);
        }}
      />
    </div>
  );

  function handleCardClick(card: CreditCard) {
    setSelectedCreditCard(card);
    setIsInvoiceModalOpen(true);
  }

  function getUsageColor(percentage: number) {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  }
}