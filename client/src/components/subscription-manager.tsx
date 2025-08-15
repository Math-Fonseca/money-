import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Smartphone, Trash2, Calendar } from "lucide-react";

// Form schema para assinaturas
const subscriptionFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  service: z.string().min(1, "Serviço é obrigatório"),
  amount: z.string().min(1, "Valor é obrigatório"),
  billingDate: z.coerce.number().min(1).max(31),
  categoryId: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

// Serviços de assinatura disponíveis
const subscriptionServices = [
  { id: 'spotify', name: 'Spotify', icon: '🎵', color: '#1DB954' },
  { id: 'netflix', name: 'Netflix', icon: '🎬', color: '#E50914' },
  { id: 'amazon-prime', name: 'Amazon Prime', icon: '📦', color: '#FF9900' },
  { id: 'disney-plus', name: 'Disney+', icon: '🏰', color: '#113CCF' },
  { id: 'youtube-premium', name: 'YouTube Premium', icon: '🎥', color: '#FF0000' },
  { id: 'paramount-plus', name: 'Paramount+', icon: '⭐', color: '#0064FF' },
  { id: 'hbo-max', name: 'HBO Max', icon: '🎭', color: '#8B5CF6' },
  { id: 'apple-tv', name: 'Apple TV+', icon: '📺', color: '#000000' },
  { id: 'meli-plus', name: 'Meli+', icon: '📦', color: '#FFE600' },
  { id: 'vivo', name: 'Vivo', icon: '📱', color: '#8B1538' },
  { id: 'claro', name: 'Claro', icon: '📱', color: '#FF0000' },
  { id: 'tim', name: 'TIM', icon: '📱', color: '#4169E1' },
  { id: 'smartfit', name: 'Smart Fit', icon: '🏃', color: '#FFD700' },
  { id: 'panobianco', name: 'Panobianco', icon: '🏋️', color: '#FF6B35' },
  { id: 'ifood', name: 'iFood', icon: '🍔', color: '#EA1D2C' },
  { id: 'uber-eats', name: 'Uber Eats', icon: '🍕', color: '#06C167' },
  { id: 'rappi', name: 'Rappi', icon: '🛵', color: '#FF441F' },
  { id: 'ea-play', name: 'EA Play', icon: '🎮', color: '#FF6C11' },
  { id: 'xbox-gamepass', name: 'Xbox Game Pass', icon: '🎮', color: '#107C10' },
  { id: 'playstation-plus', name: 'PlayStation Plus', icon: '🎮', color: '#003791' }
];

interface Subscription {
  id: string;
  name: string;
  service: string;
  amount: string;
  billingDate: number;
  isActive: boolean;
  categoryId?: string;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

export default function SubscriptionManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: "",
      service: "",
      amount: "",
      billingDate: 1,
      categoryId: "",
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: (data: SubscriptionFormData) => {
      return apiRequest("POST", "/api/subscriptions", {
        ...data,
        amount: parseFloat(data.amount.replace(/[^\d,.-]/g, '').replace(',', '.')).toString(),
        categoryId: data.categoryId === "none" ? null : data.categoryId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Assinatura cadastrada!",
        description: "Assinatura adicionada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao cadastrar a assinatura.",
        variant: "destructive",
      });
    },
  });

  const toggleSubscriptionMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      apiRequest("PUT", `/api/subscriptions/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Assinatura atualizada",
        description: "Status da assinatura foi alterado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar a assinatura.",
        variant: "destructive",
      });
    },
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/subscriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Assinatura removida",
        description: "Assinatura removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover a assinatura.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubscriptionFormData) => {
    createSubscriptionMutation.mutate(data);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(amount));
  };

  const getServiceInfo = (serviceId: string) => {
    return subscriptionServices.find(s => s.id === serviceId) || subscriptionServices[0];
  };

  const getCategoryInfo = (categoryId: string | undefined) => {
    return categories.find(c => c.id === categoryId);
  };

  const getTotalMonthlyAmount = () => {
    return subscriptions
      .filter(sub => sub.isActive)
      .reduce((total, sub) => total + parseFloat(sub.amount), 0);
  };

  const getNextBillingDate = (billingDate: number) => {
    const now = new Date();
    const nextBilling = new Date(now.getFullYear(), now.getMonth(), billingDate);
    
    if (nextBilling < now) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    return nextBilling.toLocaleDateString('pt-BR');
  };

  const activeSubscriptions = subscriptions.filter(sub => sub.isActive);
  const inactiveSubscriptions = subscriptions.filter(sub => !sub.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assinaturas</h2>
          <p className="text-gray-600">Gerencie suas assinaturas mensais</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Assinatura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Assinatura</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Assinatura</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Spotify Premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {subscriptionServices.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              <div className="flex items-center gap-2">
                                <span style={{ color: service.color }}>{service.icon}</span>
                                {service.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Mensal</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="R$ 19,90" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia da Cobrança</FormLabel>
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

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem categoria</SelectItem>
                          {categories.filter(c => c.type === 'expense').map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <span>{category.icon}</span>
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createSubscriptionMutation.isPending}>
                    {createSubscriptionMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo das assinaturas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Mensal</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalMonthlyAmount().toString())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {activeSubscriptions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Anual</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency((getTotalMonthlyAmount() * 12).toString())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma assinatura cadastrada ainda</p>
            <p className="text-sm text-gray-400">Cadastre suas assinaturas mensais para controlar os gastos</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Assinaturas ativas */}
          {activeSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Assinaturas Ativas</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeSubscriptions.map((subscription) => {
                  const serviceInfo = getServiceInfo(subscription.service);
                  const categoryInfo = getCategoryInfo(subscription.categoryId);

                  return (
                    <Card key={subscription.id} className="relative overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 w-full h-1"
                        style={{ backgroundColor: serviceInfo.color }}
                      />
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ color: serviceInfo.color }}>{serviceInfo.icon}</span>
                            <CardTitle className="text-lg">{subscription.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={subscription.isActive}
                              onCheckedChange={(checked) =>
                                toggleSubscriptionMutation.mutate({
                                  id: subscription.id,
                                  isActive: checked,
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSubscriptionMutation.mutate(subscription.id)}
                              disabled={deleteSubscriptionMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{serviceInfo.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Valor mensal</span>
                            <span className="text-lg font-semibold">
                              {formatCurrency(subscription.amount)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Próxima cobrança</span>
                            <span className="text-sm font-medium">
                              {getNextBillingDate(subscription.billingDate)}
                            </span>
                          </div>

                          {categoryInfo && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Categoria</span>
                              <Badge variant="outline">
                                {categoryInfo.icon} {categoryInfo.name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assinaturas inativas */}
          {inactiveSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-600">Assinaturas Inativas</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveSubscriptions.map((subscription) => {
                  const serviceInfo = getServiceInfo(subscription.service);

                  return (
                    <Card key={subscription.id} className="opacity-60">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{serviceInfo.icon}</span>
                            <CardTitle className="text-lg">{subscription.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={subscription.isActive}
                              onCheckedChange={(checked) =>
                                toggleSubscriptionMutation.mutate({
                                  id: subscription.id,
                                  isActive: checked,
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSubscriptionMutation.mutate(subscription.id)}
                              disabled={deleteSubscriptionMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{serviceInfo.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(subscription.amount)}/mês
                        </p>
                        <Badge variant="secondary" className="mt-2">Inativa</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}