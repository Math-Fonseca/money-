import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon, CreditCard, TrendingUpIcon, PiggyBankIcon, BarChart3Icon, StarIcon } from "lucide-react";

interface WelcomeTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeTutorial({ isOpen, onClose }: WelcomeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Bem-vindo ao Money+!",
      icon: "🎉",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Estamos felizes em ter você aqui! Este sistema foi desenvolvido para ajudar no seu controle financeiro pessoal de forma simples, prática e organizada.
          </p>
        </div>
      )
    },
    {
      title: "Primeiros passos",
      icon: "📝",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h4 className="font-semibold text-gray-900">Configurações iniciais</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Acesse a aba <strong>Configurações</strong> para inserir o valor do seu salário.</li>
                  <li>• Caso você receba <strong>Vale-Transporte (VT)</strong> e/ou <strong>Vale-Refeição (VR)</strong> em dinheiro, informe os valores diários nos campos indicados. O sistema calculará automaticamente o total mensal com base nos dias úteis.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Cadastro de Receitas e Despesas",
      icon: "💰",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h4 className="font-semibold text-gray-900">Cadastro de Receitas</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Vá até a aba <strong>Receitas</strong> para registrar seus ganhos.</li>
                  <li>• Além do salário, você pode adicionar outras entradas, como bônus, vendas, renda extra, entre outras.</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h4 className="font-semibold text-gray-900">Cadastro de Despesas</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Na aba <strong>Despesas</strong>, registre seus gastos fixos e variáveis.</li>
                  <li>• Lembre-se: quanto mais detalhado for o cadastro, melhor será o acompanhamento das suas finanças.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Cartões de Crédito",
      icon: "💳",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <h4 className="font-semibold text-gray-900">Cartões de Crédito</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Cadastre seus <strong>cartões de crédito</strong> para controlar gastos, limite disponível e acompanhar faturas mensais.</li>
                  <li>• É possível lançar compras parceladas, e o sistema distribuirá as parcelas nos meses corretos automaticamente.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Assinaturas e Acompanhamento",
      icon: "📊",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
              <div>
                <h4 className="font-semibold text-gray-900">Assinaturas</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Utilize a aba <strong>Assinaturas</strong> para cadastrar serviços recorrentes como Spotify, Netflix, Amazon Prime, academia, celular e outros.</li>
                  <li>• Dessa forma, você terá sempre a previsão desses gastos nos próximos meses.</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">📈</div>
              <div>
                <h4 className="font-semibold text-gray-900">Acompanhamento financeiro</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Os gráficos e relatórios mostram seus <strong>ganhos, gastos, saldo atual e projeções futuras</strong>.</li>
                  <li>• Cada gasto pode ser categorizado com <strong>cores e ícones</strong>, facilitando a visualização por categoria.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Dica importante",
      icon: "✅",
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">Dica importante</h4>
                <p className="mt-2 text-sm text-green-800 leading-relaxed">
                  Mantenha sempre o sistema atualizado, cadastrando <strong>todos os seus gastos e ganhos</strong>. 
                  Assim, você terá um controle real da sua vida financeira e poderá planejar melhor seus próximos passos.
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600">
              Agora você está pronto para começar! 🚀
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{currentStepData.icon}</span>
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>
            Tutorial de introdução ao Money+
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index <= currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {currentStep + 1} de {steps.length}
            </span>
          </div>

          {/* Content */}
          <Card>
            <CardContent className="pt-6">
              {currentStepData.content}
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              ← Anterior
            </Button>
            
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-green-600"
            >
              {currentStep === steps.length - 1 ? 'Começar!' : 'Próximo →'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}